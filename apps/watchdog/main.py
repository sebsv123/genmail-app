"""
Watchdog Service - Entry Point.

Runs an APScheduler scheduler with multiple jobs:
  - Every 60s: Run all collectors (health, redis, db, metrics)
  - Every 300s (5min): Run synthetic tests against ai-service
  - Every 900s (15min): Run deliverability collector

Also exposes FastAPI endpoints for health, status, and audit queries.
"""

from __future__ import annotations

import asyncio
import logging
import os
import uuid
from collections import deque
from datetime import datetime
from typing import Any

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from fastapi import FastAPI, Query

from config import config
from models import IncidentEvent, WatchdogState

# Import collectors
from collectors import (
    DatabaseCollector,
    DeliverabilityCollector,
    HealthCollector,
    MetricsCollector,
    RedisCollector,
)

# Import rule engine
from rules import RuleEngine

# Import synthetic tests
from synthetic import SyntheticTestRunner

# Import audit
from audit import AuditLogger

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper()),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("watchdog")


# ---------------------------------------------------------------------------
# Collectors
# ---------------------------------------------------------------------------
health_collector = HealthCollector()
redis_collector = RedisCollector()
db_collector = DatabaseCollector()
metrics_collector = MetricsCollector()
deliverability_collector = DeliverabilityCollector()

# ---------------------------------------------------------------------------
# Synthetic tests
# ---------------------------------------------------------------------------
synthetic_test_runner = SyntheticTestRunner()

# ---------------------------------------------------------------------------
# Rule engine
# ---------------------------------------------------------------------------
rule_engine = RuleEngine()

# ---------------------------------------------------------------------------
# Audit logger
# ---------------------------------------------------------------------------
audit_logger = AuditLogger()

# ---------------------------------------------------------------------------
# In-memory state for FastAPI endpoints
# ---------------------------------------------------------------------------
_last_check_ts: datetime | None = None
_incidents_last_hour: int = 0
_auto_resolved_last_hour: int = 0
_recent_incidents: deque[dict[str, Any]] = deque(maxlen=10)
_service_status: dict[str, str] = {}


# ---------------------------------------------------------------------------
# Incident handlers
# ---------------------------------------------------------------------------
async def handle_incident(incident: IncidentEvent) -> None:
    """Process a single incident: log it and escalate if needed."""
    global _incidents_last_hour, _auto_resolved_last_hour

    log_msg = (
        f"[{incident.severity.upper()}] {incident.incident_type} "
        f"on {incident.service}: {incident.error_data}"
    )

    if incident.severity.value == "critical":
        logger.critical(log_msg)
        await escalate_incident(incident)
    elif incident.severity.value == "high":
        logger.error(log_msg)
    elif incident.severity.value == "medium":
        logger.warning(log_msg)
    else:
        logger.info(log_msg)

    _incidents_last_hour += 1
    _recent_incidents.appendleft({
        "incident_type": incident.incident_type,
        "service": incident.service,
        "severity": incident.severity.value,
        "timestamp": datetime.utcnow().isoformat(),
        "auto_escalate": incident.auto_escalate,
    })


async def escalate_incident(incident: IncidentEvent) -> None:
    """Escalate a critical incident."""
    logger.critical(
        "ESCALATING incident %s on %s — auto_escalate=%s",
        incident.incident_type,
        incident.service,
        incident.auto_escalate,
    )


# ---------------------------------------------------------------------------
# Main watchdog cycle
# ---------------------------------------------------------------------------
async def run_watchdog_cycle() -> WatchdogState:
    """Execute one full collection + evaluation cycle."""
    global _last_check_ts, _service_status

    cycle_id = uuid.uuid4().hex[:12]
    logger.info("=== Watchdog cycle %s starting ===", cycle_id)
    _last_check_ts = datetime.utcnow()

    all_results = []

    # 1. Run all collectors concurrently
    collector_tasks = [
        health_collector.collect(),
        redis_collector.collect(),
        db_collector.collect(),
        metrics_collector.collect(),
    ]

    collector_results = await asyncio.gather(*collector_tasks, return_exceptions=True)

    for result_set in collector_results:
        if isinstance(result_set, Exception):
            logger.error("Collector raised an exception: %s", result_set)
            continue
        all_results.extend(result_set)

    # 2. Evaluate results through rule engine
    incidents = rule_engine.evaluate(all_results)

    # 3. Process incidents
    for incident in incidents:
        await handle_incident(incident)

    # 4. Update service status
    for result in all_results:
        name = result.collector_name
        if "health" in name:
            svc = name.replace("_health", "")
            _service_status[svc] = "healthy" if result.success else "unhealthy"

    # 5. Build state
    healthy = len(incidents) == 0
    state = WatchdogState(
        cycle_id=cycle_id,
        timestamp=datetime.utcnow(),
        collector_results=all_results,
        incidents=incidents,
        healthy=healthy,
    )

    logger.info(
        "=== Watchdog cycle %s complete — %d collectors, %d incidents, healthy=%s ===",
        cycle_id,
        len(all_results),
        len(incidents),
        healthy,
    )

    return state


