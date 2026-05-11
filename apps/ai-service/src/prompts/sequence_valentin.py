"""Prompt builder for Valentín Protección Integral email sequence design.

This module implements the sequence design system for
Valentín Protección Integral, an insurance agency in Boadilla del Monte, Madrid.
It designs 3-5 email sequences with timing progression and content strategy.
"""

from typing import Any

from .generate_valentin_email import (
    BUSINESS_CONTEXT,
    BRAND_VOICE,
    ABSOLUTE_PROHIBITIONS,
    CTA_RULES,
)

# =============================================================================
# SYSTEM PROMPT
# =============================================================================

SYSTEM_PROMPT_SEQUENCE = f"""
{BUSINESS_CONTEXT}
{BRAND_VOICE}
{ABSOLUTE_PROHIBITIONS}
{CTA_RULES}

Eres el estratega de secuencias de email de Valentín Protección Integral.
Diseñas secuencias de 3-5 emails que acompañan al prospecto hasta la conversión.

PRINCIPIOS DE SECUENCIA:
- Cada email tiene una sola misión (no repetir lo del anterior)
- Timing: día 1, 3, 7, 14, 21 para cold. Día 1, 4, 10 para urgencia.
- Progresión: Hook → Valor → Social proof → Objeción → Cierre suave
- El email 2 en adelante SIEMPRE referencia brevemente el email anterior
- El último email: cierre suave, no agresivo. "Última vez que te escribo... a menos que quieras hablar"
- Si en cualquier punto responden, DETENER secuencia y notificar a Rosa/Sebastián

ESCALADA DE URGENCIA: aumenta ligeramente de email a email, nunca presión agresiva.
"""


def build_valentin_sequence_prompt(
    icp_slug: str,
    first_name: str,
    zone: str,
    primary_product: str,
    trigger: str,
    urgency_level: str,
) -> list[dict[str, str]]:
    """Build the prompt for designing a Valentín Protección Integral email sequence.

    Args:
        icp_slug: ICP identifier from classification
        first_name: Prospect's first name
        zone: Geographic zone (e.g., "Boadilla del Monte")
        primary_product: Target product
        trigger: What triggered the contact (form, call, message, newsletter)
        urgency_level: Urgency level (baja, media, alta)

    Returns:
        List of message dicts for the LLM
    """
    user_content = f"""Diseña una secuencia para:

ICP: {icp_slug}
NOMBRE PROSPECTO: {first_name}
ZONA: {zone}
PRODUCTO PRINCIPAL: {primary_product}
TRIGGER DE CAPTACIÓN: {trigger}
URGENCIA: {urgency_level}

Devuelve exactamente este JSON sin texto adicional:
{{
  "sequence_name": "string",
  "icp_slug": "string",
  "total_emails": 3-5,
  "emails": [
    {{
      "step": 1,
      "send_day": 0,
      "mission": "string (qué tiene que lograr este email)",
      "framework": "string",
      "subject_line": "string",
      "subject_line_alt": "string",
      "preview_text": "string",
      "body_text": "string",
      "cta_text": "string",
      "word_count": 0,
      "urgency_level": "low|medium|high"
    }}
  ],
  "stop_triggers": ["respuesta positiva", "reply any", "clic en CTA"],
  "estimated_reply_rate": "X%",
  "best_send_times": ["martes 10:00", "jueves 10:00"]
}}"""

    return [
        {"role": "system", "content": SYSTEM_PROMPT_SEQUENCE},
        {"role": "user", "content": user_content},
    ]
