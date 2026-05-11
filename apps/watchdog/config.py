"""
Watchdog Configuration.

All thresholds are loaded from environment variables with safe defaults.
"""

import os
from dataclasses import dataclass, field


@dataclass
class WatchdogConfig:
    # Service URLs
    ai_service_url: str = field(
        default_factory=lambda: os.getenv("AI_SERVICE_URL", "http://ai-service:8000")
    )
    worker_url: str = field(
        default_factory=lambda: os.getenv("WORKER_URL", "http://worker:3001")
    )

    # Health check thresholds
    health_timeout_seconds: int = field(
        default_factory=lambda: int(os.getenv("HEALTH_TIMEOUT_SECONDS", "5"))
    )
    health_fail_consecutive: int = field(
        default_factory=lambda: int(os.getenv("HEALTH_FAIL_CONSECUTIVE", "3"))
    )

    # Redis thresholds
    redis_backlog_max: int = field(
        default_factory=lambda: int(os.getenv("REDIS_BACKLOG_MAX", "50"))
    )
    redis_stall_minutes: int = field(
        default_factory=lambda: int(os.getenv("REDIS_STALL_MINUTES", "5"))
    )

    # Database thresholds
    db_timeout_seconds: int = field(
        default_factory=lambda: int(os.getenv("DB_TIMEOUT_SECONDS", "5"))
    )

    # Metrics thresholds
    error_rate_5xx_threshold: float = field(
        default_factory=lambda: float(os.getenv("ERROR_RATE_5XX_THRESHOLD", "0.10"))
    )
    json_invalid_consecutive: int = field(
        default_factory=lambda: int(os.getenv("JSON_INVALID_CONSECUTIVE", "3"))
    )

    # Scheduler
    watchdog_interval_seconds: int = field(
        default_factory=lambda: int(os.getenv("WATCHDOG_INTERVAL_SECONDS", "60"))
    )

    # Redis connection (for the collector)
    redis_host: str = field(
        default_factory=lambda: os.getenv("REDIS_HOST", "redis")
    )
    redis_port: int = field(
        default_factory=lambda: int(os.getenv("REDIS_PORT", "6379"))
    )
    redis_db: int = field(
        default_factory=lambda: int(os.getenv("REDIS_DB", "0"))
    )

    # Database connection (for the collector)
    db_dsn: str = field(
        default_factory=lambda: os.getenv(
            "DATABASE_URL",
            "postgresql://postgres:postgres@db:5432/genmail",
        )
    )


# Singleton config instance
config = WatchdogConfig()
