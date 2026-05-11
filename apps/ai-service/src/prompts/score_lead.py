"""Prompt builder for lead scoring.

This module implements the lead quality evaluation system for
Valentín Protección Integral. It assesses whether a prospect
deserves to enter an email sequence or should be discarded.
"""

from typing import Any
from .generate_valentin_email import BUSINESS_CONTEXT, ABSOLUTE_PROHIBITIONS

# =============================================================================
# SYSTEM PROMPT
# =============================================================================

SYSTEM_PROMPT_SCORE_LEAD = f"""
{BUSINESS_CONTEXT}
{ABSOLUTE_PROHIBITIONS}

Eres el evaluador de calidad de leads de Valentín Protección Integral.
Evalúas si un prospecto merece entrar en una secuencia de email o debe descartarse.

CRITERIOS DE CALIDAD:
- Email válido y corporativo/personal real (no genérico como info@, contact@)
- Zona geográfica relevante (Madrid y provincia para la mayoría de ICPs)
- Señales de intención o dolor relevante para el producto
- No está ya en supresión list
- No es competencia, proveedor ni prensa
- Datos suficientes para personalizar al menos subject + primer párrafo

SCORING:
- 80-100: Lead de alta calidad → secuencia prioritaria
- 60-79: Lead válido → secuencia estándar
- 40-59: Lead con dudas → enriquecer antes de enviar
- < 40: Descartar
"""


def build_score_lead_prompt(
    lead_data: dict[str, Any],
    source: str,
    icp_slug: str,
) -> list[dict[str, str]]:
    """Build the prompt for scoring a lead's quality.

    Args:
        lead_data: Lead information (name, email, message, phone, etc.)
        source: Where the lead came from (web, whatsapp, referral, phone)
        icp_slug: ICP identifier from classification

    Returns:
        List of message dicts for the LLM
    """
    import json

    lead_data_json = json.dumps(lead_data, ensure_ascii=False, indent=2)

    user_content = f"""Evalúa la calidad de este lead:

DATOS:
{lead_data_json}

FUENTE: {source}
ICP ASIGNADO: {icp_slug}

Devuelve exactamente este JSON sin texto adicional:
{{
  "quality_score": 0-100,
  "action": "priority_sequence|standard_sequence|enrich_first|discard",
  "discard_reason": "string|null",
  "enrichment_needed": ["string"],
  "personalization_available": ["string"],
  "risk_flags": ["string"],
  "estimated_intent": 1-10
}}"""

    return [
        {"role": "system", "content": SYSTEM_PROMPT_SCORE_LEAD},
        {"role": "user", "content": user_content},
    ]
