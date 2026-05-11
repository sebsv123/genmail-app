"""
Circuit Breaker.

Prevents infinite remediation loops. If the same runbook fails 3 times
within a 10-minute window for the same incident type and service,
the circuit opens and escalates to a human instead of retrying.
"""

from __future__ import annotations

import logging
import time
from collections import defaultdict
from typing import Any

from models import IncidentEvent

logger = logging.getLogger(__name__)

# Circuit breaker configuration
MAX_FAILURES = 3
WINDOW_SECONDS = 600  # 10 minutes


class CircuitBreaker:
    """
    Tracks runbook execution failures and opens the circuit when
    the failure threshold is exceeded within the time window.
    """

    def __init__(self) -> None:
        # Key: (incident_type, service, runbook) → list of failure timestamps
        self._failures: dict[tuple[str, str, str], list[float]] = defaultdict(list)
        # Key: (incident_type, service, runbook) → whether circuit is open
        self._open_circuits: dict[tuple[str, str, str], bool] = {}

    def record_failure(
        self, incident: IncidentEvent, runbook: str
    ) -> None:
        """Record a runbook execution failure."""
        key = (incident.incident_type, incident.service, runbook)
        now = time.time()
        self._failures[key].append(now)
        self._prune_old(key, now)

        failure_count = len(self._failures[key])
        logger.warning(
            "Circuit breaker: runbook '%s' for %s/%s failed %d/%d times",
            runbook,
            incident.service,
            incident.incident_type,
            failure_count,
            MAX_FAILURES,
        )

        if failure_count >= MAX_FAILURES:
            self._open_circuits[key] = True
            logger.critical(
                "Circuit OPEN for runbook '%s' on %s/%s — will escalate to human",
                runbook,
                incident.service,
                incident.incident_type,
            )

    def record_success(
        self, incident: IncidentEvent, runbook: str
    ) -> None:
        """Record a successful execution — resets failure count."""
        key = (incident.incident_type, incident.service, runbook)
        self._failures[key].clear()
        self._open_circuits.pop(key, None)

    def is_open(self, incident: IncidentEvent, runbook: str) -> bool:
        """Check if the circuit is open for this incident+runbook combo."""
        key = (incident.incident_type, incident.service, runbook)
        self._prune_old(key, time.time())
        return self._open_circuits.get(key, False)

    def _prune_old(self, key: tuple[str, str, str], now: float) -> None:
        """Remove failures older than the window."""
        cutoff = now - WINDOW_SECONDS
        self._failures[key] = [
            ts for ts in self._failures[key] if ts > cutoff
        ]

        # If after pruning we're below threshold, close the circuit
        if len(self._failures[key]) < MAX_FAILURES:
            self._open_circuits.pop(key, None)

    def reset(self) -> None:
        """Reset all circuits (e.g., on watchdog restart)."""
        self._failures.clear()
        self._open_circuits.clear()
        logger.info("Circuit breaker: all circuits reset")
