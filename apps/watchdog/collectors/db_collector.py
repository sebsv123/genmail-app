"""
Database Collector.

Checks PostgreSQL connection and runs a simple query to verify responsiveness.
"""

from __future__ import annotations

import logging

import asyncpg

from config import config
from models import CollectorResult

logger = logging.getLogger(__name__)


class DatabaseCollector:
    """Collects database connectivity and responsiveness metrics."""

    def __init__(self) -> None:
        self.dsn = config.db_dsn
        self.timeout = config.db_timeout_seconds

    async def collect(self) -> list[CollectorResult]:
        """Check DB connectivity and run a simple query."""
        results: list[CollectorResult] = []

        conn_result = await self._check_connection()
        results.append(conn_result)

        if conn_result.success:
            query_result = await self._run_test_query()
            results.append(query_result)

        return results

    async def _check_connection(self) -> CollectorResult:
        """Test basic database connectivity."""
        try:
            conn = await asyncpg.connect(self.dsn, timeout=self.timeout)
            await conn.close()
            return CollectorResult(
                collector_name="db_connection",
                success=True,
                data={"dsn": self._mask_dsn(self.dsn)},
            )
        except Exception as exc:
            logger.error("Database connection failed: %s", exc)
            return CollectorResult(
                collector_name="db_connection",
                success=False,
                error=str(exc),
                data={"dsn": self._mask_dsn(self.dsn)},
            )

    async def _run_test_query(self) -> CollectorResult:
        """Run a simple SELECT 1 to verify the DB is responsive."""
        try:
            conn = await asyncpg.connect(self.dsn, timeout=self.timeout)
            row = await conn.fetchval("SELECT 1 AS ok")
            await conn.close()

            if row == 1:
                return CollectorResult(
                    collector_name="db_query",
                    success=True,
                    data={"query": "SELECT 1", "result": row},
                )
            else:
                return CollectorResult(
                    collector_name="db_query",
                    success=False,
                    error=f"Unexpected query result: {row}",
                    data={"query": "SELECT 1", "result": row},
                )
        except Exception as exc:
            logger.error("Database query failed: %s", exc)
            return CollectorResult(
                collector_name="db_query",
                success=False,
                error=str(exc),
                data={"query": "SELECT 1"},
            )

    @staticmethod
    def _mask_dsn(dsn: str) -> str:
        """Mask password in DSN for logging."""
        if "@" in dsn:
            parts = dsn.split("@")
            user_part = parts[0]
            if ":" in user_part:
                user = user_part.split(":")[0]
                return f"{user}:****@{parts[1]}"
        return dsn
