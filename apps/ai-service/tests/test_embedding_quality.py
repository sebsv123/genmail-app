"""Tests for embedding quality specifically for email marketing (FASE 17E).

Tests semantic understanding of marketing-specific text pairs.

Run: pytest tests/test_embedding_quality.py -v
"""

import numpy as np
import pytest
import os

# Skip all tests if not in local mode
pytestmark = pytest.mark.skipif(
    os.getenv("EMBEDDING_MODE", "openai") != "local",
    reason="Quality tests require local BGE-M3 model"
)


@pytest.fixture(scope="module")
def provider():
    """Load the embedding provider once for all tests."""
    from embeddings.provider import EmbeddingProvider
    return EmbeddingProvider()


def cosine_similarity(a, b):
    a = np.array(a)
    b = np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


class TestEmailMarketingQuality:
    """Test embeddings understand email marketing semantics."""

    def test_insurance_offer_similarity(self, provider):
        """Similar insurance offers should have high similarity > 0.82."""
        text1 = "Oferta especial para clientes de seguros"
        text2 = "Descuento exclusivo para asegurados"
        
        emb1 = provider.get_embedding(text1)
        emb2 = provider.get_embedding(text2)
        
        sim = cosine_similarity(emb1, emb2)
        assert sim > 0.82, f"Insurance offer similarity: {sim:.3f}, expected > 0.82"

    def test_family_protection_similarity(self, provider):
        """Family protection concepts should have similarity > 0.78."""
        text1 = "Protección familiar completa"
        text2 = "Seguro médico para toda la familia"
        
        emb1 = provider.get_embedding(text1)
        emb2 = provider.get_embedding(text2)
        
        sim = cosine_similarity(emb1, emb2)
        assert sim > 0.78, f"Family protection similarity: {sim:.3f}, expected > 0.78"

    def test_unrelated_low_similarity(self, provider):
        """Unrelated topics should have very low similarity < 0.30."""
        text1 = "Oferta de seguros"
        text2 = "Receta de cocina italiana"
        
        emb1 = provider.get_embedding(text1)
        emb2 = provider.get_embedding(text2)
        
        sim = cosine_similarity(emb1, emb2)
        assert sim < 0.30, f"Unrelated similarity: {sim:.3f}, expected < 0.30"

    def test_cold_email_variants_similarity(self, provider):
        """Different cold email approaches for same goal should be similar."""
        text1 = "Me gustaría presentarte nuestra solución de software para automatizar ventas"
        text2 = "¿Te interesa una herramienta que acelere tu proceso de ventas?"
        
        emb1 = provider.get_embedding(text1)
        emb2 = provider.get_embedding(text2)
        
        sim = cosine_similarity(emb1, emb2)
        assert sim > 0.75, f"Cold email variants similarity: {sim:.3f}, expected > 0.75"

    def test_subject_line_vs_body_different(self, provider):
        """Subject line and body text about same topic should still be related."""
        subject = "¿Problemas con leads que no responden?"
        body = "Muchos equipos de ventas pierden oportunidades porque no siguen a los leads en el momento adecuado."
        
        emb_subject = provider.get_embedding(subject)
        emb_body = provider.get_embedding(body)
        
        sim = cosine_similarity(emb_subject, emb_body)
        # Same topic but different format, should be somewhat related but not identical
        assert sim > 0.50, f"Subject/body similarity: {sim:.3f}, expected > 0.50"
        assert sim < 0.95, f"Subject/body too similar: {sim:.3f}, expected < 0.95"

    def test_spam_vs_legitimate_email(self, provider):
        """Spam and legitimate emails should be distinguishable."""
        spam = "¡¡¡GANADOR!!! Has ganado 1 millón de euros!!! CLICK AQUI AHORA!!!"
        legitimate = "Quería seguir nuestra conversación sobre la implementación del CRM en tu empresa"
        
        emb_spam = provider.get_embedding(spam)
        emb_legit = provider.get_embedding(legitimate)
        
        sim = cosine_similarity(emb_spam, emb_legit)
        # Very different content and style
        assert sim < 0.40, f"Spam/legitimate similarity: {sim:.3f}, expected < 0.40"

    def test_benefit_focused_vs_feature_focused(self, provider):
        """Benefit-focused and feature-focused emails about same product."""
        benefit = "Ahorra 10 horas semanales con nuestra automatización"
        feature = "Nuestra plataforma incluye triggers, workflows y integraciones API"
        
        emb_benefit = provider.get_embedding(benefit)
        emb_feature = provider.get_embedding(feature)
        
        sim = cosine_similarity(emb_benefit, emb_feature)
        # Same product but different angles - should be somewhat related
        assert sim > 0.50, f"Benefit/feature similarity: {sim:.3f}, expected > 0.50"
        assert sim < 0.90, f"Benefit/feature too similar: {sim:.3f}, expected < 0.90"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
