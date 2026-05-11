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
    """OpenAI-compatible LLM provider (works for OpenAI, DeepSeek, Groq, xAI)."""

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
        """Generate a completion."""
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
        """Generate a JSON response."""
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
        self.call_history.append({
            "method": "generate_completion",
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        })
        prompt_key = messages[-1].get("content", "")[:50] if messages else ""
        for key, response in self.responses.items():
            if key in prompt_key:
                return response
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
        import json
        response = await self.generate_completion(messages, temperature, max_tokens)
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return {"raw_response": response}

    def _default_generate_email_response(self) -> str:
        return """{"subject": "Una pregunta rápida, {nombre}", "preview_text": "Sobre tu protección como autónomo", "body_html": "<p>Hola {nombre},</p><p>Te escribo porque muchos autónomos en Madrid no saben que pueden cubrir salud + accidentes desde 22,50€/mes.</p><p>¿Tienes 10 minutos esta semana?</p>", "body_text": 