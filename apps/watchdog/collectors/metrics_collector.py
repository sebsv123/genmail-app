"""
Metrics Collector.

Reads metrics from ai-service: error rates (5xx), latencies, and JSON
invalid response counts.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from config import config
from models import CollectorResult

logger = logging.getLogger(__name__)


class MetricsCollector:
    """Collects operational metrics from ai-service."""

    def __init__(self) -> None:
        self.ai_service_url = config.ai_service_url.rstrip("/")
        self.error_rate_threshold = config.error_rate_5xx_threshold
        self.json_invalid_consecutive = config.json_invalid_consecutive

    async def collect(self) -> list[CollectorResult]:
        """Fetch metrics from ai-service /metrics endpoint."""
        results: list[CollectorResult] = []

        metrics_result = await self._fetch_metrics()
        results.append(metrics_result)

        if metrics_result.success:
            # Evaluate error rate
            error_rate_result = self._evaluate_error_rate(metrics_result.data)
            results.append(error_rate_result)

            # Evaluate JSON invalid rate
            json_result = self._evaluate_json_invalid(metrics_result.data)
            results.append(json_result)

            # Evaluate latency
            latency_result = self._evaluate_latency(metrics_result.data)
            results.append(latency_result)

        return results

    async def _fetch_metrics(self) -> CollectorResult:
        """Fetch raw metrics from the ai-service /metrics endpoint."""
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    f"{self.ai_service_url}/metrics"
                )
                response.raise_for_status()
                data: dict[str, Any] = response.json()
                return CollectorResult(
                    collector_name="metrics_fetch",
                    success=True,
                    data=data,
                )
        except httpx.TimeoutException as exc:
            logger.warning("Metrics fetch timeout: %s", exc)
            return CollectorResult(
                collector_name="metrics_fetch",
                success=False,
                error=f"Timeout fetching metrics from ai-service",
            )
        except httpx.HTTPStatusError as exc:
            logger.warning("Metrics fetch HTTP error: %s", exc)
            return CollectorResult(
                collector_name="metrics_fetch",
                success=False,
                error=f"HTTP {exc.response.status_code} fetching metrics",
                data={"status_code": exc.response.status_code},
            )
        except httpx.RequestError as exc:
            logger.warning("Metrics fetch request error: %s", exc)
            return CollectorResult(
                collector_name="metrics_fetch",
                success=False,
                error=str(exc),
            )

    def _evaluate_error_rate(self, metrics: dict[str, Any]) -> CollectorResult:
        """Check if 5xx error rate exceeds threshold."""
        total_requests = metrics.get("total_requests", 0)
        errors_5xx = metrics.get("errors_5xx", 0)

        if total_requests == 0:
            return CollectorResult(
                collector_name="error_rate_5xx",
                success=True,
                data={
                    "total_requests": 0,
                    "errors_5xx": 0,
                    "error_rate": 0.0,
                    "threshold": self.error_rate_threshold,
                },
            )

        error_rate = errors_5xx / total_requests
        exceeded = error_rate > self.error_rate_threshold

        return CollectorResult(
            collector_name="error_rate_5xx",
            success=not exceeded,
            data={
                "total_requests": total_requests,
                "errors_5xx": errors_5xx,
                "error_rate": round(error_rate, 4),
                "threshold": self.error_rate_threshold,
            },
            error=(
                f"5xx error rate {error_rate:.2%} exceeds threshold "
                f"{self.error_rate_threshold:.0%}"
                if exceeded
                else None
            ),
        )

    def _evaluate_json_invalid(
        self, metrics: dict[str, Any]
    ) -> CollectorResult:
        """Check if consecutive JSON invalid responses exceed threshold."""
        consecutive_invalid = metrics.get("json_invalid_consecutive", 0)
        exceeded = consecutive_invalid >= self.json_invalid_consecutive

        return CollectorResult(
            collector_name="json_invalid_rate",
            success=not exceeded,
            data={
                "consecutive_invalid": consecutive_invalid,
                "threshold": self.json_invalid_consecutive,
            },
            error=(
                f"Consecutive JSON invalid responses ({consecutive_invalid}) "
                f"exceeds threshold ({self.json_invalid_consecutive})"
                if exceeded
                else None
            ),
        )

    def _evaluate_latency(self, metrics: dict[str, Any]) -> CollectorResult:
        """Check if average latency is abnormally high."""
        avg_latency_ms = metrics.get("avg_latency_ms", 0)
        # Threshold: 5 seconds (5000ms) as a reasonable default
        latency_threshold_ms = 5000
        exceeded = avg_latency_ms > latency_threshold_ms

        return CollectorResult(
            collector_name="latency_check",
            success=not exceeded,
            data={
                "avg_latency_ms": avg_latency_ms,
                "threshold_ms": latency_threshold_ms,
            },
            error=(
                f"Average latency {avg_latency_ms}ms exceeds "
                f"threshold {latency_threshold_ms}ms"
                if exceeded
                else None
            ),
        )
