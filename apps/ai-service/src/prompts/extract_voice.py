"""Prompt builder for brand voice extraction."""


def build_extract_voice_prompt(
    sample_emails: list[str],
    business_description: str,
) -> list[dict[str, str]]:
    """Build the prompt messages for brand voice extraction.
    
    Args:
        sample_emails: List of sample emails written in the brand's voice
        business_description: Description of the business and target audience
    
    Returns:
        List of message dicts for the LLM
    """
    # Build sample emails text
    samples_text = ""
    if sample_emails:
        for i, email in enumerate(sample_emails[:10], 1):  # Limit to 10 samples
            samples_text += f"\n\n--- EMAIL SAMPLE {i} ---\n{email[:2000]}"  # Truncate long emails
    else:
        samples_text = "No sample emails provided. Use business description only."

    system_message = """Eres un lingüista computacional especializado en análisis de voz de marca. Extraes patrones de comunicación a partir de muestras de texto.

TU TAREA: Analizar emails de muestra y extraer:
1. Tone: El tono emocional predominante (ej: "Profesional pero cercano", "Autoritario experto", "Casual amigable")
2. Style: El estilo de escritura (ej: "Conversacional con frases cortas", "Formal con estructura académica")
3. Vocabulary preferred: Palabras y frases que la marca usa frecuentemente y positivamente
4. Vocabulary avoided: Palabras, frases o jergas que la marca evita intencionalmente
5. Avg length: Longitud promedio de emails en palabras
6. CTA patterns: Patrones recurrentes en llamadas a la acción

ADAPTA el análisis considerando:
- El sector del negocio
- La audiencia objetivo
- El posicionamiento deseado"""

    user_message = f"""Analiza la voz de marca de este negocio:

DESCRIPCIÓN DEL NEGOCIO:
{business_description}

EMAILS DE MUESTRA:
{samples_text}

Extrae y devuelve en formato JSON:
{{
  "tone": "descripción del tono en 3-5 palabras",
  "style": "descripción del estilo en una oración",
  "vocabulary_preferred": ["palabra1", "palabra2", "frase característica 1", "... hasta 10 items"],
  "vocabulary_avoided": ["palabra evitada 1", "jerga no usada", "... hasta 10 items"],
  "avg_length": 145,
  "cta_patterns": ["Patrón CTA 1", "Patrón CTA 2", "... hasta 5 items"],
  "additional_notes": "cualquier observación relevante sobre la voz de marca"
}}"""

    return [
        {"role": "system", "content": system_message},
        {"role": "user", "content": user_message},
    ]
