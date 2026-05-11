"""
Health Collector.

Pings HTTP /health endpoints of ai-service and worker services.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from config import config
from models import CollectorResult

logger = logging.getLogger(__name__)


class HealthCollector:
    """Collects health status from ai-service and worker."""

    def __init__(self) -> None:
        self.ai_service_url = config.ai_service_url.rstrip("/")
        self.worker_url = config.worker_url.rstrip("/")
        self.timeout = config.health_timeout_seconds

    async def collect(self) -> list[CollectorResult]:
        """Ping /health on both services and return results."""
        results: list[CollectorResult] = []

        # Check ai-service health
        ai_result = await self._check_service(
            "ai_service_health", f"{self.ai_service_url}/health"
        )
        results.append(ai_result)

        # Check worker health
        worker_result = await self._check_service(
            "worker_health", f"{self.worker_url}/health"
        )
        results.append(worker_result)

        return results

    async def _check_service(
        self, collector_name: str, url: str
    ) -> CollectorResult:
        """Ping a single service health endpoint."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url)
                response.raise_for_status()
                data: dict[str, Any] = response.json()
                return CollectorResult(
                    collector_name=collector_name,
                    success=True,
                    data={
                        "url": url,
                        "status_code": response.status_code,
                        "response": data,
                    },
                )
        except httpx.TimeoutException as exc:
            logger.warning("Health check timeout for %s: %s", url, exc)
            return CollectorResult(
                collector_name=collector_name,
                success=False,
                error=f"Timeout after {self.timeout}s",
                data={"url": url},
            )
        except httpx.HTTPStatusError as exc:
            logger.warning("Health check HTTP error for %s: %s", url, exc)
            return CollectorResult(
                collector_name=collector_name,
                success=False,
                error=f"HTTP {exc.response.status_code}",
                data={"url": url, "status_code": exc.response.status_code},
            )
        except httpx.RequestError as exc:
            logger.warning("Health check request error for %s: %s", url, exc)
            return CollectorResult(
                collector_name=collector_name,
                success=False,
                error=str(exc),
                data={"url": url},
            )
