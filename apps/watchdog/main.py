"""
Watchdog Service - Entry Point.

Runs an APScheduler scheduler every N seconds (configurable via
WATCHDOG_INTERVAL_SECONDS) that:
  1. Runs all collectors (health, redis, db, metrics)
  2. Evaluates results through the rule engine
  3. Logs any incidents detected
  4. Optionally triggers auto-escalation for critical incidents
"""

from __future__ import annotations

import asyncio
import logging
import os
import uuid
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from config import config
from models import IncidentEvent, WatchdogState

# Import collectors
from collectors import (
    DatabaseCollector,
    HealthCollector,
    MetricsCollector,
    RedisCollector,
)

# Import rule engine
from rules import RuleEngine

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

# ---------------------------------------------------------------------------
# Rule engine
# ---------------------------------------------------------------------------
rule_engine = RuleEngine()


# ---------------------------------------------------------------------------
# Incident handlers
# ---------------------------------------------------------------------------
async def handle_incident(incident: IncidentEvent) -> None:
    """Process a single incident: log it and escalate if needed."""
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


async def escalate_incident(incident: IncidentEvent) -> None:
    """
    Escalate a critical incident.

    In production, this could:
      - Send a webhook to n8n / PagerDuty / OpsGenie
      - Post to a Slack channel
      - Send an email/SMS alert
      - Call the ai-service /diagnose-incident endpoint for deeper analysis
    """
    logger.critical(
        "ESCALATING incident %s on %s — auto_escalate=%s",
        incident.incident_type,
        incident.service,
        incident.auto_escalate,
    )
    # TODO: Integrate with external alerting systems (Slack, PagerDuty, etc.)


# ---------------------------------------------------------------------------
# Main watchdog cycle
# ---------------------------------------------------------------------------
async def run_watchdog_cycle() -> WatchdogState:
    """Execute one full collection + evaluation cycle."""
    cycle_id = uuid.uuid4().hex[:12]
    logger.info("=== Watchdog cycle %s starting ===", cycle_id)

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

    # 4. Build state
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
# Scheduler
# ---------------------------------------------------------------------------
async def scheduled_task() -> None:
    """Wrapper for the scheduled watchdog cycle."""
    try:
        await run_watchdog_cycle()
    except Exception:
        logger.exception("Unhandled error in watchdog cycle")


async def startup() -> None:
    """Run an initial cycle on startup, then schedule periodic runs."""
    logger.info(
        "Watchdog starting — interval=%ds",
        config.watchdog_interval_seconds,
    )

    # Run first cycle immediately
    await run_watchdog_cycle()


def main() -> None:
    """Entry point: set up scheduler and run forever."""
    scheduler = AsyncIOScheduler()

    # Add the recurring job
    scheduler.add_job(
        scheduled_task,
        IntervalTrigger(seconds=config.watchdog_interval_seconds),
        id="watchdog_cycle",
        name="Watchdog collection cycle",
        replace_existing=True,
    )

    scheduler.start()
    logger.info(
        "Watchdog scheduler started — interval=%ds",
        config.watchdog_interval_seconds,
    )

    # Run startup (first cycle) in the event loop
    loop = asyncio.get_event_loop()
    loop.run_until_complete(startup())

    try:
        # Keep the event loop running
        loop.run_forever()
    except KeyboardInterrupt:
        logger.info("Watchdog shutting down...")
        scheduler.shutdown(wait=False)
        loop.close()


if __name__ == "__main__":
    main()
