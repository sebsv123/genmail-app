"""Prompt builder for cold email generation."""

from typing import Literal

def build_generate_cold_email_prompt(
    business_id: str,
    brand_voice: str,
    prospect: dict,
    icp: dict,
    step_number: int,
    constraints: dict,
) -> list[dict[str, str]]:
    """Build prompt for cold email generation.
    
    Args:
        business_id: Business/tenant ID
        brand_voice: Brand voice description
        prospect: Prospect profile (email, first_name, last_name, company_name, etc.)
        icp: Ideal Customer Profile (sector, target_role, pain_points, keywords)
        step_number: Email step (1, 2, or 3)
        constraints: Generation constraints (max_words, language, prohibited_claims)
    
    Returns:
        List of message dicts for LLM
    """
    
    max_words = constraints.get("max_words", 120)
    language = constraints.get("language", "es-ES")
    prohibited_claims = constraints.get("prohibited_claims", [])
    
    # Determine tone based on step
    step_tones = {
        1: "Soft intro - warm, curious, non-salesy. Just making contact.",
        2: "Value-focused - share relevant insight or case study.",
        3: "Direct CTA - clear ask, respect their time.",
    }
    
    step_frameworks = {
        1: "PAS-light (Problem-Agitate-Solution but very soft)",
        2: "BAB (Before-After-Bridge) with case study",
        3: "AIDA (Attention-Interest-Desire-Action) with strong CTA",
    }
    
    tone = step_tones.get(step_number, step_tones[1])
    framework = step_frameworks.get(step_number, step_frameworks[1])
    
    # Build personalization context
    personalization_lines = []
    if prospect.get("first_name"):
        personalization_lines.append(f"- First name: {prospect['first_name']}")
    if prospect.get("company_name"):
        personalization_lines.append(f"- Company: {prospect['company_name']}")
    if prospect.get("role"):
        personalization_lines.append(f"- Role: {prospect['role']}")
    if prospect.get("company_website"):
        personalization_lines.append(f"- Website: {prospect['company_website']}")
    if icp.get("sector"):
        personalization_lines.append(f"- Sector: {icp['sector']}")
    if icp.get("pain_points"):
        personalization_lines.append(f"- Pain points: {', '.join(icp['pain_points'])}")
    
    personalization_context = "\n".join(personalization_lines) if personalization_lines else "- No personal data available"
    
    # Build keywords for hook
    keywords = icp.get("keywords", [])
    keywords_context = f"Keywords to reference naturally: {', '.join(keywords)}" if keywords else ""
    
    prohibited_context = ""
    if prohibited_claims:
        prohibited_context = f"\n\n**PROHIBITED CLAIMS (NEVER USE):**\n" + "\n".join([f"- {c}" for c in prohibited_claims])
    
    system_message = f"""You are an expert cold email copywriter specializing in personalized outreach that feels human and individual.

**BRAND VOICE:**
{brand_voice}

**CRITICAL RULES:**
1. Write like ONE human writing to ANOTHER human - never like marketing copy
2. Be concise: MAX {max_words} words
3. Language: {language}
4. Framework to use: {framework}
5. Tone for step {step_number}: {tone}{prohibited_context}

**EMAIL STEP STRATEGY:**
- Step 1: Soft introduction, mention something specific about them, no ask
- Step 2: Share value (case study, insight), light credibility mention
- Step 3: Clear CTA (15-min call, demo), address objections gently

**PERSONALIZATION DATA:**
{personalization_context}
{keywords_context}

**OUTPUT FORMAT (JSON):**
{{
  "subject": "Compelling subject line (no spam words)",
  "body_html": "HTML version with proper tags",
  "body_text": "Plain text version",
  "personalization_hooks": ["What prospect data we used"],
  "copy_framework_used": "Name of framework used",
  "quality_score": 0.85  // Self-assessment 0-1
}}"""

    user_message = f"""Generate a cold email for:

**Prospect:** {prospect.get('first_name', 'Unknown')} at {prospect.get('company_name', 'Unknown')}
**Step:** {step_number}
**Goal:** {icp.get('sector', 'Unknown')} sector outreach

Make it feel like I spent 5 minutes researching them specifically."""

    return [
        {"role": "system", "content": system_message},
        {"role": "user", "content": user_message},
    ]