# ---------------------------------------------------------------------------
# Synthetic tests task
# ---------------------------------------------------------------------------
async def run_synthetic_tests() -> None:
    """Run synthetic tests and process failures as incidents."""
    logger.info("Running synthetic tests...")
    try:
        results = await synthetic_test_runner.run_all()
        for result in results:
            if not result.success:
                incident = SyntheticTestRunner.result_to_incident(result)
                if incident:
                    await handle_incident(incident)
    except Exception:
        logger.exception("Synthetic tests failed")


# ---------------------------------------------------------------------------
# Deliverability task
# ---------------------------------------------------------------------------
async def run_deliverability_check() -> None:
    """Run deliverability collector and evaluate results."""
    logger.info("Running deliverability check...")
    try:
        results = await deliverability_collector.collect()
        incidents = rule_engine.evaluate(results)
        for incident in incidents:
            await handle_incident(incident)
    except Exception:
        logger.exception("Deliverability check failed")


# ---------------------------------------------------------------------------
# Scheduler
# ---------------------------------------------------------------------------
async def scheduled_task() -> None:
    """Wrapper for the scheduled watchdog cycle."""
    try:
        await run_watchdog_cycle()
    except Exception:
        logger.exception("Unhandled error in watchdog cycle")


async def startup() -> None:
    """Run initial cycles on startup."""
    logger.info(
        "Watchdog starting — interval=%ds",
        config.watchdog_interval_seconds,
    )

    # Ensure audit log table exists
    await audit_logger.ensure_table_exists()

    # Run first cycle immediately
    await run_watchdog_cycle()


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="GenMail Watchdog",
    description="Monitoring and remediation service for GenMail",
    version="0.1.0",
)


@app.get("/health")
async def health() -> dict[str, Any]:
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "genmail-watchdog",
        "last_check_ts": _last_check_ts.isoformat() if _last_check_ts else None,
        "incidents_last_hour": _incidents_last_hour,
        "auto_resolved_last_hour": _auto_resolved_last_hour,
    }


@app.get("/watchdog/health")
async def watchdog_health() -> dict[str, Any]:
    """Watchdog health with incident summary."""
    return {
        "status": "ok",
        "last_check_ts": _last_check_ts.isoformat() if _last_check_ts else None,
        "incidents_last_hour": _incidents_last_hour,
        "auto_resolved_last_hour": _auto_resolved_last_hour,
    }


@app.get("/watchdog/status")
async def watchdog_status() -> dict[str, Any]:
    """Full status summary: service health, recent incidents, key metrics."""
    return {
        "service_status": _service_status,
        "last_check_ts": _last_check_ts.isoformat() if _last_check_ts else None,
        "recent_incidents": list(_recent_incidents),
        "incidents_last_hour": _incidents_last_hour,
        "auto_resolved_last_hour": _auto_resolved_last_hour,
        "watchdog_interval_seconds": config.watchdog_interval_seconds,
    }


@app.get("/watchdog/audit")
async def watchdog_audit(limit: int = Query(20, ge=1, le=100)) -> list[dict[str, Any]]:
    """Return recent audit log entries."""
    entries = await audit_logger.query_recent(limit=limit)
    return entries


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------
def main() -> None:
    """Entry point: set up scheduler and run FastAPI + APScheduler."""
    scheduler = AsyncIOScheduler()

    # Job 1: Main watchdog cycle (every N seconds)
    scheduler.add_job(
        scheduled_task,
        IntervalTrigger(seconds=config.watchdog_interval_seconds),
        id="watchdog_cycle",
        name="Watchdog collection cycle",
        replace_existing=True,
    )

    # Job 2: Synthetic tests (every 5 minutes)
    scheduler.add_job(
        run_synthetic_tests,
        IntervalTrigger(seconds=300),
        id="synthetic_tests",
        name="Synthetic tests against ai-service",
        replace_existing=True,
    )

    # Job 3: Deliverability check (every 15 minutes)
    scheduler.add_job(
        run_deliverability_check,
        IntervalTrigger(seconds=900),
        id="deliverability_check",
        name="Deliverability metrics collection",
        replace_existing=True,
    )

    scheduler.start()
    logger.info(
        "Watchdog scheduler started — interval=%ds, synthetic=300s, deliverability=900s",
        config.watchdog_interval_seconds,
    )

    # Run startup (first cycle) in the event loop
    loop = asyncio.get_event_loop()
    loop.run_until_complete(startup())

    # Run FastAPI with uvicorn in the same event loop
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001,
        loop=loop,
        log_level=os.getenv("LOG_LEVEL", "info").lower(),
    )


if __name__ == "__main__":
    main()
