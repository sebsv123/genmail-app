"""
Redis Collector.

Checks Redis connection and monitors queue backlog sizes.
"""

from __future__ import annotations

import logging
from typing import Any

import redis.asyncio as aioredis

from config import config
from models import CollectorResult

logger = logging.getLogger(__name__)

# Known queue keys to monitor
QUEUE_KEYS = [
    "bull:email:wait",
    "bull:email:active",
    "bull:email:delayed",
    "bull:email:failed",
    "bull:lead-hunt:wait",
    "bull:lead-hunt:active",
    "bull:lead-hunt:delayed",
    "bull:lead-hunt:failed",
    "bull:signal:wait",
    "bull:signal:active",
    "bull:signal:delayed",
    "bull:signal:failed",
]


class RedisCollector:
    """Collects Redis connection status and queue backlog metrics."""

    def __init__(self) -> None:
        self.host = config.redis_host
        self.port = config.redis_port
        self.db = config.redis_db
        self.backlog_max = config.redis_backlog_max
        self.stall_minutes = config.redis_stall_minutes

    async def collect(self) -> list[CollectorResult]:
        """Check Redis connectivity and queue backlogs."""
        results: list[CollectorResult] = []

        # Connection check
        conn_result = await self._check_connection()
        results.append(conn_result)

        # If connection succeeded, check queue backlogs
        if conn_result.success:
            backlog_result = await self._check_backlogs()
            results.append(backlog_result)

        return results

    async def _check_connection(self) -> CollectorResult:
        """Test basic Redis connectivity with PING."""
        try:
            r = aioredis.Redis(
                host=self.host, port=self.port, db=self.db, socket_timeout=5
            )
            pong = await r.ping()
            await r.aclose()
            return CollectorResult(
                collector_name="redis_connection",
                success=True,
                data={"ping": str(pong)},
            )
        except Exception as exc:
            logger.error("Redis connection failed: %s", exc)
            return CollectorResult(
                collector_name="redis_connection",
                success=False,
                error=str(exc),
            )

    async def _check_backlogs(self) -> CollectorResult:
        """Check queue sizes and detect stalls."""
        try:
            r = aioredis.Redis(
                host=self.host, port=self.port, db=self.db, socket_timeout=5
            )
            queues: dict[str, Any] = {}
            stalled: list[str] = []

            for key in QUEUE_KEYS:
                try:
                    size = await r.llen(key) if "wait" in key else await r.zcard(key)
                    queues[key] = size

                    # Check if wait queue exceeds backlog max
                    if "wait" in key and size > self.backlog_max:
                        stalled.append(key)
                except Exception:
                    queues[key] = -1  # Unable to read

            await r.aclose()

            return CollectorResult(
                collector_name="redis_backlogs",
                success=len(stalled) == 0,
                data={
                    "queues": queues,
                    "stalled_queues": stalled,
                    "backlog_max": self.backlog_max,
                },
                error=(
                    f"Queues over backlog limit: {stalled}"
                    if stalled
                    else None
                ),
            )
        except Exception as exc:
            logger.error("Redis backlog check failed: %s", exc)
            return CollectorResult(
                collector_name="redis_backlogs",
                success=False,
                error=str(exc),
            )
