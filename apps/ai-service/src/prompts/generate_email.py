"""Prompt builder for email generation."""

from typing import Literal

CopyFramework = Literal["AIDA", "PAS", "BAB", "STR", "PASTOR"]

COPY_FRAMEWORK_DESCRIPTIONS: dict[CopyFramework, str] = {
    "AIDA": """AIDA (Attention, Interest, Desire, Action):
- Attention: Hook inmediato con dato impactante o pregunta provocadora
- Interest: Conectar el problema con la experiencia del lector
- Desire: Mostrar el beneficio transformacional (no features, outcomes)
- Action: CTA claro, específico y con urgencia sutil""",
    
    "PAS": """PAS (Problem, Agitate, Solution):
- Problem: Identificar el dolor específico que resuelves
- Agitate: Amplificar las consecuencias de no resolverlo (con empatía)
- Solution: Presentar tu solución como el camino evidente
- CTA: Llamada a la acción que reduce fricción""",
    
    "BAB": """BAB (Before, After, Bridge):
- Before: Describir la realidad actual frustrante (que el lead vive)
- After: Pintar el escenario ideal posible (aspiracional pero creíble)
- Bridge: Tu solución como el vehículo para cruzar (evidencia social)
- CTA: Próximo paso concreto hacia el After""",
    
    "STR": """STR (Star, Story, Solution):
- Star: Cliente destacado o caso de éxito como protagonista
- Story: Narrativa del viaje (desde el problema hasta la victoria)
- Solution: Tu producto/servicio como elemento clave del éxito
- CTA: Invitación a replicar esa historia""",
    
    "PASTOR": """PASTOR (Problem, Amplify, Story, Testimony, Offer, Response):
- Problem: El dolor central del lead
- Amplify: Consecuencias de no actuar (con empatía)
- Story: Tu propia historia o la de un cliente similar
- Testimony: Prueba social específica y verificable
- Offer: Presentación de tu solución con valor único
- Response: CTA claro con reducción de riesgo""",
}


def select_copy_framework(goal: str, sequence_mode: str) -> CopyFramework:
    """Select the best copy framework based on goal and sequence mode.
    
    Args:
        goal: The step goal (e.g., "education", "conversion", "trust")
        sequence_mode: "evergreen" or "nurturing_infinite"
    
    Returns:
        The recommended copy framework
    """
    goal_lower = goal.lower()
    
    # Map goals to frameworks
    if any(word in goal_lower for word in ["agit", "dolor", "problema", "pain"]):
        return "PAS"
    
    if any(word in goal_lower for word in ["transform", "cambiar", "before", "after", "antes", "después"]):
        return "BAB"
    
    if any(word in goal_lower for word in ["historia", "story", "caso", "case study", "ejemplo"]):
        return "STR"
    
    if any(word in goal_lower for word in ["confianza", "trust", "credibilidad", "testimonio", "prueba"]):
        return "PASTOR"
    
    # Default: AIDA works for most situations
    return "AIDA"


