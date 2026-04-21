"""Unit tests for AI Service endpoints using MockLLMProvider."""

import pytest
from fastapi.testclient import TestClient

# Need to set mock provider before importing main
import os
os.environ["LLM_PROVIDER"] = "mock"

from src.main import app, llm_provider
from src.llm import MockLLMProvider


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


@pytest.fixture
def mock_provider():
    """Get the mock provider and reset it."""
    provider = llm_provider
    assert isinstance(provider, MockLLMProvider)
    provider.clear_history()
    return provider


class TestHealthEndpoint:
    """Tests for /health endpoint."""

    def test_health_returns_ok(self, client):
        """Test that health endpoint returns status ok."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"


class TestGenerateEmailEndpoint:
    """Tests for /generate-email endpoint."""

    def test_generate_email_success(self, client, mock_provider):
        """Test successful email generation."""
        request_data = {
            "business_id": "test-biz-123",
            "brand_voice": "Profesional pero cercano. Ton directo.",
            "lead_profile": {
                "email": "lead@example.com",
                "name": "María García",
                "stage": "NEW",
                "context_data": {"source": "landing-page"},
                "intent_score": 65.5
            },
            "sequence_mode": "evergreen",
            "step_goal": "Generar interés inicial",
            "memory_summary": {
                "topics_used": [],
                "hooks_used": [],
                "ctas_used": []
            },
            "relevant_sources": [
                {"content": "Mejores prácticas de email marketing", "source_url": "https://example.com/blog"}
            ],
            "constraints": {
                "max_words": 150,
                "language": "es-ES",
                "prohibited_claims": ["Garantizado 100%"],
                "cta_type": "Reservar demo"
            }
        }

        response = client.post("/generate-email", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "subject" in data
        assert "preview_text" in data
        assert "body_html" in data
        assert "body_text" in data
        assert "copy_framework_used" in data
        assert "rationale" in data
        assert "used_sources" in data
        assert "quality_score" in data
        
        # Verify mock was called
        assert len(mock_provider.get_call_history()) == 1
        call = mock_provider.get_call_history()[0]
        assert call["method"] == "generate_json"

    def test_generate_email_selects_framework_based_on_goal(self, client, mock_provider):
        """Test that correct copy framework is selected based on goal."""
        from src.prompts import select_copy_framework
        
        # Test PAS selection
        framework = select_copy_framework("Agitar el problema de productividad", "evergreen")
        assert framework == "PAS"
        
        # Test BAB selection
        framework = select_copy_framework("Mostrar transformación before/after", "evergreen")
        assert framework == "BAB"
        
        # Test STR selection
        framework = select_copy_framework("Contar historia de caso de éxito", "nurturing_infinite")
        assert framework == "STR"
        
        # Test AIDA default
        framework = select_copy_framework("Educación general", "evergreen")
        assert framework == "AIDA"


class TestEvaluateEmailEndpoint:
    """Tests for /evaluate-email endpoint."""

    def test_evaluate_email_success(self, client, mock_provider):
        """Test successful email evaluation."""
        request_data = {
            "subject": "Descubre cómo potenciar tu negocio",
            "body_text": "Hola María, Descubre cómo potenciar tu negocio con estas 3 estrategias...",
            "memory_summary": {
                "topics_used": ["automatización"],
                "hooks_used": ["dato estadístico"],
                "ctas_used": ["Reserva demo"]
            },
            "brand_voice": "Profesional pero cercano",
            "prohibited_claims": ["100% garantizado", "Mejor del mercado"]
        }

        response = client.post("/evaluate-email", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "score" in data
        assert "issues" in data
        assert "suggestions" in data
        assert "approved" in data
        assert 0 <= data["score"] <= 1
        assert isinstance(data["approved"], bool)
        
        # Verify mock was called
        assert len(mock_provider.get_call_history()) == 1

    def test_evaluate_email_approved_threshold(self, client, mock_provider):
        """Test that evaluation returns proper approval status."""
        request_data = {
            "subject": "Test Subject",
            "body_text": "Test body content",
            "memory_summary": {"topics_used": [], "hooks_used": [], "ctas_used": []},
            "brand_voice": "Profesional",
            "prohibited_claims": []
        }

        response = client.post("/evaluate-email", json=request_data)
        data = response.json()
        
        # Mock returns approved=True by default
        assert data["approved"] is True


class TestExtractBrandVoiceEndpoint:
    """Tests for /extract-brand-voice endpoint."""

    def test_extract_brand_voice_success(self, client, mock_provider):
        """Test successful brand voice extraction."""
        request_data = {
            "sample_emails": [
                "Hola! Descubre cómo potenciar tu negocio con nuestra solución. Reserva tu demo hoy.",
                "Te escribo porque sé que buscas optimizar tus procesos. Empieza gratis."
            ],
            "business_description": "SaaS B2B para equipos de marketing, audiencia: marketing managers en startups"
        }

        response = client.post("/extract-brand-voice", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "tone" in data
        assert "style" in data
        assert "vocabulary_preferred" in data
        assert "vocabulary_avoided" in data
        assert "avg_length" in data
        assert "cta_patterns" in data
        
        # Verify types
        assert isinstance(data["vocabulary_preferred"], list)
        assert isinstance(data["vocabulary_avoided"], list)
        assert isinstance(data["cta_patterns"], list)
        assert isinstance(data["avg_length"], int)
        
        # Verify mock was called
        assert len(mock_provider.get_call_history()) == 1

    def test_extract_brand_voice_with_empty_samples(self, client, mock_provider):
        """Test extraction handles empty samples gracefully."""
        request_data = {
            "sample_emails": [],  # Empty list - but schema requires min_length=1
            "business_description": "Test business"
        }

        # Should fail validation
        response = client.post("/extract-brand-voice", json=request_data)
        assert response.status_code == 422  # Validation error


class TestRootEndpoint:
    """Tests for root endpoint."""

    def test_root_returns_api_info(self, client):
        """Test that root endpoint returns API information."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        
        assert data["service"] == "GenMail AI Service"
        assert "version" in data
        assert "endpoints" in data
        assert "docs" in data
        assert "/health" in data["endpoints"]["health"]


