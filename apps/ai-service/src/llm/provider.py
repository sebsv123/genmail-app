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

    def __init__(
        self,
        api_key: str | None = None,
        model: str = "gpt-4o-mini",
        base_url: str | None = None,
        provider_name: str = "openai",
    ) -> None:
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key not provided")
        client_kwargs: dict[str, Any] = {"api_key": self.api_key}
        if base_url:
            client_kwargs["base_url"] = base_url
        self.client = AsyncOpenAI(**client_kwargs)
        self.model = model
        self.provider_name = provider_name
        self.logger = logger.bind(provider=provider_name, model=model)

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


class FallbackLLMProvider(LLMProvider):
    """Tries providers in order; falls through to next on failure."""

    def __init__(self, providers: list[LLMProvider]) -> None:
        if not providers:
            raise ValueError("FallbackLLMProvider requires at least one provider")
        self.providers = providers
        self.logger = logger.bind(provider="fallback", count=len(providers))

    async def generate_completion(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000,
        response_format: dict[str, str] | None = None,
    ) -> str:
        last_error: Exception | None = None
        for idx, p in enumerate(self.providers):
            try:
                return await p.generate_completion(messages, temperature, max_tokens, response_format)
            except Exception as e:
                last_error = e
                self.logger.warning("provider_failed", index=idx, error=str(e))
        raise RuntimeError(f"All LLM providers failed. Last error: {last_error}")

    async def generate_json(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ) -> dict[str, Any]:
        last_error: Exception | None = None
        for idx, p in enumerate(self.providers):
            try:
                return await p.generate_json(messages, temperature, max_tokens)
            except Exception as e:
                last_error = e
                self.logger.warning("provider_failed", index=idx, error=str(e))
        raise RuntimeError(f"All LLM providers failed. Last error: {last_error}")


def _build_openai_compatible(
    api_key_env: str,
    model_env: str,
    base_url_env: str | None,
    default_model: str,
    default_base_url: str | None,
    provider_name: str,
) -> LLMProvider | None:
    """Build an OpenAI-compatible provider if API key is set."""
    api_key = os.getenv(api_key_env)
    if not api_key:
        return None
    model = os.getenv(model_env, default_model)
    base_url = os.getenv(base_url_env, default_base_url) if base_url_env else default_base_url
    return OpenAILLMProvider(
        api_key=api_key, model=model, base_url=base_url, provider_name=provider_name
    )


def get_llm_provider(provider_type: str = "auto") -> LLMProvider:
    """Factory: builds primary + fallback chain (OpenAI -> Groq -> xAI)."""
    if provider_type == "mock":
        return MockLLMProvider()

    if provider_type == "auto":
        env_provider = os.getenv("LLM_PROVIDER", "openai").lower()
        if env_provider == "mock":
            return MockLLMProvider()

    providers: list[LLMProvider] = []

    # Primary: OpenAI (uses OPENAI_API_KEY, OPENAI_MODEL, optional OPENAI_BASE_URL)
    openai_p = _build_openai_compatible(
        api_key_env="OPENAI_API_KEY",
        model_env="OPENAI_MODEL",
        base_url_env="OPENAI_BASE_URL",
        default_model="gpt-4.1-nano",
        default_base_url=None,
        provider_name="openai",
    )
    if openai_p:
        providers.append(openai_p)

    # Fallback 1: Groq (OpenAI-compatible)
    groq_p = _build_openai_compatible(
        api_key_env="GROQ_API_KEY",
        model_env="GROQ_MODEL",
        base_url_env=None,
        default_model="llama-3.3-70b-versatile",
        default_base_url="https://api.groq.com/openai/v1",
        provider_name="groq",
    )
    if groq_p:
        providers.append(groq_p)

    # Fallback 2: xAI Grok (OpenAI-compatible)
    xai_p = _build_openai_compatible(
        api_key_env="XAI_API_KEY",
        model_env="XAI_MODEL",
        base_url_env=None,
        default_model="grok-2-latest",
        default_base_url="https://api.x.ai/v1",
        provider_name="xai",
    )
    if xai_p:
        providers.append(xai_p)

    if not providers:
        logger.warning("no_llm_keys_set", message="Falling back to mock provider")
        return MockLLMProvider()

    if len(providers) == 1:
        return providers[0]

    logger.info("llm_chain_built", chain=[getattr(p, "provider_name", "unknown") for p in providers])
    return FallbackLLMProvider(providers)
