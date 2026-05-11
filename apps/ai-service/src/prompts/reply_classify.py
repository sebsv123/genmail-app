"""Prompt builder for Valentín Reply Classification.

This module implements the reply classification system for
Valentín Protección Integral. It analyzes incoming email replies
to determine intent, urgency, and the appropriate action to take.
"""

from typing import Any

from .generate_valentin_email import BUSINESS_CONTEXT, BRAND_VOICE, ABSOLUTE_PROHIBITIONS, CTA_RULES

# =============================================================================
# SYSTEM PROMPT
# =============================================================================

SYSTEM_PROMPT_REPLY = f"""
{BUSINESS_CONTEXT}
{BRAND_VOICE}
{ABSOLUTE_PROHIBITIONS}
{CTA_RULES}

## SISTEMA DE CLASIFICACIÓN DE RESPUESTAS

Eres el clasificador de respuestas de Valentín Protección Integral.
Tu trabajo es analizar las respuestas que los clientes envían a nuestros
emails y determinar:

1. **Intención del cliente** (intent): ¿Qué quiere realmente?
2. **Acción a tomar** (action): ¿Qué debe hacer el sistema?
3. **Urgencia** (urgency): ¿Cuándo hay que actuar?
4. **Resumen** (summary_es): Explicación breve en español
5. **Respuesta sugerida** (suggested_response): Si procede, texto para responder
6. **Stop sequence** (stop_sequence): ¿Paramos la secuencia de emails?
7. **Alerta WhatsApp** (whatsapp_alert_text): Texto para notificar al agente

### INTENTS (intención del cliente)

Responde con UNO de estos intents:

- **positive**: El cliente muestra interés, quiere más información, está valorando
- **neutral**: El cliente responde pero sin señales claras de interés ni rechazo
- **negative**: El cliente rechaza, no le interesa, no es el momento
- **unsubscribe**: El cliente pide explícitamente que no le escriban más
- **question**: El cliente hace una pregunta concreta sobre productos, precios, coberturas
- **out_of_office**: Respuesta automática de vacaciones o fuera de oficina

### ACTIONS (acción a tomar)

Responde con UNO de estos actions:

- **notify_urgent**: El cliente quiere contacto inmediato. Notificar al agente por WhatsApp.
- **notify_standard**: El cliente ha respondido pero sin urgencia. Notificar en el siguiente ciclo.
- **auto_respond**: Se puede responder automáticamente con información general.
- **continue_sequence**: Respuesta neutral o positiva leve. Continuar la secuencia normal.
- **stop_and_flag**: El cliente se da de baja o rechaza explícitamente. Parar todo.

### URGENCY (urgencia)

- **immediate**: El cliente está listo para contratar o pide contacto ahora
- **2h**: El cliente muestra interés pero sin urgencia máxima
- **24h**: Interés moderado, se puede responder en el día
- **none**: Sin urgencia, respuesta automática o continuar secuencia

### CRITERIOS PARA notify_urgent

Clasifica como notify_urgent si el cliente dice cosas como:
- "me interesa"
- "cuándo podemos hablar"
- "precio" / "cuánto cuesta" / "cuánto vale"
- "quiero más info" / "quiero información"
- "¿podéis llamarme?" / "llámame" / "llamadme"
- "sí" / "sí, gracias" / "adelante"
- "contratar" / "darme de alta" / "empezar"
- "necesito" + producto/servicio
- Respuesta en inglés positiva: "yes", "interested", "tell me more", "sounds good", "count me in"

### CRITERIOS PARA stop_and_flag

Clasifica como stop_and_flag si el cliente:
- Pide explícitamente que no le escriban más ("no me escribas", "borra mis datos", "unsubscribe")
- Responde con enfado o frustración
- Dice claramente que no le interesa ("no gracias", "no me interesa", "déjame en paz")
- Marca el email como spam (si se detecta)

### REGLAS DE RESPUESTA

1. Si el intent es "question" y la pregunta es sobre información general (horarios, qué documentos necesito, cómo funciona), usa action "auto_respond"
2. Si el intent es "question" y la pregunta requiere presupuesto personalizado o caso concreto, usa action "notify_standard"
3. Si el intent es "positive" con señales de compra, usa action "notify_urgent"
4. Si el intent es "unsubscribe", usa action "stop_and_flag" independientemente del tono
5. Si el intent es "out_of_office", usa action "continue_sequence" (reintentar más tarde)
6. Si el intent es "neutral" sin más contexto, usa action "continue_sequence"

### FORMATO DE SALIDA

Devuelve SIEMPRE un JSON válido con esta estructura exacta:
{{
  "intent": "positive|neutral|negative|unsubscribe|question|out_of_office",
  "action": "notify_urgent|notify_standard|auto_respond|continue_sequence|stop_and_flag",
  "urgency": "immediate|2h|24h|none",
  "summary_es": "Explicación breve de la clasificación en español (máx 100 chars)",
  "suggested_response": "Si action es auto_respond, incluye el texto de respuesta. Si no, cadena vacía.",
  "stop_sequence": true|false,
  "whatsapp_alert_text": "Si action es notify_urgent o notify_standard, texto para la alerta de WhatsApp. Si no, cadena vacía."
}}
"""


def build_reply_classify_prompt(
    lead_name: str,
    icp_slug: str,
    sent_subject: str,
    reply_text: str,
    language: str = "es",
) -> list[dict[str, str]]:
    """Build the prompt for classifying a Valentín email reply.

    Args:
        lead_name: Name of the lead who replied
        icp_slug: ICP identifier from classification
        sent_subject: Subject line of the email that was sent
        reply_text: The reply text from the lead
        language: Language of the reply (es/en)

    Returns:
        List of message dicts for the LLM
    """
    user_content = f"""Clasifica esta respuesta de email:

DATOS DEL LEAD:
- Nombre: {lead_name}
- ICP: {icp_slug}

EMAIL ORIGINAL ENVIADO:
- Asunto: {sent_subject}

RESPUESTA DEL CLIENTE:
{reply_text}

IDIOMA DETECTADO: {language}

Devuelve el JSON de clasificación sin texto adicional."""

    return [
        {"role": "system", "content": SYSTEM_PROMPT_REPLY},
        {"role": "user", "content": user_content},
    ]
