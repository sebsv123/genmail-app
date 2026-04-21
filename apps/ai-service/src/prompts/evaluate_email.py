"""Prompt builder for email evaluation."""


def build_evaluate_email_prompt(
    subject: str,
    body_text: str,
    memory_summary: dict,
    brand_voice: str,
    prohibited_claims: list[str],
) -> list[dict[str, str]]:
    """Build the prompt messages for email evaluation.
    
    Args:
        subject: The email subject line
        body_text: The email body in plain text
        memory_summary: Dict with topics_used, hooks_used, ctas_used
        brand_voice: The brand voice description
        prohibited_claims: List of prohibited claims to check
    
    Returns:
        List of message dicts for the LLM
    """
    # Build memory context
    memory_text = f"""HISTORIAL ANTI-REPETICIÓN:
- Topics previos: {', '.join(memory_summary.get('topics_used', [])) or 'Ninguno'}
- Hooks previos: {', '.join(memory_summary.get('hooks_used', [])) or 'Ninguno'}
- CTAs previos: {', '.join(memory_summary.get('ctas_used', [])) or 'Ninguno'}

VERIFICACIÓN: El email no debe repetir temas, hooks o CTAs ya utilizados."""

    # Prohibited claims check
    prohibited_text = f"""CLAIMS PROHIBIDOS A VERIFICAR:
{chr(10).join(f'- {claim}' for claim in prohibited_claims) if prohibited_claims else 'Sin claims prohibidos específicos.'}

REGLA: Si el email contiene algún claim prohibido (o similar), marca como crítico."""

    system_message = """Eres un editor sénior de email marketing con 15 años de experiencia. Evalúas emails con criterios estrictos de conversión, cumplimiento y calidad.

SISTEMA DE PUNTUACIÓN (0-1):
- 0.9-1.0: Excelente, listo para enviar
- 0.8-0.89: Bueno, aceptable con ajustes menores
- 0.7-0.79: Regular, necesita mejoras significativas
- <0.7: No aprobado, requiere reescritura

CRITERIOS DE EVALUACIÓN:
1. Alineación con Brand Voice (20%): ¿Suena como la marca?
2. Claridad del mensaje (20%): ¿Entiende el lead qué hacer?
3. Fuerza del CTA (15%): ¿Es específico, atractivo, sin fricción?
4. Originalidad (15%): ¿No repite contenido previo?
5. Spam Score (15%): ¿Evita triggers de spam?
6. Cumplimiento (15%): ¿Sin claims prohibidos?

REGLAS DE APROBACIÓN:
- APROBADO: score >= 0.8, cero issues críticos, cero claims prohibidos
- RECHAZADO: score < 0.7, o issues críticos, o claims prohibidos detectados"""

    user_message = f"""Evalúa este email:

ASUNTO:
{subject}

BODY:
{body_text}

VOZ DE MARCA DE REFERENCIA:
{brand_voice}

{memory_text}

{prohibited_text}

Responde en JSON con esta estructura:
{{
  "score": 0.87,
  "issues": ["lista de problemas identificados (vacío si ninguno)"],
  "suggestions": ["mejoras concretas sugeridas"],
  "approved": true,
  "breakdown": {{
    "brand_alignment": 0.90,
    "message_clarity": 0.85,
    "cta_strength": 0.88,
    "originality": 0.82,
    "spam_score": 0.95,
    "compliance": 1.0
  }}
}}"""

    return [
        {"role": "system", "content": system_message},
        {"role": "user", "content": user_message},
    ]
