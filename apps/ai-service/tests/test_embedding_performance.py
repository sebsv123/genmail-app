"""Tests for embedding performance (FASE 17E).

Benchmarks:
1. Speed: Time for embeddings of 1, 10, 100 texts
2. Quality: Cosine similarity between semantically similar texts > 0.85
3. Multilingual: Same concept in Spanish/English similarity > 0.80
4. Memory: RAM usage before and after model loading

Run: pytest tests/test_embedding_performance.py -v
"""

import time
import numpy as np
import pytest
import psutil
import os

# Skip all tests if not in local mode
pytestmark = pytest.mark.skipif(
    os.getenv("EMBEDDING_MODE", "openai") != "local",
    reason="Performance tests require local BGE-M3 model"
)


@pytest.fixture(scope="module")
def provider():
    """Load the embedding provider once for all tests."""
    from embeddings.provider import EmbeddingProvider
    provider = EmbeddingProvider()
    return provider


# ============== TEST 1: SPEED BENCHMARKS ==============

class TestSpeed:
    """Measure embedding generation speed."""

    def test_single_text_speed(self, provider):
        """Should embed 1 text in < 500ms after warmup."""
        text = "This is a test sentence for benchmarking."
        
        start = time.perf_counter()
        embedding = provider.get_embedding(text)
        elapsed = time.perf_counter() - start
        
        assert len(embedding) == provider.vector_dimensions
        assert elapsed < 0.5, f"Single text took {elapsed:.3f}s, expected < 0.5s"

    def test_10_texts_speed(self, provider):
        """Should embed 10 texts in < 1s."""
        texts = [f"Test sentence number {i} for batch processing." for i in range(10)]
        
        start = time.perf_counter()
        embeddings = provider.get_embeddings_batch(texts)
        elapsed = time.perf_counter() - start
        
        assert len(embeddings) == 10
        assert all(len(e) == provider.vector_dimensions for e in embeddings)
        assert elapsed < 1.0, f"10 texts took {elapsed:.3f}s, expected < 1.0s"

    def test_100_texts_speed(self, provider):
        """Should embed 100 texts in < 3s."""
        texts = [f"Test sentence number {i} for large batch processing benchmark." for i in range(100)]
        
        start = time.perf_counter()
        embeddings = provider.get_embeddings_batch(texts)
        elapsed = time.perf_counter() - start
        
        assert len(embeddings) == 100
        assert all(len(e) == provider.vector_dimensions for e in embeddings)
        assert elapsed < 3.0, f"100 texts took {elapsed:.3f}s, expected < 3.0s"


# ============== TEST 2: QUALITY BENCHMARKS ==============

class TestQuality:
    """Measure embedding semantic quality."""

    @staticmethod
    def cosine_similarity(a, b):
        a = np.array(a)
        b = np.array(b)
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

    def test_similar_texts_high_similarity(self, provider):
        """Semantically similar texts should have cosine similarity > 0.85."""
        text1 = "The quick brown fox jumps over the lazy dog"
        text2 = "A fast brown fox leaps over a sleepy dog"
        
        emb1 = provider.get_embedding(text1)
        emb2 = provider.get_embedding(text2)
        
        sim = self.cosine_similarity(emb1, emb2)
        assert sim > 0.85, f"Similar texts similarity: {sim:.3f}, expected > 0.85"

    def test_different_texts_low_similarity(self, provider):
        """Unrelated texts should have cosine similarity < 0.30."""
        text1 = "Machine learning algorithms for classification tasks"
        text2 = "Italian pasta recipes with homemade tomato sauce"
        
        emb1 = provider.get_embedding(text1)
        emb2 = provider.get_embedding(text2)
        
        sim = self.cosine_similarity(emb1, emb2)
        assert sim < 0.30, f"Different texts similarity: {sim:.3f}, expected < 0.30"

    def test_email_marketing_quality(self, provider):
        """Email marketing texts should have proper similarity thresholds."""
        # Similar concepts
        text1 = "Oferta especial para clientes de seguros"
        text2 = "Descuento exclusivo para asegurados"
        
        emb1 = provider.get_embedding(text1)
        emb2 = provider.get_embedding(text2)
        sim = self.cosine_similarity(emb1, emb2)
        assert sim > 0.82, f"Insurance email similarity: {sim:.3f}, expected > 0.82"

        # Different concepts
        text3 = "Protección familiar completa"
        text4 = "Seguro médico para toda la familia"
        
        emb3 = provider.get_embedding(text3)
        emb4 = provider.get_embedding(text4)
        sim2 = self.cosine_similarity(emb3, emb4)
        assert sim2 > 0.78, f"Family insurance similarity: {sim2:.3f}, expected > 0.78"

        # Completely unrelated
        text5 = "Oferta de seguros"
        text6 = "Receta de cocina italiana"
        
        emb5 = provider.get_embedding(text5)
        emb6 = provider.get_embedding(text6)
        sim3 = self.cosine_similarity(emb5, emb6)
        assert sim3 < 0.30, f"Unrelated texts similarity: {sim3:.3f}, expected < 0.30"


# ============== TEST 3: MULTILINGUAL BENCHMARKS ==============

class TestMultilingual:
    """BGE-M3 should handle Spanish natively."""

    @staticmethod
    def cosine_similarity(a, b):
        a = np.array(a)
        b = np.array(b)
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

    def test_spanish_english_same_concept(self, provider):
        """Same concept in Spanish and English should have similarity > 0.80."""
        text_es = "Protección familiar con seguro de vida"
        text_en = "Family protection with life insurance"
        
        emb_es = provider.get_embedding(text_es)
        emb_en = provider.get_embedding(text_en)
        
        sim = self.cosine_similarity(emb_es, emb_en)
        assert sim > 0.80, f"ES/EN similarity: {sim:.3f}, expected > 0.80"

    def test_spanish_spanish_high_similarity(self, provider):
        """Same language similar texts should have higher similarity."""
        text1 = "Mejorar la productividad con herramientas de software"
        text2 = "Aumentar la eficiencia usando aplicaciones informáticas"
        
        emb1 = provider.get_embedding(text1)
        emb2 = provider.get_embedding(text2)
        
        sim = self.cosine_similarity(emb1, emb2)
        assert sim > 0.85, f"ES/ES similarity: {sim:.3f}, expected > 0.85"


# ============== TEST 4: MEMORY BENCHMARKS ==============

class TestMemory:
    """Measure RAM usage impact."""

    def test_model_memory_footprint(self, provider):
        """BGE-M3 should use < 2GB RAM after loading."""
        process = psutil.Process()
        mem_mb = process.memory_info().rss / (1024 * 1024)
        
        # BGE-M3 with float16 should be ~600MB-1.2GB
        assert mem_mb < 2000, f"Memory usage: {mem_mb:.1f}MB, expected < 2000MB"
        print(f"\n[Memory] Model loaded, RAM usage: {mem_mb:.1f}MB")

    def test_embedding_does_not_leak_memory(self, provider):
        """Repeated embedding calls should not leak memory."""
        process = psutil.Process()
        
        # Get baseline after model is loaded
        baseline_mb = process.memory_info().rss / (1024 * 1024)
        
        # Run many embeddings
        for _ in range(50):
            provider.get_embedding("Test text for memory leak detection")
        
        final_mb = process.memory_info().rss / (1024 * 1024)
        
        # Should not grow more than 100MB
        growth_mb = final_mb - baseline_mb
        assert growth_mb < 100, f"Memory grew by {growth_mb:.1f}MB, expected < 100MB"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
