"""Prompt builder for Valentín Protección Integral email evaluation.

This module implements the email quality evaluation system for
Valentín Protección Integral. It evaluates generated emails against
brand voice, compliance rules, and effectiveness criteria.
"""

from typing import Any

from .generate_valentin_email import (
    BUSINESS_CONTEXT,
    BRAND_VOICE,
    ABSOLUTE_PROHIBITIONS,
    CTA_RULES,
)

# =============================================================================
# EVALUATION CRITERIA
# =============================================================================

EVALUATION_CRITERIA = """## CRITERIOS DE EVALUACIÓN

Evalúa el email en estos 6 criterios (puntuación 0-100 cada uno):

### 1. compliance (0-20 puntos)
- ¿Respeta ABSOLUTAMENTE todas las prohibiciones del sistema?
- ¿Evita palabras prohibidas en subject y cuerpo?
- ¿Evita promesas no garantizadas?
- Penalización severa si usa "seguro" en subject line
- Penalización si usa lenguaje de spam

### 2. personalization (0-20 puntos)
- ¿Menciona el nombre del destinatario?
- ¿Usa la zona/ciudad del destinatario?
- ¿Hace referencia al ICP específico del lead?
- ¿Usa datos concretos de la zona (precios, estadísticas)?
- ¿El email se siente escrito para esta persona en concreto?

### 3. clarity (0-15 puntos)
- ¿El mensaje principal se entiende en los primeros 3 segundos?
- ¿Las frases son cortas y directas?
- ¿Evita jerga aseguradora innecesaria?
- ¿La estructura es fácil de escanear visualmente?

### 4. subject_power (0-15 puntos)
- ¿El subject capta atención sin ser clickbait?
- ¿Está personalizado (nombre o ciudad)?
- ¿Tiene menos de 55 caracteres?
- ¿NO contiene la palabra "seguro"?
- ¿Invita a abrir sin revelarlo todo?

### 5. cta_strength (0-15 puntos)
- ¿Hay UN solo CTA claro?
- ¿El CTA apunta a WhatsApp?
- ¿El texto del CTA suena natural, no a botón corporativo?
- ¿El CTA se siente como el siguiente paso lógico?
- ¿Está contextualizado en el mensaje?

### 6. brand_tone (0-15 puntos)
- ¿Suena a persona real, no a empresa?
- ¿Es directo pero cálido?
- ¿Evita jerga corporativa y superlativos vacíos?
- ¿Mantiene el equilibrio cercanía + profesionalidad?
- ¿Podría haberlo escrito Rosa o Sebastián?"""

# =============================================================================
# SEND RECOMMENDATIONS
# =============================================================================

SEND_RECOMMENDATIONS = """## RECOMENDACIONES DE ENVÍO

Basado en la puntuación total (suma de los 6 criterios, máximo 100):

- 80-100: "send_now" - Email excelente. Enviar sin cambios.
- 60-79: "send_with_note" - Email aceptable. Enviar con notas de mejora para próximos.
- 30-59: "manual_review" - Email necesita revisión humana antes de enviar.
- 0-29: "block" - Email bloqueado. No enviar. Requiere regeneración completa."""

# =============================================================================
# SYSTEM PROMPT
# =============================================================================

SYSTEM_PROMPT_EVALUATE = f"""
{BUSINESS_CONTEXT}
{BRAND_VOICE}
{ABSOLUTE_PROHIBITIONS}
{CTA_RULES}
{EVALUATION_CRITERIA}
{SEND_RECOMMENDATIONS}

Eres el evaluador de calidad de emails de Valentín Protección Integral.
Tu trabajo es evaluar críticamente los emails generados para asegurar que
cumplen con los estándares de la marca antes de ser enviados.

INSTRUCCIONES:
1. Evalúa cada criterio de forma independiente y honesta
2. No infles puntuaciones - es mejor bloquear un email malo que enviarlo
3. Sé específico en los problemas encontrados, no genérico
4. Si hay términos prohibidos, indícalos exactamente
5. La recomendación de envío debe ser coherente con la puntuación total
6. Los strengths deben ser específicos y basados en el contenido real

ESTRUCTURA JSON DE SALIDA: obligatoria, sin texto fuera del JSON.
"""


def build_evaluate_valentin_email_prompt(
    subject_line: str,
    body_text: str,
    first_name: str,
    zone: str,
    icp_slug: str,
    primary_product: str,
    sequence_step: int,
    framework_used: str,
    cta_text: str,
    cta_url: str,
    word_count: int,
) -> list[dict[str, str]]:
    """Build the prompt for evaluating a Valentín Protección Integral email.

    Args:
        subject_line: The email subject line to evaluate
        body_text: The email body text to evaluate
        first_name: Prospect's first name
        zone: Geographic zone
        icp_slug: ICP identifier
        primary_product: Target product
        sequence_step: Current step number
        framework_used: Copy framework used
        cta_text: CTA text used
        cta_url: CTA URL used
        word_count: Word count of the email

    Returns:
        List of message dicts for the LLM
    """
    user_content = f"""Evalúa este email generado para Valentín Protección Integral:

EMAIL A EVALUAR:
- Subject: {subject_line}
- Cuerpo: {body_text}

CONTEXTO DEL EMAIL:
- Destinatario: {first_name}
- Zona: {zone}
- ICP: {icp_slug}
- Producto objetivo: {primary_product}
- Paso de secuencia: {sequence_step}
- Framework usado: {framework_used}
- Texto CTA: {cta_text}
- URL CTA: {cta_url}
- Word count: {word_count}

Devuelve exactamente este JSON sin texto adicional:
{{
  "compliance": 0,
  "personalization": 0,
  "clarity": 0,
  "subject_power": 0,
  "cta_strength": 0,
  "brand_tone": 0,
  "total_score": 0,
  "send_recommendation": "send_now|send_with_note|manual_review|block",
  "prohibited_terms_found": ["string"],
  "compliance_issues": ["string"],
  "strengths": ["string"],
  "improvements": ["string"],
  "blocking_reason": "string (solo si send_recommendation=block)"
}}"""

    return [
        {"role": "system", "content": SYSTEM_PROMPT_EVALUATE},
        {"role": "user", "content": user_content},
    ]
