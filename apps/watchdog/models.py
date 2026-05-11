"""
Pydantic models for the Watchdog service.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class Severity(str, Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"


class IncidentType(str, Enum):
    health_check_failure = "health_check_failure"
    redis_connection_error = "redis_connection_error"
    redis_backlog_overflow = "redis_backlog_overflow"
    redis_stall_detected = "redis_stall_detected"
    db_connection_error = "db_connection_error"
    db_query_timeout = "db_query_timeout"
    error_rate_5xx_exceeded = "error_rate_5xx_exceeded"
    json_invalid_rate_high = "json_invalid_rate_high"
    high_latency_detected = "high_latency_detected"
    unknown = "unknown"


class CollectorResult(BaseModel):
    """Result from a single collector run."""

    collector_name: str
    success: bool
    data: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class IncidentEvent(BaseModel):
    """An incident detected by the rule engine."""

    incident_type: str
    service: str
    severity: Severity
    error_data: dict[str, Any] = Field(default_factory=dict)
    recent_context: dict[str, Any] = Field(default_factory=dict)
    auto_escalate: bool = False
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    def __init__(self, **data: Any) -> None:
        super().__init__(**data)
        # Auto-escalate if severity is critical
        if self.severity == Severity.critical:
            self.auto_escalate = True


class WatchdogState(BaseModel):
    """Overall state of the watchdog after a collection cycle."""

    cycle_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    collector_results: list[CollectorResult] = Field(default_factory=list)
    incidents: list[IncidentEvent] = Field(default_factory=list)
    healthy: bool = True
