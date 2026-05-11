"""
Deliverability Collector.

Reads from PostgreSQL (email_logs table) to monitor:
- bounce_rate last 24h by sender
- complaint_rate last 24h
- reply_rate by sequence last 24h
- avg email_score last 50 generations

Thresholds from config.py.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

import asyncpg

from config import config
from models import CollectorResult

logger = logging.getLogger(__name__)


class DeliverabilityCollector:
    """Collects email deliverability metrics from PostgreSQL."""

    def __init__(self) -> None:
        self.dsn = config.db_dsn
        self.bounce_rate_max = float(
            config.__dataclass_fields__.get("bounce_rate_max", {}).get("default_factory", lambda: 0.05)()
            if hasattr(config, "bounce_rate_max")
            else 0.05
        )
        self.complaint_rate_max = float(
            config.__dataclass_fields__.get("complaint_rate_max", {}).get("default_factory", lambda: 0.001)()
            if hasattr(config, "complaint_rate_max")
            else 0.001
        )
        self.min_avg_email_score = float(
            config.__dataclass_fields__.get("min_avg_email_score", {}).get("default_factory", lambda: 50)()
            if hasattr(config, "min_avg_email_score")
            else 50
        )

    async def collect(self) -> list[CollectorResult]:
        """Collect all deliverability metrics."""
        results: list[CollectorResult] = []

        bounce_result = await self._check_bounce_rate()
        results.append(bounce_result)

        complaint_result = await self._check_complaint_rate()
        results.append(complaint_result)

        reply_result = await self._check_reply_rate()
        results.append(reply_result)

        score_result = await self._check_avg_email_score()
        results.append(score_result)

        return results

    async def _check_bounce_rate(self) -> CollectorResult:
        """Calculate bounce rate for last 24h."""
        try:
            conn = await asyncpg.connect(self.dsn, timeout=10)
            since = datetime.utcnow() - timedelta(hours=24)

            row = await conn.fetchrow(
                """
                SELECT
                    COUNT(*) AS total_sent,
                    COUNT(*) FILTER (WHERE bounce_type IS NOT NULL) AS total_bounced
                FROM email_logs
                WHERE sent_at >= $1
                """,
                since,
            )
            await conn.close()

            total_sent = row["total_sent"] or 0
            total_bounced = row["total_bounced"] or 0
            bounce_rate = total_bounced / total_sent if total_sent > 0 else 0.0

            exceeded = bounce_rate > self.bounce_rate_max

            return CollectorResult(
                collector_name="deliverability_bounce_rate",
                success=not exceeded,
                data={
                    "total_sent_24h": total_sent,
                    "total_bounced_24h": total_bounced,
                    "bounce_rate": round(bounce_rate, 4),
                    "threshold": self.bounce_rate_max,
                },
                error=(
                    f"Bounce rate {bounce_rate:.2%} exceeds threshold {self.bounce_rate_max:.1%}"
                    if exceeded
                    else None
                ),
            )
        except Exception as exc:
            logger.error("Bounce rate check failed: %s", exc)
            return CollectorResult(
                collector_name="deliverability_bounce_rate",
                success=False,
                error=str(exc),
            )

    async def _check_complaint_rate(self) -> CollectorResult:
        """Calculate complaint rate for last 24h."""
        try:
            conn = await asyncpg.connect(self.dsn, timeout=10)
            since = datetime.utcnow() - timedelta(hours=24)

            row = await conn.fetchrow(
                """
                SELECT
                    COUNT(*) AS total_sent,
                    COUNT(*) FILTER (WHERE complaint = true) AS total_complaints
                FROM email_logs
                WHERE sent_at >= $1
                """,
                since,
            )
            await conn.close()

            total_sent = row["total_sent"] or 0
            total_complaints = row["total_complaints"] or 0
            complaint_rate = total_complaints / total_sent if total_sent > 0 else 0.0

            exceeded = complaint_rate > self.complaint_rate_max

            return CollectorResult(
                collector_name="deliverability_complaint_rate",
                success=not exceeded,
                data={
                    "total_sent_24h": total_sent,
                    "total_complaints_24h": total_complaints,
                    "complaint_rate": round(complaint_rate, 4),
                    "threshold": self.complaint_rate_max,
                },
                error=(
                    f"Complaint rate {complaint_rate:.2%} exceeds threshold {self.complaint_rate_max:.1%}"
                    if exceeded
                    else None
                ),
            )
        except Exception as exc:
            logger.error("Complaint rate check failed: %s", exc)
            return CollectorResult(
                collector_name="deliverability_complaint_rate",
                success=False,
                error=str(exc),
            )

    async def _check_reply_rate(self) -> CollectorResult:
        """Calculate reply rate by sequence for last 24h."""
        try:
            conn = await asyncpg.connect(self.dsn, timeout=10)
            since = datetime.utcnow() - timedelta(hours=24)

            rows = await conn.fetch(
                """
                SELECT
                    es.sequence_name,
                    COUNT(*) AS total_sent,
                    COUNT(*) FILTER (WHERE el.replied_at IS NOT NULL) AS total_replies
                FROM email_logs el
                LEFT JOIN email_sequences es ON el.sequence_id = es.id
                WHERE el.sent_at >= $1
                GROUP BY es.sequence_name
                ORDER BY total_sent DESC
                """,
                since,
            )
            await conn.close()

            sequences: dict[str, dict] = {}
            for row in rows:
                name = row["sequence_name"] or "unknown"
                sent = row["total_sent"] or 0
                replies = row["total_replies"] or 0
                rate = replies / sent if sent > 0 else 0.0
                sequences[name] = {
                    "sent": sent,
                    "replies": replies,
                    "reply_rate": round(rate, 4),
                }

            return CollectorResult(
                collector_name="deliverability_reply_rate",
                success=True,
                data={
                    "sequences": sequences,
                    "total_sequences": len(sequences),
                },
            )
        except Exception as exc:
            logger.error("Reply rate check failed: %s", exc)
            return CollectorResult(
                collector_name="deliverability_reply_rate",
                success=False,
                error=str(exc),
            )

    async def _check_avg_email_score(self) -> CollectorResult:
        """Calculate average email score from last 50 generations."""
        try:
            conn = await asyncpg.connect(self.dsn, timeout=10)

            row = await conn.fetchrow(
                """
                SELECT
                    COUNT(*) AS total,
                    AVG(score) AS avg_score,
                    MIN(score) AS min_score,
                    MAX(score) AS max_score
                FROM (
                    SELECT score FROM email_logs
                    WHERE score IS NOT NULL
                    ORDER BY created_at DESC
                    LIMIT 50
                ) AS last_50
                """,
            )
            await conn.close()

            total = row["total"] or 0
            avg_score = float(row["avg_score"]) if row["avg_score"] else 0.0

            exceeded = total >= 10 and avg_score < self.min_avg_email_score

            return CollectorResult(
                collector_name="deliverability_avg_email_score",
                success=not exceeded,
                data={
                    "samples": total,
                    "avg_score": round(avg_score, 2),
                    "min_score": float(row["min_score"]) if row["min_score"] else None,
                    "max_score": float(row["max_score"]) if row["max_score"] else None,
                    "threshold": self.min_avg_email_score,
                },
                error=(
                    f"Average email score {avg_score:.1f} below threshold {self.min_avg_email_score}"
                    if exceeded
                    else None
                ),
            )
        except Exception as exc:
            logger.error("Avg email score check failed: %s", exc)
            return CollectorResult(
                collector_name="deliverability_avg_email_score",
                success=False,
                error=str(exc),
            )
