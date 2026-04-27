"""Embedding provider supporting both BGE-M3 (local) and OpenAI embeddings.

FASE 17: Migration to BGE-M3 open source to save ~300€/month.
- BGE-M3: Multilingual, Spanish native, 1024 dimensions, open source
- OpenAI text-embedding-3-small: 1536 dimensions, paid API
"""

import hashlib
import os
import json
from typing import List
from openai import OpenAI


class EmbeddingProvider:
    """Provider for generating text embeddings with dual mode support + Redis cache.
    
    Modes:
        - local: Uses BGE-M3 model (free, 1024 dims)
        - openai: Uses OpenAI API (paid, 1536 dims)
    """

    def __init__(self):
        self.mode = os.getenv("EMBEDDING_MODE", "local")
        self._local_model = None
        self._openai_client = None
        self._dimensions = 1024 if self.mode == "local" else 1536
        
        # Cache stats (FASE 17F)
        self._cache_hits = 0
        self._cache_misses = 0
        
        # Initialize Redis cache if available
        self._redis = None
        self._cache_ttl = 86400 * 7  # 7 days
        try:
            import redis
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
            self._redis = redis.from_url(redis_url, decode_responses=True)
            self._redis.ping()
            print(f"[EmbeddingProvider] Redis cache connected: {redis_url}")
        except Exception:
            print("[EmbeddingProvider] Redis not available, using memory-only cache")
            self._redis = None

        if self.mode == "local":
            try:
                from sentence_transformers import SentenceTransformer
                # BGE-M3: multilingual, Spanish native, 1024 dims
                self._local_model = SentenceTransformer("BAAI/bge-m3")
                # Try to use float16 for memory optimization (FASE 17D)
                # Only on CUDA: CPU does not implement LayerNorm in half precision
                try:
                    import torch
                    if torch.cuda.is_available():
                        self._local_model = self._local_model.half()
                except Exception:
                    pass  # Fallback to float32 if not supported
                print(f"[EmbeddingProvider] BGE-M3 loaded. Dimensions: {self._dimensions}")
            except ImportError:
                raise RuntimeError(
                    "sentence-transformers not installed. "
                    "Run: pip install sentence-transformers torch transformers"
                )
        else:
            openai_key = os.environ.get("OPENAI_API_KEY")
            if openai_key:
                self._openai_client = OpenAI(api_key=openai_key)
                print(f"[EmbeddingProvider] OpenAI mode. Dimensions: {self._dimensions}")
            else:
                raise RuntimeError("OPENAI_API_KEY required for openai mode")

    def _get_cache_key(self, text: str) -> str:
        """Generate cache key for a text using MD5 hash."""
        return f"emb:{hashlib.md5(text.encode('utf-8')).hexdigest()}"

    def _get_from_cache(self, cache_key: str) -> List[float] | None:
        """Try to get embedding from cache."""
        try:
            if self._redis:
                cached = self._redis.get(cache_key)
                if cached:
                    self._cache_hits += 1
                    return json.loads(cached)
            self._cache_misses += 1
            return None
        except Exception:
            self._cache_misses += 1
            return None

    def _set_in_cache(self, cache_key: str, embedding: List[float]) -> None:
        """Store embedding in cache."""
        try:
            if self._redis:
                self._redis.setex(cache_key, self._cache_ttl, json.dumps(embedding))
        except Exception:
            pass  # Cache failure should not break embedding generation

    @property
    def cache_stats(self) -> dict:
        """Return cache statistics."""
        total = self._cache_hits + self._cache_misses
        hit_rate = self._cache_hits / total if total > 0 else 0
        
        cached_keys = 0
        try:
            if self._redis:
                cached_keys = self._redis.dbsize()
        except Exception:
            pass
        
        return {
            "hits": self._cache_hits,
            "misses": self._cache_misses,
            "hit_rate": round(hit_rate, 4),
            "cached_keys": cached_keys,
        }

    def get_embedding(self, text: str) -> List[float]:
        """Get embedding for a single text with caching."""
        # Check cache first
        cache_key = self._get_cache_key(text)
        cached = self._get_from_cache(cache_key)
        if cached is not None:
            return cached
        
        # Generate embedding
        if self.mode == "local":
            embedding = self._local_model.encode(text, normalize_embeddings=True)
            result = embedding.tolist()
        else:
            response = self._openai_client.embeddings.create(
                model="text-embedding-3-small",
                input=text,
            )
            result = response.data[0].embedding
        
        # Store in cache
        self._set_in_cache(cache_key, result)
        return result

    def get_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Get embeddings for a batch of texts with caching."""
        if not texts:
            return []

        # Check cache for each text
        results = [None] * len(texts)
        missing_indices = []
        missing_texts = []
        
        for i, text in enumerate(texts):
            cache_key = self._get_cache_key(text)
            cached = self._get_from_cache(cache_key)
            if cached is not None:
                results[i] = cached
            else:
                missing_indices.append(i)
                missing_texts.append(text)

        if missing_texts:
            # Generate embeddings for missing texts
            if self.mode == "local":
                embeddings = self._local_model.encode(
                    missing_texts,
                    normalize_embeddings=True,
                    batch_size=32,
                    show_progress_bar=False
                )
                new_embeddings = embeddings.tolist()
            else:
                all_embeddings = []
                batch_size = 100
                for i in range(0, len(missing_texts), batch_size):
                    batch = missing_texts[i:i + batch_size]
                    response = self._openai_client.embeddings.create(
                        model="text-embedding-3-small",
                        input=batch,
                    )
                    all_embeddings.extend([item.embedding for item in response.data])
                new_embeddings = all_embeddings
            
            # Store in cache and fill results
            for idx, text, emb in zip(missing_indices, missing_texts, new_embeddings):
                results[idx] = emb
                cache_key = self._get_cache_key(text)
                self._set_in_cache(cache_key, emb)

        return results

    @property
    def vector_dimensions(self) -> int:
        """Return the dimension of embeddings."""
        return self._dimensions

    @property
    def is_local(self) -> bool:
        """Check if using local BGE-M3 model."""
        return self.mode == "local"


# Singleton instance - will be initialized in main.py lifespan
_embedding_provider = None


def get_embedding_provider() -> EmbeddingProvider:
    """Get or create the singleton embedding provider."""
    global _embedding_provider
    if _embedding_provider is None:
        _embedding_provider = EmbeddingProvider()
    return _embedding_provider


def set_embedding_provider(provider: EmbeddingProvider) -> None:
    """Set the singleton embedding provider (used in lifespan startup)."""
    global _embedding_provider
    _embedding_provider = provider
