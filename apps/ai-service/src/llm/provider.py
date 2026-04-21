"""Abstraction layer for LLM providers."""

from abc import ABC, abstractmethod
from typing import Any
import os
import structlog
from openai import AsyncOpenAI

logger = structlog.get_logger()


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""

    @abstractmethod
    async def generate_completion(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000,
        response_format: dict[str, str] | None = None,
    ) -> str:
        """Generate a completion from the LLM."""
        pass

    @abstractmethod
    async def generate_json(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ) -> dict[str, Any]:
        """Generate a JSON response from the LLM."""
        pass


class OpenAILLMProvider(LLMProvider):
    """OpenAI LLM provider implementation."""

    def __init__(self, api_key: str | None = None, model: str = "gpt-4o-mini") -> None:
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key not provided")
        self.client = AsyncOpenAI(api_key=self.api_key)
        self.model = model
        self.logger = logger.bind(provider="openai", model=model)

    async def generate_completion(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000,
        response_format: dict[str, str] | None = None,
    ) -> str:
        """Generate a completion using OpenAI."""
        self.logger.debug(
            "generating_completion",
            message_count=len(messages),
            temperature=temperature,
            max_tokens=max_tokens,
        )

        kwargs: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if response_format:
            kwargs["response_format"] = response_format

        response = await self.client.chat.completions.create(**kwargs)
        content = response.choices[0].message.content or ""

        self.logger.debug(
            "completion_generated",
            prompt_tokens=response.usage.prompt_tokens if response.usage else 0,
            completion_tokens=response.usage.completion_tokens if response.usage else 0,
        )

        return content

    async def generate_json(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ) -> dict[str, Any]:
        """Generate a JSON response using OpenAI."""
        import json

        response = await self.generate_completion(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
        )

        try:
            return json.loads(response)
        except json.JSONDecodeError as e:
            self.logger.error("json_parse_error", error=str(e), response=response[:200])
            raise ValueError(f"Failed to parse JSON response: {e}")


class MockLLMProvider(LLMProvider):
    """Mock LLM provider for testing."""

    def __init__(self, responses: dict[str, str] | None = None) -> None:
        self.responses = responses or {}
        self.logger = logger.bind(provider="mock")
        self.call_history: list[dict[str, Any]] = []

    async def generate_completion(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000,
        response_format: dict[str, str] | None = None,
    ) -> str:
        """Return a mock completion."""
        self.call_history.append({
            "method": "generate_completion",
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        })

        prompt_key = messages[-1].get("content", "")[:50] if messages else ""

        # Check for specific mock responses
        for key, response in self.responses.items():
            if key in prompt_key:
                return response

        # Default mock responses based on context
        system_message = messages[0].get("content", "") if messages else ""

        if "generate" in system_message.lower() or "email" in prompt_key.lower():
            return self._default_generate_email_response()
        elif "evaluate" in system_message.lower() or "evaluate" in prompt_key.lower():
            return self._default_evaluate_response()
        elif "extract" in system_message.lower() or "voice" in prompt_key.lower():
            return self._default_extract_voice_response()

        return '{"message": "Mock response"}'

    async def generate_json(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ) -> dict[str, Any]:
        """Return a mock JSON response."""
        import json

        response = await self.generate_completion(messages, temperature, max_tokens)
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return {"raw_response": response}

    def _default_generate_email_response(self) -> str:
        return """{
  "subject": "Descubre cómo potenciar tu negocio con nuestra solución",
  "preview_text": "3 estrategias probadas que transformarán tus resultados",
  "body_html": "<html><body><h1>¡Hola!</h1><p>Descubre cómo potenciar tu negocio con estas 3 estrategias probadas...</p><a href='#'>Reserva tu demo</a></body></html>",
  "body_text": "¡Hola! Descubre cómo potenciar tu negocio con estas 3 estrategias probadas...",
  "copy_framework_used": "AIDA",
  "rationale": "Aplicamos el framework AIDA para captar atención inmediata y generar interés progresivo",
  "used_sources": ["Blog de Marketing", "Guía de Email Marketing 2024"],
  "quality_score": 0.87
}"""

    def _default_evaluate_response(self) -> str:
        return """{
  "score": 0.85,
  "issues": ["El CTA podría ser más específico"],
  "suggestions": ["Añadir prueba social en la introducción", "Mencionar un caso de uso específico"],
  "approved": true
}"""

    def _default_extract_voice_response(self) -> str:
        return """{
  "tone": "Profesional pero cercano",
  "style": "Conversacional con datos concretos",
  "vocabulary_preferred": ["potenciar", "optimizar", "escalar", "resultados"],
  "vocabulary_avoided": ["solución integral", "sinergias", "paradigmas"],
  "avg_length": 145,
  "cta_patterns": ["Reserva tu demo", "Empieza gratis", "Ver en acción"]
}"""

    def add_mock_response(self, key: str, response: str) -> None:
        """Add a mock response for a specific prompt key."""
        self.responses[key] = response

    def get_call_history(self) -> list[dict[str, Any]]:
        """Get the history of calls made to this provider."""
        return self.call_history

    def clear_history(self) -> None:
        """Clear the call history."""
        self.call_history = []


def get_llm_provider(provider_type: str = "auto") -> LLMProvider:
    """Factory function to get the appropriate LLM provider."""
    if provider_type == "mock":
        return MockLLMProvider()

    if provider_type == "auto":
        # Check environment variable
        env_provider = os.getenv("LLM_PROVIDER", "openai").lower()
        if env_provider == "mock":
            return MockLLMProvider()

    # Default to OpenAI
    api_key = os.getenv("OPENAI_API_KEY")
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    if not api_key:
        logger.warning("openai_api_key_missing", message="Falling back to mock provider")
        return MockLLMProvider()

    return OpenAILLMProvider(api_key=api_key, model=model)
