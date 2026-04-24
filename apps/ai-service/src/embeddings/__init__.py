"""Embeddings package for RAG system."""

from .provider import EmbeddingProvider, get_embedding_provider
from .chunker import chunk_text

__all__ = [
    "EmbeddingProvider",
    "get_embedding_provider",
    "chunk_text",
]
