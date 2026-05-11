"""
Audit Log.

Provides an immutable audit trail for all watchdog incidents and remediation
actions. Writes to the watchdog_audit_log table in PostgreSQL.

Includes the SQL migration string for creating the table.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime
from typing import Any

import asyncpg

from config import config

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# SQL migration — run this against PostgreSQL to create the audit table
# ---------------------------------------------------------------------------
CREATE_WATCHDOG_AUDIT_LOG_TABLE = """
CREATE TABLE IF NOT EXISTS watchdog_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  incident_type VARCHAR NOT NULL,
  severity VARCHAR NOT NULL,
  service VARCHAR NOT NULL,
  root_cause TEXT,
  confidence DECIMAL,
  actions_taken JSONB,
  actions_results JSONB,
  resolved_automatically BOOLEAN DEFAULT false,
  human_escalated BOOLEAN DEFAULT false,
  resolution_time_ms INTEGER,
  raw_incident JSONB
);

-- Index for fast queries by time range
CREATE INDEX IF NOT EXISTS idx_watchdog_audit_log_timestamp
  ON watchdog_audit_log (timestamp DESC);

-- Index for filtering by severity
CREATE INDEX IF NOT EXISTS idx_watchdog_audit_log_severity
  ON watchdog_audit_log (severity);

-- Index for filtering by service
CREATE INDEX IF NOT EXISTS idx_watchdog_audit_log_service
  ON watchdog_audit_log (service);

-- Index for unresolved incidents
CREATE INDEX IF NOT EXISTS idx_watchdog_audit_log_unresolved
  ON watchdog_audit_log (resolved_automatically, timestamp DESC)
  WHERE resolved_automatically = false;
"""


class AuditLogger:
    """
    Handles writing and querying the watchdog_audit_log table.

    All writes are immutable (INSERT only, no UPDATE/DELETE).
    """

    def __init__(self) -> None:
        self.dsn = config.db_dsn

    async def ensure_table_exists(self) -> None:
        """Run the CREATE TABLE migration if the table doesn't exist."""
        try:
            conn = await asyncpg.connect(self.dsn, timeout=10)
            await conn.execute(CREATE_WATCHDOG_AUDIT_LOG_TABLE)
            await conn.close()
            logger.info("watchdog_audit_log table ensured")
        except Exception as exc:
            logger.error("Failed to ensure audit log table: %s", exc)

    async def write_entry(self, entry: dict[str, Any]) -> str | None:
        """
        Write an immutable audit log entry.

        Args:
            entry: Dict with keys matching the table columns.

        Returns:
            The entry ID if successful, None if failed.
        """
        entry_id = entry.get("id")
        if not entry_id:
            entry_id = uuid.uuid4().hex[:12]
            entry["id"] = entry_id

        try:
            conn = await asyncpg.connect(self.dsn, timeout=5)
            await conn.execute(
                """
                INSERT INTO watchdog_audit_log
                    (id, timestamp, incident_type, severity, service,
                     root_cause, confidence, actions_taken, actions_results,
                     resolved_automatically, human_escalated, resolution_time_ms,
                     raw_incident)
                VALUES
                    ($1, $2, $3, $4, $5,
                     $6, $7, $8::jsonb, $9::jsonb,
                     $10, $11, $12,
                     $13::jsonb)
                ON CONFLICT (id) DO NOTHING
                """,
                entry.get("id"),
                entry.get("timestamp", datetime.utcnow()),
                entry.get("incident_type"),
                entry.get("severity"),
                entry.get("service"),
                entry.get("root_cause"),
                entry.get("confidence"),
                json.dumps(entry.get("actions_taken", [])),
                json.dumps(entry.get("actions_results", [])),
                entry.get("resolved_automatically", False),
                entry.get("human_escalated", False),
                entry.get("resolution_time_ms"),
                json.dumps(entry.get("raw_incident", {}), default=str),
            )
            await conn.close()
            logger.info("Audit log entry written: %s", entry_id)
            return entry_id
        except Exception as exc:
            logger.error(
                "Failed to write audit log entry: %s — falling back to file log",
                exc,
            )
            logger.info("AUDIT_LOG_FALLBACK: %s", json.dumps(entry, default=str))
            return None

    async def query_recent(
        self,
        limit: int = 50,
        severity: str | None = None,
        service: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Query recent audit log entries with optional filters.

        Args:
            limit: Max number of entries to return.
            severity: Filter by severity level.
            service: Filter by service name.

        Returns:
            List of audit log entries as dicts.
        """
        try:
            conn = await asyncpg.connect(self.dsn, timeout=5)
            query = "SELECT * FROM watchdog_audit_log WHERE 1=1"
            params: list[Any] = []
            param_idx = 1

            if severity:
                query += f" AND severity = ${param_idx}"
                params.append(severity)
                param_idx += 1

            if service:
                query += f" AND service = ${param_idx}"
                params.append(service)
                param_idx += 1

            query += " ORDER BY timestamp DESC LIMIT $" + str(param_idx)
            params.append(limit)

            rows = await conn.fetch(query, *params)
            await conn.close()

            return [dict(row) for row in rows]
        except Exception as exc:
            logger.error("Failed to query audit log: %s", exc)
            return []

    async def count_unresolved(self) -> int:
        """Count incidents that were not resolved automatically."""
        try:
            conn = await asyncpg.connect(self.dsn, timeout=5)
            count = await conn.fetchval(
                "SELECT COUNT(*) FROM watchdog_audit_log "
                "WHERE resolved_automatically = false"
            )
            await conn.close()
            return count or 0
        except Exception as exc:
            logger.error("Failed to count unresolved incidents: %s", exc)
            return -1
