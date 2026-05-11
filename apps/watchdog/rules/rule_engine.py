"""
Rule Engine.

Evaluates CollectorResult metrics against configured thresholds and
generates IncidentEvent objects when anomalies are detected.
"""

from __future__ import annotations

import logging
from typing import Any

from config import config
from models import (
    CollectorResult,
    IncidentEvent,
    IncidentType,
    Severity,
)

logger = logging.getLogger(__name__)


class RuleEngine:
    """Evaluates collector results and generates incidents."""

    def __init__(self) -> None:
        self.health_fail_consecutive = config.health_fail_consecutive
        self.redis_backlog_max = config.redis_backlog_max
        self.redis_stall_minutes = config.redis_stall_minutes
        self.error_rate_5xx_threshold = config.error_rate_5xx_threshold
        self.json_invalid_consecutive = config.json_invalid_consecutive

        # Track consecutive failures for health checks
        self._ai_health_failures: int = 0
        self._worker_health_failures: int = 0

    def evaluate(
        self, results: list[CollectorResult]
    ) -> list[IncidentEvent]:
        """Run all rules against collector results and return incidents."""
        incidents: list[IncidentEvent] = []

        for result in results:
            if not result.success:
                rule_result = self._handle_failure(result)
                if rule_result:
                    incidents.append(rule_result)
            else:
                # Even on success, check data for anomalies
                rule_result = self._check_data_anomalies(result)
                if rule_result:
                    incidents.append(rule_result)

        return incidents

    def _handle_failure(
        self, result: CollectorResult
    ) -> IncidentEvent | None:
        """Generate an incident for a failed collector result."""
        name = result.collector_name

        # --- Health check failures ---
        if name == "ai_service_health":
            self._ai_health_failures += 1
            if self._ai_health_failures >= self.health_fail_consecutive:
                return IncidentEvent(
                    incident_type=IncidentType.health_check_failure.value,
                    service="ai-service",
                    severity=Severity.critical,
                    error_data={
                        "collector": name,
                        "error": result.error,
                        "consecutive_failures": self._ai_health_failures,
                        "threshold": self.health_fail_consecutive,
                    },
                    recent_context=result.data,
                )
            return IncidentEvent(
                incident_type=IncidentType.health_check_failure.value,
                service="ai-service",
                severity=Severity.medium,
                error_data={
                    "collector": name,
                    "error": result.error,
                    "consecutive_failures": self._ai_health_failures,
                    "threshold": self.health_fail_consecutive,
                },
                recent_context=result.data,
            )

        if name == "worker_health":
            self._worker_health_failures += 1
            if self._worker_health_failures >= self.health_fail_consecutive:
                return IncidentEvent(
                    incident_type=IncidentType.health_check_failure.value,
                    service="worker",
                    severity=Severity.critical,
                    error_data={
                        "collector": name,
                        "error": result.error,
                        "consecutive_failures": self._worker_health_failures,
                        "threshold": self.health_fail_consecutive,
                    },
                    recent_context=result.data,
                )
            return IncidentEvent(
                incident_type=IncidentType.health_check_failure.value,
                service="worker",
                severity=Severity.medium,
                error_data={
                    "collector": name,
                    "error": result.error,
                    "consecutive_failures": self._worker_health_failures,
                    "threshold": self.health_fail_consecutive,
                },
                recent_context=result.data,
            )

        # --- Redis connection failure ---
        if name == "redis_connection":
            return IncidentEvent(
                incident_type=IncidentType.redis_connection_error.value,
                service="redis",
                severity=Severity.critical,
                error_data={
                    "collector": name,
                    "error": result.error,
                },
                recent_context=result.data,
            )

        # --- Redis backlog overflow ---
        if name == "redis_backlogs":
            stalled = result.data.get("stalled_queues", [])
            return IncidentEvent(
                incident_type=IncidentType.redis_backlog_overflow.value,
                service="redis",
                severity=Severity.high,
                error_data={
                    "collector": name,
                    "error": result.error,
                    "stalled_queues": stalled,
                },
                recent_context=result.data,
            )

        # --- DB connection failure ---
        if name == "db_connection":
            return IncidentEvent(
                incident_type=IncidentType.db_connection_error.value,
                service="database",
                severity=Severity.critical,
                error_data={
                    "collector": name,
                    "error": result.error,
                },
                recent_context=result.data,
            )

        # --- DB query timeout ---
        if name == "db_query":
            return IncidentEvent(
                incident_type=IncidentType.db_query_timeout.value,
                service="database",
                severity=Severity.high,
                error_data={
                    "collector": name,
                    "error": result.error,
                },
                recent_context=result.data,
            )

        # --- Metrics fetch failure ---
        if name == "metrics_fetch":
            return IncidentEvent(
                incident_type=IncidentType.unknown.value,
                service="ai-service",
                severity=Severity.medium,
                error_data={
                    "collector": name,
                    "error": result.error,
                },
                recent_context=result.data,
            )

        # --- Error rate 5xx exceeded ---
        if name == "error_rate_5xx":
            error_rate = result.data.get("error_rate", 0)
            severity = (
                Severity.critical
                if error_rate > 0.50
                else Severity.high
            )
            return IncidentEvent(
                incident_type=IncidentType.error_rate_5xx_exceeded.value,
                service="ai-service",
                severity=severity,
                error_data={
                    "collector": name,
                    "error": result.error,
                    "error_rate": error_rate,
                    "threshold": self.error_rate_5xx_threshold,
                },
                recent_context=result.data,
            )

        # --- JSON invalid rate high ---
        if name == "json_invalid_rate":
            consecutive = result.data.get("consecutive_invalid", 0)
            severity = (
                Severity.critical
                if consecutive >= self.json_invalid_consecutive * 2
                else Severity.high
            )
            return IncidentEvent(
                incident_type=IncidentType.json_invalid_rate_high.value,
                service="ai-service",
                severity=severity,
                error_data={
                    "collector": name,
                    "error": result.error,
                    "consecutive_invalid": consecutive,
                    "threshold": self.json_invalid_consecutive,
                },
                recent_context=result.data,
            )

        # --- Latency check ---
        if name == "latency_check":
            avg_latency = result.data.get("avg_latency_ms", 0)
            severity = (
                Severity.critical
                if avg_latency > 10000
                else Severity.high
            )
            return IncidentEvent(
                incident_type=IncidentType.high_latency_detected.value,
                service="ai-service",
                severity=severity,
                error_data={
                    "collector": name,
                    "error": result.error,
                    "avg_latency_ms": avg_latency,
                },
                recent_context=result.data,
            )

        # Fallback for unknown collectors
        return IncidentEvent(
            incident_type=IncidentType.unknown.value,
            service="unknown",
            severity=Severity.low,
            error_data={
                "collector": name,
                "error": result.error,
            },
            recent_context=result.data,
        )

    def _check_data_anomalies(
        self, result: CollectorResult
    ) -> IncidentEvent | None:
        """Check successful results for data anomalies."""
        name = result.collector_name

        # Reset consecutive failure counters on success
        if name == "ai_service_health":
            self._ai_health_failures = 0
        elif name == "worker_health":
            self._worker_health_failures = 0

        # Check for stalled queues even on successful backlog check
        if name == "redis_backlogs":
            stalled = result.data.get("stalled_queues", [])
            if stalled:
                return IncidentEvent(
                    incident_type=IncidentType.redis_backlog_overflow.value,
                    service="redis",
                    severity=Severity.high,
                    error_data={
                        "collector": name,
                        "stalled_queues": stalled,
                        "backlog_max": self.redis_backlog_max,
                    },
                    recent_context=result.data,
                )

        return None

    def reset_counters(self) -> None:
        """Reset all consecutive failure counters."""
        self._ai_health_failures = 0
        self._worker_health_failures = 0
