"""
Runbook Executor.

Implements the actual remediation actions for each runbook type.
Each runbook is an async function that performs the specific remediation.
"""

from __future__ import annotations

import json
import logging
from typing import Any

import asyncpg
import httpx
import redis.asyncio as aioredis

from config import config
from models import IncidentEvent

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# n8n webhook for human notification
# ---------------------------------------------------------------------------
N8N_HUMAN_WEBHOOK_URL = "https://n8n.valentinproteccion.com/webhook/watchdog-escalate"
WHATSAPP_NUMBERS = ["34603448765"]  # Rosa y Sebastián


class RunbookExecutor:
    """Executes runbook actions based on recommended_action.runbook value."""

    def __init__(self) -> None:
        self.ai_service_url = config.ai_service_url.rstrip("/")
        self.redis_host = config.redis_host
        self.redis_port = config.redis_port
        self.redis_db = config.redis_db
        self.db_dsn = config.db_dsn

    async def execute(
        self, runbook: str, incident: IncidentEvent, params: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """
        Execute a runbook by name.

        Returns a dict with at least {"success": bool, "details": str}.
        """
        params = params or {}
        method_name = f"runbook_{runbook}"
        method = getattr(self, method_name, None)

        if method is None:
            logger.error("Unknown runbook: %s", runbook)
            return {"success": False, "details": f"Unknown runbook: {runbook}"}

        try:
            result = await method(incident, params)
            logger.info("Runbook %s executed: %s", runbook, result)
            return result
        except Exception as exc:
            logger.exception("Runbook %s failed: %s", runbook, exc)
            return {"success": False, "details": str(exc)}

    # ------------------------------------------------------------------
    # restart_service
    # ------------------------------------------------------------------
    async def runbook_restart_service(
        self, incident: IncidentEvent, params: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Restart a service via infra endpoint or Docker signal.

        POST to infra API: /api/restart/{service}
        """
        service = incident.service
        infra_url = "http://infra:3000/api/restart"

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{infra_url}/{service}",
                    json={"reason": incident.incident_type},
                )
                resp.raise_for_status()
                data = resp.json()
                return {
                    "success": True,
                    "details": f"Restart signal sent for {service}",
                    "response": data,
                }
        except httpx.RequestError as exc:
            logger.error("Failed to restart %s via infra API: %s", service, exc)
            return {"success": False, "details": f"Infra API unreachable: {exc}"}

    # ------------------------------------------------------------------
    # requeue_jobs
    # ------------------------------------------------------------------
    async def runbook_requeue_jobs(
        self, incident: IncidentEvent, params: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Move jobs from dead-letter / failed queues back to main queue.

        Uses Redis RPOPLPUSH to atomically move one job at a time.
        """
        try:
            r = aioredis.Redis(
                host=self.redis_host,
                port=self.redis_port,
                db=self.redis_db,
                socket_timeout=5,
            )

            # Determine which queues to requeue based on stalled queues in incident
            stalled = incident.error_data.get("stalled_queues", [])
            requeued_count = 0

            for queue_key in stalled:
                # Derive dead-letter key: bull:{name}:failed
                failed_key = queue_key.replace(":wait", ":failed")
                # Move up to 100 jobs from failed to wait
                for _ in range(100):
                    job = await r.rpoplpush(failed_key, queue_key)
                    if job is None:
                        break
                    requeued_count += 1

            await r.aclose()
            return {
                "success": True,
                "details": f"Requeued {requeued_count} jobs from dead-letter queues",
                "requeued_count": requeued_count,
            }
        except Exception as exc:
            logger.error("Requeue failed: %s", exc)
            return {"success": False, "details": str(exc)}

    # ------------------------------------------------------------------
    # pause_sequence
    # ------------------------------------------------------------------
    async def runbook_pause_sequence(
        self, incident: IncidentEvent, params: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Pause email sequences by setting status='paused'.

        UPDATE sequences SET status='paused' WHERE id = :sequence_id
        """
        sequence_id = params.get("sequence_id")
        if not sequence_id:
            return {"success": False, "details": "Missing sequence_id param"}

        try:
            conn = await asyncpg.connect(self.db_dsn, timeout=10)
            result = await conn.execute(
                "UPDATE sequences SET status = 'paused', updated_at = NOW() "
                "WHERE id = $1 AND status = 'active'",
                sequence_id,
            )
            await conn.close()
            return {
                "success": True,
                "details": f"Sequence {sequence_id} paused",
                "rows_affected": result,
            }
        except Exception as exc:
            logger.error("Failed to pause sequence %s: %s", sequence_id, exc)
            return {"success": False, "details": str(exc)}

    # ------------------------------------------------------------------
    # pause_icp
    # ------------------------------------------------------------------
    async def runbook_pause_icp(
        self, incident: IncidentEvent, params: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Pause an ICP by setting status='paused'.

        UPDATE icps SET status='paused' WHERE slug = :slug
        """
        icp_slug = params.get("icp_slug")
        if not icp_slug:
            return {"success": False, "details": "Missing icp_slug param"}

        try:
            conn = await asyncpg.connect(self.db_dsn, timeout=10)
            result = await conn.execute(
                "UPDATE icps SET status = 'paused', updated_at = NOW() "
                "WHERE slug = $1 AND status = 'active'",
                icp_slug,
            )
            await conn.close()
            return {
                "success": True,
                "details": f"ICP {icp_slug} paused",
                "rows_affected": result,
            }
        except Exception as exc:
            logger.error("Failed to pause ICP %s: %s", icp_slug, exc)
            return {"success": False, "details": str(exc)}

    # ------------------------------------------------------------------
    # block_email_before_send
    # ------------------------------------------------------------------
    async def runbook_block_email_before_send(
        self, incident: IncidentEvent, params: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Block an email from being sent by inserting into email_blocks table.

        INSERT INTO email_blocks (email, reason, blocked_by) VALUES (...)
        """
        email = params.get("email") or incident.error_data.get("email")
        reason = params.get("reason") or f"Auto-blocked by watchdog: {incident.incident_type}"

        if not email:
            return {"success": False, "details": "Missing email param"}

        try:
            conn = await asyncpg.connect(self.db_dsn, timeout=10)
            await conn.execute(
                "INSERT INTO email_blocks (email, reason, blocked_by, created_at) "
                "VALUES ($1, $2, 'watchdog', NOW()) "
                "ON CONFLICT (email) DO NOTHING",
                email,
                reason,
            )
            await conn.close()
            return {
                "success": True,
                "details": f"Email {email} blocked: {reason}",
            }
        except Exception as exc:
            logger.error("Failed to block email %s: %s", email, exc)
            return {"success": False, "details": str(exc)}

    # ------------------------------------------------------------------
    # quarantine_lead
    # ------------------------------------------------------------------
    async def runbook_quarantine_lead(
        self, incident: IncidentEvent, params: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Quarantine a lead by setting status='quarantine'.

        UPDATE leads SET status='quarantine' WHERE id = :lead_id
        """
        lead_id = params.get("lead_id")
        if not lead_id:
            return {"success": False, "details": "Missing lead_id param"}

        try:
            conn = await asyncpg.connect(self.db_dsn, timeout=10)
            result = await conn.execute(
                "UPDATE leads SET status = 'quarantine', updated_at = NOW() "
                "WHERE id = $1 AND status != 'quarantine'",
                lead_id,
            )
            await conn.close()
            return {
                "success": True,
                "details": f"Lead {lead_id} quarantined",
                "rows_affected": result,
            }
        except Exception as exc:
            logger.error("Failed to quarantine lead %s: %s", lead_id, exc)
            return {"success": False, "details": str(exc)}

    # ------------------------------------------------------------------
    # activate_fallback_mode
    # ------------------------------------------------------------------
    async def runbook_activate_fallback_mode(
        self, incident: IncidentEvent, params: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Set fallback mode in Redis with a 1-hour TTL.

        SET watchdog:fallback_mode=1 EX 3600
        """
        try:
            r = aioredis.Redis(
                host=self.redis_host,
                port=self.redis_port,
                db=self.redis_db,
                socket_timeout=5,
            )
            await r.set("watchdog:fallback_mode", "1", ex=3600)
            await r.aclose()
            return {
                "success": True,
                "details": "Fallback mode activated for 1 hour",
            }
        except Exception as exc:
            logger.error("Failed to activate fallback mode: %s", exc)
            return {"success": False, "details": str(exc)}

    # ------------------------------------------------------------------
    # notify_human
    # ------------------------------------------------------------------
    async def runbook_notify_human(
        self, incident: IncidentEvent, params: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Notify humans via n8n webhook → WhatsApp.

        POST to n8n webhook with incident details.
        """
        payload = {
            "incident_type": incident.incident_type,
            "service": incident.service,
            "severity": incident.severity.value,
            "error_data": incident.error_data,
            "recent_context": incident.recent_context,
            "auto_escalate": incident.auto_escalate,
            "whatsapp_numbers": WHATSAPP_NUMBERS,
            "message": (
                f"🚨 *Watchdog Alert* - {incident.severity.value.upper()}\n"
                f"Incident: {incident.incident_type}\n"
                f"Service: {incident.service}\n"
                f"Details: {json.dumps(incident.error_data, default=str)}"
            ),
        }

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(N8N_HUMAN_WEBHOOK_URL, json=payload)
                resp.raise_for_status()
                return {
                    "success": True,
                    "details": f"Human notified via n8n webhook",
                    "response": resp.json() if resp.text else {},
                }
        except httpx.RequestError as exc:
            logger.error("Failed to notify human via n8n: %s", exc)
            return {"success": False, "details": f"n8n webhook error: {exc}"}

    # ------------------------------------------------------------------
    # no_action_needed
    # ------------------------------------------------------------------
    async def runbook_no_action_needed(
        self, incident: IncidentEvent, params: dict[str, Any]
    ) -> dict[str, Any]:
        """No action needed — just log the incident."""
        logger.info(
            "No action needed for incident %s on %s",
            incident.incident_type,
            incident.service,
        )
        return {
            "success": True,
            "details": "No action needed — logged only",
        }
