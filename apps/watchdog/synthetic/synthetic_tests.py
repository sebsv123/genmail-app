"""
Synthetic Tests.

Runs 5 automated tests every 5 minutes against the ai-service in sandbox mode.
Each test uses synthetic data marked with is_synthetic=True to exclude from
real metrics. Failures generate IncidentEvent with severity=high.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime
from typing import Any

import httpx

from config import config
from models import CollectorResult, IncidentEvent, Severity

logger = logging.getLogger(__name__)

# Synthetic lead data for testing
SYNTHETIC_LEAD = {
    "name": "Watchdog Test",
    "email": "watchdog@internal.test",
    "zone": "Boadilla del Monte",
    "source": "synthetic_test",
    "trigger": "watchdog_automated",
    "is_synthetic": True,
}

TEST_TIMEOUT = 15  # seconds per test


class SyntheticTestRunner:
    """Runs synthetic tests against ai-service endpoints."""

    def __init__(self) -> None:
        self.ai_service_url = config.ai_service_url.rstrip("/")

    async def run_all(self) -> list[CollectorResult]:
        """Run all 5 synthetic tests and return results."""
        test_id = uuid.uuid4().hex[:8]
        logger.info("=== Synthetic tests %s starting ===", test_id)

        results: list[CollectorResult] = []

        # Run tests sequentially (each depends on previous)
        test1 = await self.test_health()
        results.append(test1)

        if test1.success:
            test2 = await self.test_score_lead()
            results.append(test2)
        else:
            results.append(CollectorResult(
                collector_name="synthetic_score_lead",
                success=False,
                error="Skipped: health check failed",
                data={"is_synthetic": True},
            ))
            test2_data = None

        if results[-1].success:
            test3 = await self.test_classify_lead()
            results.append(test3)
        else:
            results.append(CollectorResult(
                collector_name="synthetic_classify_lead",
                success=False,
                error="Skipped: score_lead failed",
                data={"is_synthetic": True},
            ))
            test3_data = None

        icp_slug = results[-1].data.get("icp_slug") if results[-1].success else None
        if icp_slug:
            test4 = await self.test_generate_email(icp_slug)
            results.append(test4)
        else:
            results.append(CollectorResult(
                collector_name="synthetic_generate_email",
                success=False,
                error="Skipped: classify_lead failed or no icp_slug",
                data={"is_synthetic": True},
            ))

        email_data = results[-1].data if results[-1].success else None
        if email_data and email_data.get("subject_line"):
            test5 = await self.test_evaluate_email(email_data)
            results.append(test5)
        else:
            results.append(CollectorResult(
                collector_name="synthetic_evaluate_email",
                success=False,
                error="Skipped: generate_email failed or no subject_line",
                data={"is_synthetic": True},
            ))

        logger.info(
            "=== Synthetic tests %s complete: %d/%d passed ===",
            test_id,
            sum(1 for r in results if r.success),
            len(results),
        )

        return results

    async def test_health(self) -> CollectorResult:
        """TEST 1: GET /health → expect 200 + {status:'ok'}"""
        try:
            async with httpx.AsyncClient(timeout=TEST_TIMEOUT) as client:
                resp = await client.get(f"{self.ai_service_url}/health")
                resp.raise_for_status()
                data = resp.json()

                if data.get("status") == "ok":
                    return CollectorResult(
                        collector_name="synthetic_health",
                        success=True,
                        data={"is_synthetic": True, "status": data.get("status"), "status_code": resp.status_code},
                    )
                else:
                    return CollectorResult(
                        collector_name="synthetic_health",
                        success=False,
                        error=f"Unexpected status: {data.get('status')}",
                        data={"is_synthetic": True, "response": data},
                    )
        except Exception as exc:
            logger.error("Synthetic test HEALTH failed: %s", exc)
            return CollectorResult(
                collector_name="synthetic_health",
                success=False,
                error=str(exc),
                data={"is_synthetic": True},
            )

    async def test_score_lead(self) -> CollectorResult:
        """TEST 2: POST /score-lead with synthetic lead → expect quality_score numeric"""
        try:
            payload = {
                "name": SYNTHETIC_LEAD["name"],
                "email": SYNTHETIC_LEAD["email"],
                "zone": SYNTHETIC_LEAD["zone"],
                "source": SYNTHETIC_LEAD["source"],
                "trigger": SYNTHETIC_LEAD["trigger"],
                "is_synthetic": True,
            }
            async with httpx.AsyncClient(timeout=TEST_TIMEOUT) as client:
                resp = await client.post(
                    f"{self.ai_service_url}/score-lead",
                    json=payload,
                )
                resp.raise_for_status()
                data = resp.json()

                quality_score = data.get("quality_score")
                if quality_score is not None and isinstance(quality_score, (int, float)):
                    return CollectorResult(
                        collector_name="synthetic_score_lead",
                        success=True,
                        data={"is_synthetic": True, "quality_score": quality_score, **data},
                    )
                else:
                    return CollectorResult(
                        collector_name="synthetic_score_lead",
                        success=False,
                        error=f"Missing or non-numeric quality_score: {quality_score}",
                        data={"is_synthetic": True, "response": data},
                    )
        except Exception as exc:
            logger.error("Synthetic test SCORE_LEAD failed: %s", exc)
            return CollectorResult(
                collector_name="synthetic_score_lead",
                success=False,
                error=str(exc),
                data={"is_synthetic": True},
            )

    async def test_classify_lead(self) -> CollectorResult:
        """TEST 3: POST /classify-lead → expect icp_slug != error"""
        try:
            payload = {
                "lead_data": {
                    "name": SYNTHETIC_LEAD["name"],
                    "email": SYNTHETIC_LEAD["email"],
                    "zone": SYNTHETIC_LEAD["zone"],
                },
                "source": SYNTHETIC_LEAD["source"],
                "trigger": SYNTHETIC_LEAD["trigger"],
                "zone": SYNTHETIC_LEAD["zone"],
                "is_synthetic": True,
            }
            async with httpx.AsyncClient(timeout=TEST_TIMEOUT) as client:
                resp = await client.post(
                    f"{self.ai_service_url}/classify-lead",
                    json=payload,
                )
                resp.raise_for_status()
                data = resp.json()

                icp_slug = data.get("icp_slug")
                if icp_slug and icp_slug != "error":
                    return CollectorResult(
                        collector_name="synthetic_classify_lead",
                        success=True,
                        data={"is_synthetic": True, "icp_slug": icp_slug, **data},
                    )
                else:
                    return CollectorResult(
                        collector_name="synthetic_classify_lead",
                        success=False,
                        error=f"Invalid icp_slug: {icp_slug}",
                        data={"is_synthetic": True, "response": data},
                    )
        except Exception as exc:
            logger.error("Synthetic test CLASSIFY_LEAD failed: %s", exc)
            return CollectorResult(
                collector_name="synthetic_classify_lead",
                success=False,
                error=str(exc),
                data={"is_synthetic": True},
            )

    async def test_generate_email(self, icp_slug: str) -> CollectorResult:
        """TEST 4: POST /generate-valentin-email → verify subject_line, length < 56, cta_url contains wa.me"""
        try:
            payload = {
                "first_name": SYNTHETIC_LEAD["name"],
                "zone": SYNTHETIC_LEAD["zone"],
                "icp_slug": icp_slug,
                "intent_signal": "synthetic_test",
                "primary_product": "Seguro de Salud",
                "sequence_step": 1,
                "sequence_total": 3,
                "is_synthetic": True,
            }
            async with httpx.AsyncClient(timeout=TEST_TIMEOUT) as client:
                resp = await client.post(
                    f"{self.ai_service_url}/generate-valentin-email",
                    json=payload,
                )
                resp.raise_for_status()
                data = resp.json()

                subject_line = data.get("subject_line", "")
                cta_url = data.get("cta_url", "")

                errors = []
                if not subject_line:
                    errors.append("Missing subject_line")
                if len(subject_line) >= 56:
                    errors.append(f"subject_line too long: {len(subject_line)} chars (max 55)")
                if "wa.me" not in cta_url:
                    errors.append(f"cta_url missing wa.me: {cta_url}")

                if not errors:
                    return CollectorResult(
                        collector_name="synthetic_generate_email",
                        success=True,
                        data={
                            "is_synthetic": True,
                            "subject_line": subject_line,
                            "subject_length": len(subject_line),
                            "cta_url": cta_url,
                            **data,
                        },
                    )
                else:
                    return CollectorResult(
                        collector_name="synthetic_generate_email",
                        success=False,
                        error="; ".join(errors),
                        data={"is_synthetic": True, "response": data},
                    )
        except Exception as exc:
            logger.error("Synthetic test GENERATE_EMAIL failed: %s", exc)
            return CollectorResult(
                collector_name="synthetic_generate_email",
                success=False,
                error=str(exc),
                data={"is_synthetic": True},
            )

    async def test_evaluate_email(self, email_data: dict[str, Any]) -> CollectorResult:
        """TEST 5: POST /evaluate-valentin-email → expect total_score > 0"""
        try:
            payload = {
                "subject_line": email_data.get("subject_line", ""),
                "body_text": email_data.get("body_text", ""),
                "first_name": SYNTHETIC_LEAD["name"],
                "zone": SYNTHETIC_LEAD["zone"],
                "icp_slug": email_data.get("icp_slug", "salud-madrid"),
                "primary_product": "Seguro de Salud",
                "sequence_step": 1,
                "framework_used": email_data.get("framework_used", ""),
                "cta_text": email_data.get("cta_text", ""),
                "cta_url": email_data.get("cta_url", ""),
                "word_count": email_data.get("word_count", 0),
                "is_synthetic": True,
            }
            async with httpx.AsyncClient(timeout=TEST_TIMEOUT) as client:
                resp = await client.post(
                    f"{self.ai_service_url}/evaluate-valentin-email",
                    json=payload,
                )
                resp.raise_for_status()
                data = resp.json()

                total_score = data.get("total_score", 0)
                if total_score > 0:
                    return CollectorResult(
                        collector_name="synthetic_evaluate_email",
                        success=True,
                        data={"is_synthetic": True, "total_score": total_score, **data},
                    )
                else:
                    return CollectorResult(
                        collector_name="synthetic_evaluate_email",
                        success=False,
                        error=f"total_score is 0 or negative: {total_score}",
                        data={"is_synthetic": True, "response": data},
                    )
        except Exception as exc:
            logger.error("Synthetic test EVALUATE_EMAIL failed: %s", exc)
            return CollectorResult(
                collector_name="synthetic_evaluate_email",
                success=False,
                error=str(exc),
                data={"is_synthetic": True},
            )

    @staticmethod
    def result_to_incident(result: CollectorResult) -> IncidentEvent | None:
        """Convert a failed synthetic test result to an IncidentEvent."""
        if result.success:
            return None

        return IncidentEvent(
            incident_type="synthetic_test_failure",
            service="ai-service",
            severity=Severity.high,
            error_data={
                "test": result.collector_name,
                "error": result.error,
                "data": result.data,
            },
            recent_context={"is_synthetic": True},
        )
