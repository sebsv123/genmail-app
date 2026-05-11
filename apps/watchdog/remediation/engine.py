"""
Remediation Engine.

Receives IncidentEvent → calls POST /diagnose-incident on ai-service →
executes recommended runbooks → logs everything to watchdog_audit_log.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime
from typing import Any

import httpx

from config import config
from models import IncidentEvent, Severity

from .circuit_breaker import CircuitBreaker
from .runbooks import RunbookExecutor

logger = logging.getLogger(__name__)


class RemediationEngine:
    """
    Orchestrates the full remediation flow:

    1. Receive IncidentEvent
    2. Call POST /diagnose-incident on ai-service
    3. For each recommended_action with auto_execute=True → execute runbook
    4. For human-in-the-loop actions → notify only, don't execute
    5. Register everything in watchdog_audit_log
    6. If ai-service is down → execute fallback runbook directly
    """

    def __init__(self) -> None:
        self.ai_service_url = config.ai_service_url.rstrip("/")
        self.runbook_executor = RunbookExecutor()
        self.circuit_breaker = CircuitBreaker()

    async def remediate(
        self, incident: IncidentEvent
    ) -> dict[str, Any]:
        """
        Full remediation flow for a single incident.

        Returns a dict with the remediation result including:
        - incident_id
        - diagnosis (from ai-service or fallback)
        - actions_taken
        - actions_results
        - audit_entry_id
        """
        incident_id = uuid.uuid4().hex[:12]
        logger.info(
            "Remediation starting for incident %s: %s on %s",
            incident_id,
            incident.incident_type,
            incident.service,
        )

        # Step 1: Diagnose the incident
        diagnosis = await self._diagnose(incident)

        # Step 2: Execute recommended actions
        actions_taken: list[dict[str, Any]] = []
        actions_results: list[dict[str, Any]] = []

        recommended_actions = diagnosis.get("recommended_actions", [])

        for action in recommended_actions:
            runbook = action.get("runbook", "no_action_needed")
            auto_execute = action.get("auto_execute", False)
            params = action.get("params", {})
            priority = action.get("priority", 5)

            action_entry = {
                "runbook": runbook,
                "auto_execute": auto_execute,
                "priority": priority,
                "params": params,
                "reason": action.get("reason", ""),
            }
            actions_taken.append(action_entry)

            if auto_execute:
                # Check circuit breaker before executing
                if self.circuit_breaker.is_open(incident, runbook):
                    logger.warning(
                        "Circuit OPEN for runbook '%s' — escalating instead of executing",
                        runbook,
                    )
                    # Escalate to human instead
                    human_result = await self.runbook_executor.execute(
                        "notify_human", incident, {
                            "reason": f"Circuit breaker open for runbook '{runbook}' "
                                      f"after {self.circuit_breaker._failures.get(
                                          (incident.incident_type, incident.service, runbook), []
                                      )} failures"
                        }
                    )
                    actions_results.append({
                        "runbook": runbook,
                        "executed": False,
                        "circuit_open": True,
                        "escalated": True,
                        "result": human_result,
                    })
                    continue

                # Execute the runbook
                result = await self.runbook_executor.execute(
                    runbook, incident, params
                )

                # Track success/failure in circuit breaker
                if result.get("success"):
                    self.circuit_breaker.record_success(incident, runbook)
                else:
                    self.circuit_breaker.record_failure(incident, runbook)

                actions_results.append({
                    "runbook": runbook,
                    "executed": True,
                    "success": result.get("success"),
                    "result": result,
                })
            else:
                # Human-in-the-loop: notify but don't execute
                logger.info(
                    "Human-in-the-loop for runbook '%s' — notifying",
                    runbook,
                )
                await self.runbook_executor.execute(
                    "notify_human", incident, {
                        "reason": f"Human approval needed for runbook '{runbook}': "
                                  f"{action.get('reason', '')}"
                    }
                )
                actions_results.append({
                    "runbook": runbook,
                    "executed": False,
                    "human_in_the_loop": True,
                    "result": {"success": True, "details": "Human notified for approval"},
                })

        # Step 3: Build audit entry
        audit_entry = await self._write_audit_log(
            incident_id=incident_id,
            incident=incident,
            diagnosis=diagnosis,
            actions_taken=actions_taken,
            actions_results=actions_results,
        )

        result = {
            "incident_id": incident_id,
            "diagnosis": diagnosis,
            "actions_taken": actions_taken,
            "actions_results": actions_results,
            "audit_entry_id": audit_entry.get("id"),
            "resolved_automatically": all(
                r.get("success", False) for r in actions_results if r.get("executed")
            ) if any(r.get("executed") for r in actions_results) else False,
        }

        logger.info(
            "Remediation complete for incident %s: %d actions taken",
            incident_id,
            len(actions_taken),
        )

        return result

    async def _diagnose(self, incident: IncidentEvent) -> dict[str, Any]:
        """
        Call POST /diagnose-incident on ai-service.

        If ai-service is unreachable, use a hardcoded fallback diagnosis.
        """
        payload = {
            "anomaly_type": incident.incident_type,
            "service": incident.service,
            "error_data": incident.error_data,
            "recent_context": incident.recent_context,
        }

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    f"{self.ai_service_url}/diagnose-incident",
                    json=payload,
                )
                resp.raise_for_status()
                diagnosis: dict[str, Any] = resp.json()
                logger.info(
                    "Diagnosis from ai-service: severity=%s, root_cause=%s",
                    diagnosis.get("severity"),
                    diagnosis.get("root_cause"),
                )
                return diagnosis
        except httpx.RequestError as exc:
            logger.error(
                "ai-service unreachable for diagnosis: %s — using fallback",
                exc,
            )
            return self._fallback_diagnosis(incident)

    def _fallback_diagnosis(
        self, incident: IncidentEvent
    ) -> dict[str, Any]:
        """
        Hardcoded fallback when ai-service is down.

        Maps incident types to appropriate runbooks without AI.
        """
        fallback_map: dict[str, list[dict[str, Any]]] = {
            "health_check_failure": [
                {
                    "runbook": "restart_service",
                    "params": {},
                    "priority": 10,
                    "auto_execute": True,
                    "reason": "Service unreachable — attempting restart",
                },
                {
                    "runbook": "notify_human",
                    "params": {},
                    "priority": 8,
                    "auto_execute": False,
                    "reason": "Notify team of service restart",
                },
            ],
            "redis_connection_error": [
                {
                    "runbook": "activate_fallback_mode",
                    "params": {},
                    "priority": 10,
                    "auto_execute": True,
                    "reason": "Redis down — activating fallback mode",
                },
                {
                    "runbook": "notify_human",
                    "params": {},
                    "priority": 9,
                    "auto_execute": False,
                    "reason": "Redis connection lost — human intervention needed",
                },
            ],
            "redis_backlog_overflow": [
                {
                    "runbook": "requeue_jobs",
                    "params": {},
                    "priority": 8,
                    "auto_execute": True,
                    "reason": "Queue backlog detected — requeueing dead-letter jobs",
                },
            ],
            "db_connection_error": [
                {
                    "runbook": "activate_fallback_mode",
                    "params": {},
                    "priority": 10,
                    "auto_execute": True,
                    "reason": "Database down — activating fallback mode",
                },
                {
                    "runbook": "notify_human",
                    "params": {},
                    "priority": 9,
                    "auto_execute": False,
                    "reason": "Database connection lost — human intervention needed",
                },
            ],
            "db_query_timeout": [
                {
                    "runbook": "notify_human",
                    "params": {},
                    "priority": 7,
                    "auto_execute": False,
                    "reason": "Database query timeout — investigate slow queries",
                },
            ],
            "error_rate_5xx_exceeded": [
                {
                    "runbook": "restart_service",
                    "params": {},
                    "priority": 9,
                    "auto_execute": True,
                    "reason": "High 5xx error rate — restarting service",
                },
                {
                    "runbook": "notify_human",
                    "params": {},
                    "priority": 7,
                    "auto_execute": False,
                    "reason": "High error rate — human investigation needed",
                },
            ],
            "json_invalid_rate_high": [
                {
                    "runbook": "notify_human",
                    "params": {},
                    "priority": 6,
                    "auto_execute": False,
                    "reason": "High JSON invalid rate — LLM provider issue",
                },
            ],
            "high_latency_detected": [
                {
                    "runbook": "restart_service",
                    "params": {},
                    "priority": 7,
                    "auto_execute": True,
                    "reason": "High latency detected — restarting service",
                },
            ],
        }

        actions = fallback_map.get(
            incident.incident_type,
            [
                {
                    "runbook": "notify_human",
                    "params": {},
                    "priority": 5,
                    "auto_execute": False,
                    "reason": f"Unknown incident type: {incident.incident_type}",
                },
            ],
        )

        return {
            "incident_id": uuid.uuid4().hex[:12],
            "severity": incident.severity.value,
            "root_cause": f"Fallback diagnosis: {incident.incident_type} on {incident.service}",
            "confidence": 0.5,
            "affected_scope": {
                "services": [incident.service],
                "businesses": None,
                "users_impacted": "unknown",
            },
            "recommended_actions": actions,
            "human_escalation_needed": incident.severity == Severity.critical,
            "whatsapp_alert_text": (
                f"🚨 Watchdog Fallback: {incident.incident_type} on {incident.service}"
            ),
            "estimated_resolution_time": "5-10 minutes",
            "monitoring_after": ["health_check", "error_rate"],
        }

    async def _write_audit_log(
        self,
        incident_id: str,
        incident: IncidentEvent,
        diagnosis: dict[str, Any],
        actions_taken: list[dict[str, Any]],
        actions_results: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """
        Write an immutable audit log entry to PostgreSQL.

        Falls back to logging if DB is unavailable.
        """
        import asyncpg

        audit_entry = {
            "id": incident_id,
            "timestamp": datetime.utcnow().isoformat(),
            "incident_type": incident.incident_type,
            "severity": incident.severity.value,
            "service": incident.service,
            "root_cause": diagnosis.get("root_cause"),
            "confidence": diagnosis.get("confidence"),
            "actions_taken": actions_taken,
            "actions_results": actions_results,
            "resolved_automatically": all(
                r.get("success", False) for r in actions_results if r.get("executed")
            ) if any(r.get("executed") for r in actions_results) else False,
            "human_escalated": incident.auto_escalate or diagnosis.get("human_escalation_needed", False),
            "resolution_time_ms": None,
            "raw_incident": incident.model_dump(),
        }

        try:
            conn = await asyncpg.connect(config.db_dsn, timeout=5)
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
                incident_id,
                datetime.utcnow(),
                incident.incident_type,
                incident.severity.value,
                incident.service,
                diagnosis.get("root_cause"),
                diagnosis.get("confidence"),
                json.dumps(actions_taken),
                json.dumps(actions_results),
                audit_entry["resolved_automatically"],
                audit_entry["human_escalated"],
                None,  # resolution_time_ms — set later when resolved
                json.dumps(audit_entry["raw_incident"], default=str),
            )
            await conn.close()
            logger.info("Audit log entry written: %s", incident_id)
        except Exception as exc:
            logger.error(
                "Failed to write audit log to DB: %s — falling back to file log",
                exc,
            )
            # Fallback: log the audit entry as JSON
            logger.info("AUDIT_LOG_FALLBACK: %s", json.dumps(audit_entry, default=str))

        return audit_entry