def build_generate_email_prompt(
    business_id: str,
    brand_voice: str,
    lead_profile: dict,
    sequence_mode: str,
    step_goal: str,
    memory_summary: dict,
    relevant_sources: list[dict],
    constraints: dict,
    copy_framework: CopyFramework,
) -> list[dict[str, str]]:
    """Build the prompt messages for email generation.
    
    Args:
        business_id: The business/tenant ID
        brand_voice: Description of brand tone, style, vocabulary
        lead_profile: Dict with email, name, stage, context_data, intent_score
        sequence_mode: "evergreen" or "nurturing_infinite"
        step_goal: The specific goal for this email step
        memory_summary: Dict with topics_used, hooks_used, ctas_used
        relevant_sources: List of knowledge sources with content and URLs
        constraints: Dict with max_words, language, prohibited_claims, cta_type
        copy_framework: The copy framework to use
    
    Returns:
        List of message dicts for the LLM
    """
    # Extract lead info
    lead_name = lead_profile.get("name", "there")
    lead_stage = lead_profile.get("stage", "unknown")
    lead_context = lead_profile.get("context_data", {})
    intent_score = lead_profile.get("intent_score")
    
    # Build sources context
    sources_text = ""
    if relevant_sources:
        sources_parts = []
        for i, source in enumerate(relevant_sources[:5], 1):  # Limit to top 5
            content = source.get("content", "")[:500]  # Truncate long content
            url = source.get("source_url", "")
            sources_parts.append(f"[Fuente {i}]: {content}\nURL: {url}")
        sources_text = "\n\n".join(sources_parts)
    else:
        sources_text = "No hay fuentes de conocimiento relevantes disponibles. Usa el brand voice proporcionado."
    
    # Build memory anti-repetition context
    memory_text = f"""MEMORIA ANTI-REPETICIÓN (evita estos elementos usados previamente):
- Topics ya utilizados: {', '.join(memory_summary.get('topics_used', [])) or 'Ninguno aún'}
- Hooks ya utilizados: {', '.join(memory_summary.get('hooks_used', [])) or 'Ninguno aún'}
- CTAs ya utilizados: {', '.join(memory_summary.get('ctas_used', [])) or 'Ninguno aún'}

INSTRUCCIÓN CRÍTICA: Varía el enfoque, usa un hook diferente, y no repitas claims. El lead no debe sentir que lee lo mismo."""
    
    # Framework description
    framework_desc = COPY_FRAMEWORK_DESCRIPTIONS.get(copy_framework, COPY_FRAMEWORK_DESCRIPTIONS["AIDA"])
    
    # Prohibited claims
    prohibited = constraints.get("prohibited_claims", [])
    prohibited_text = f"CLAIMS PROHIBIDOS (NUNCA usar): {', '.join(prohibited)}" if prohibited else "Sin claims prohibidos específicos."
    
    system_message = f"""Eres un copywriter experto en email marketing B2B, especializado en emails que convierten leads fríos en oportunidades calificadas.

VOZ DE MARCA (adopta esta personalidad exacta):
{brand_voice}

FRAMEWORK DE COPY A APLICAR: {copy_framework}

{framework_desc}

REGLAS DE ORO:
1. Personalización profunda: Usa el contexto del lead (rol, empresa, intereses) para hacer el email sentir escrito específicamente para él
2. Un solo CTA: Un único llamado a la acción claro. No confundas al lector
3. Mobile-first: Preview text debe ser autoportante. Asunto debe funcionar en 40 caracteres
4. Evita spam triggers: No uses "gratis", "urgente", "oferta limitada", TODO EN MAYÚSCULAS, o múltiples signos de exclamación!!!
5. Credibilidad sin arrogancia: Datos concretos, no superlativos vacíos
6. Longitud óptima: Entre 80-150 palabras para el body. Cada oración debe ganar su lugar
7. Transiciones suaves: Cada párrafo debe fluer lógicamente al siguiente

{prohibited_text}"""

    user_message = f"""Genera un email para este lead:

PERFIL DEL LEAD:
- Nombre: {lead_name}
- Etapa: {lead_stage}
- Contexto: {lead_context}
- Score de intención: {intent_score or 'Desconocido'}/100

MODO DE SECUENCIA: {sequence_mode}
OBJETIVO DE ESTE PASO: {step_goal}

FUENTES DE CONOCIMIENTO RELEVANTES:
{sources_text}

{memory_text}

RESTRICCIONES:
- Máximo {constraints.get('max_words', 150)} palabras
- Idioma: {constraints.get('language', 'es-ES')}
- Tipo de CTA: {constraints.get('cta_type', 'Reservar demo')}

Responde en formato JSON con esta estructura exacta:
{{
  "subject": "Asunto atractivo (máx 60 chars)",
  "preview_text": "Texto preview (máx 100 chars, no repitas el asunto)",
  "body_html": "Email completo en HTML con tags básicos (<p>, <a>, <strong>)",
  "body_text": "Versión texto plano del email",
  "copy_framework_used": "{copy_framework}",
  "rationale": "Explicación de por qué funcionará este email",
  "used_sources": ["nombres de fuentes utilizadas"],
  "quality_score": 0.85
}}"""

    return [
        {"role": "system", "content": system_message},
        {"role": "user", "content": user_message},
    ]