class TestLLMProvider:
    """Tests for LLM provider abstraction."""

    def test_mock_provider_returns_default_responses(self):
        """Test that mock provider returns appropriate default responses."""
        provider = MockLLMProvider()
        
        import asyncio
        
        # Test generate email response
        response = asyncio.run(provider.generate_json([
            {"role": "system", "content": "Generate email"},
            {"role": "user", "content": "Write an email"}
        ]))
        assert "subject" in response
        assert "body_html" in response
        
        # Test evaluate response
        response = asyncio.run(provider.generate_json([
            {"role": "system", "content": "Evaluate email"},
            {"role": "user", "content": "Rate this email"}
        ]))
        assert "score" in response
        assert "approved" in response
        
        # Test extract voice response
        response = asyncio.run(provider.generate_json([
            {"role": "system", "content": "Extract brand voice"},
            {"role": "user", "content": "Analyze these emails"}
        ]))
        assert "tone" in response
        assert "vocabulary_preferred" in response

    def test_mock_provider_call_history(self):
        """Test that mock provider tracks call history."""
        provider = MockLLMProvider()
        
        import asyncio
        
        asyncio.run(provider.generate_completion([
            {"role": "user", "content": "Test prompt"}
        ]))
        
        history = provider.get_call_history()
        assert len(history) == 1
        assert history[0]["method"] == "generate_completion"
        
        # Clear history
        provider.clear_history()
        assert len(provider.get_call_history()) == 0

    def test_mock_provider_custom_responses(self):
        """Test that mock provider can use custom responses."""
        provider = MockLLMProvider()
        provider.add_mock_response("custom", '{"custom": "response"}')
        
        import asyncio
        
        response = asyncio.run(provider.generate_json([
            {"role": "user", "content": "custom test"}
        ]))
        assert response["custom"] == "response"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
