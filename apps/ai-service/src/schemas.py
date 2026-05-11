"""Pydantic schemas for AI Service API."""

from typing import Literal
from pydantic import BaseModel, Field


# ============== HEALTH ==============

class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "genmail-ai"


# ============== GENERATE EMAIL ==============

class LeadProfile(BaseModel):
    email: str = Field(..., description="Lead's email address")
    name: str = Field(..., description="Lead's name")
    stage: str = Field(..., description="Lead stage (NEW, NURTURING, QUALIFIED, etc.)")
    context_data: dict = Field(default_factory=dict, description="Additional lead context")
    intent_score: float | None = Field(None, description="Intent score 0-100")


class MemorySummary(BaseModel):
    topics_used: list[str] = Field(default_factory=list, description="Topics already used")
    hooks_used: list[str] = Field(default_factory=list, description="Hooks already used")
    ctas_used: list[str] = Field(default_factory=list, description="CTAs already used")


class RelevantSource(BaseModel):
    content: str = Field(..., description="Source content")
    source_url: str = Field(..., description="Source URL or identifier")


class Constraints(BaseModel):
    max_words: int = Field(default=150, description="Maximum word count")
    language: str = Field(default="es-ES", description="Target language")
    prohibited_claims: list[str] = Field(default_factory=list, description="Claims to avoid")
    cta_type: str = Field(default="Reservar demo", description="Type of CTA to use")


class GenerateEmailRequest(BaseModel):
    business_id: str = Field(..., description="Business/tenant ID")
    brand_voice: str = Field(..., description="Brand voice description")
    lead_profile: LeadProfile = Field(..., description="Lead information")
    sequence_mode: Literal["evergreen", "nurturing_infinite"] = Field(..., description="Sequence type")
    step_goal: str = Field(..., description="Goal for this email step")
    memory_summary: MemorySummary = Field(default_factory=MemorySummary, description="Anti-repetition memory")
    relevant_sources: list[RelevantSource] = Field(default_factory=list, description="Knowledge sources")
    constraints: Constraints = Field(default_factory=Constraints, description="Generation constraints")


class GenerateEmailResponse(BaseModel):
    subject: str = Field(..., description="Email subject line")
    preview_text: str = Field(..., description="Preview text for email clients")
    body_html: str = Field(..., description="HTML version of email body")
    body_text: str = Field(..., description="Plain text version of email body")
    copy_framework_used: str = Field(..., description="Framework used (AIDA, PAS, BAB, etc.)")
    rationale: str = Field(..., description="Explanation of why this email will work")
    used_sources: list[str] = Field(..., description="Sources utilized in generation")
    quality_score: float = Field(..., ge=0, le=1, description="Quality score 0-1")


# ============== EVALUATE EMAIL ==============

class EvaluateEmailRequest(BaseModel):
    subject: str = Field(..., description="Email subject to evaluate")
    body_text: str = Field(..., description="Email body text to evaluate")
    memory_summary: MemorySummary = Field(default_factory=MemorySummary, description="Previous memory")
    brand_voice: str = Field(..., description="Expected brand voice")
    prohibited_claims: list[str] = Field(default_factory=list, description="Claims to check against")


class EvaluationBreakdown(BaseModel):
    brand_alignment: float = Field(..., ge=0, le=1)
    message_clarity: float = Field(..., ge=0, le=1)
    cta_strength: float = Field(..., ge=0, le=1)
    originality: float = Field(..., ge=0, le=1)
    spam_score: float = Field(..., ge=0, le=1)
    compliance: float = Field(..., ge=0, le=1)


class EvaluateEmailResponse(BaseModel):
    score: float = Field(..., ge=0, le=1, description="Overall quality score")
    issues: list[str] = Field(default_factory=list, description="Issues found")
    suggestions: list[str] = Field(default_factory=list, description="Improvement suggestions")
    approved: bool = Field(..., description="Whether email passes evaluation")
    breakdown: EvaluationBreakdown | None = None


# ============== EXTRACT BRAND VOICE ==============

class ExtractBrandVoiceRequest(BaseModel):
    sample_emails: list[str] = Field(..., min_length=1, description="Sample emails in brand voice")
    business_description: str = Field(..., description="Business description and audience")


class ExtractBrandVoiceResponse(BaseModel):
    tone: str = Field(..., description="Brand tone description")
    style: str = Field(..., description="Writing style description")
    vocabulary_preferred: list[str] = Field(..., description="Preferred words/phrases")
    vocabulary_avoided: list[str] = Field(..., description="Words/phrases to avoid")
    avg_length: int = Field(..., description="Average email length in words")
    cta_patterns: list[str] = Field(..., description="Common CTA patterns")
    additional_notes: str = Field(default="", description="Additional observations")


# ============== GENERATE COLD EMAIL ==============

class ProspectProfile(BaseModel):
    email: str = Field(..., description="Prospect's email address")
    first_name: str | None = Field(None, description="Prospect's first name")
    last_name: str | None = Field(None, description="Prospect's last name")
    company_name: str | None = Field(None, description="Prospect's company name")
    company_website: str | None = Field(None, description="Company website")
    role: str | None = Field(None, description="Job title/role")
    source_url: str | None = Field(None, description="URL where prospect was found")
    enrichment_data: dict = Field(default_factory=dict, description="Additional enrichment data")


class ICPProfile(BaseModel):
    sector: str = Field(..., description="Target sector/industry")
    target_role: str = Field(..., description="Target role/title")
    pain_points: list[str] = Field(default_factory=list, description="Pain points to address")
    keywords: list[str] = Field(default_factory=list, description="Keywords for personalization")
    location: str | None = Field(None, description="Geographic location")


class ColdEmailConstraints(BaseModel):
    max_words: int = Field(default=120, description="Maximum word count")
    language: str = Field(default="es-ES", description="Target language")
    prohibited_claims: list[str] = Field(default_factory=list, description="Claims to avoid")


class GenerateColdEmailRequest(BaseModel):
    business_id: str = Field(..., description="Business/tenant ID")
    brand_voice: str = Field(..., description="Brand voice description")
    prospect: ProspectProfile = Field(..., description="Prospect information")
    icp: ICPProfile = Field(..., description="Ideal Customer Profile")
    step_number: int = Field(..., ge=1, le=3, description="Email step number (1, 2, or 3)")
    constraints: ColdEmailConstraints = Field(default_factory=ColdEmailConstraints, description="Generation constraints")


class GenerateColdEmailResponse(BaseModel):
    subject: str = Field(..., description="Email subject line")
    body_html: str = Field(..., description="HTML version of email body")
    body_text: str = Field(..., description="Plain text version of email body")
    personalization_hooks: list[str] = Field(..., description="Data points used for personalization")
    copy_framework_used: str = Field(..., description="Framework used (AIDA, PAS, etc.)")
    quality_score: float = Field(..., ge=0, le=1, description="Quality score 0-1")


# ============== RAG: EMBEDDINGS ==============

class ChunkResponse(BaseModel):
    index: int = Field(..., description="Chunk index")
    content: str = Field(..., description="Chunk content")
    embedding: list[float] = Field(..., description="Embedding vector (1536 dims)")
    metadata: dict = Field(default_factory=dict, description="Additional metadata")


class EmbedSourceRequest(BaseModel):
    business_id: str = Field(..., description="Business/tenant ID")
    source_id: str = Field(..., description="Knowledge source ID")
    content: str = Field(..., description="Content to embed")
    source_type: str = Field(..., description="Type of source (RSS, URL, DOCUMENT)")
    metadata: dict | None = Field(default=None, description="Additional metadata")


class EmbedSourceResponse(BaseModel):
    business_id: str = Field(..., description="Business/tenant ID")
    source_id: str = Field(..., description="Knowledge source ID")
    chunks: list[ChunkResponse] = Field(..., description="Chunks with embeddings")
    total_chunks: int = Field(..., description="Total number of chunks")


class EmbedLeadRequest(BaseModel):
    lead_id: str = Field(..., description="Lead ID")
    email: str = Field(..., description="Lead's email address")
    name: str | None = Field(None, description="Lead's name")
    stage: str | None = Field(None, description="Lead stage")
    intent_score: float | None = Field(None, description="Intent score 0-100")
    context_data: dict = Field(default_factory=dict, description="Additional lead context")


class EmbedLeadResponse(BaseModel):
    lead_id: str = Field(..., description="Lead ID")
    profile_summary: str = Field(..., description="Generated profile summary")
    embedding: list[float] = Field(..., description="Embedding vector (1536 dims)")


class SearchContextRequest(BaseModel):
    business_id: str = Field(..., description="Business/tenant ID")
    query: str = Field(..., description="Search query text")
    limit: int = Field(default=5, ge=1, le=50, description="Number of results to return")


class SearchContextResponse(BaseModel):
    business_id: str = Field(..., description="Business/tenant ID")
    query: str = Field(..., description="Original query")
    query_embedding: list[float] = Field(..., description="Query embedding vector")
    limit: int = Field(..., description="Requested limit")


# ============== TREND ANALYSIS (FASE 18B) ==============

class TrendItem(BaseModel):
    keyword: str = Field(..., description="Trend keyword")
    score: float = Field(..., ge=0, le=100, description="Trend score 0-100")
    weekly_change: float = Field(..., description="Weekly change percentage")


class AnalyzeTrendContextRequest(BaseModel):
    sector: str = Field(..., description="Sector/industry")
    trends: list[TrendItem] = Field(..., description="List of trend data")


class AnalyzeTrendContextResponse(BaseModel):
    summary: str = Field(..., description="Summary of trend context")
    recommended_hook: str = Field(..., description="Recommended hook for emails")
    urgency_level: Literal["high", "medium", "low"] = Field(..., description="Urgency level based on trends")


# ============== VALENTÍN EMAIL EVALUATION ==============

class EvaluateValentinEmailRequest(BaseModel):
    subject_line: str = Field(..., description="Email subject line to evaluate")
    body_text: str = Field(..., description="Email body text to evaluate")
    first_name: str = Field(..., description="Prospect's first name")
    zone: str = Field(..., description="Geographic zone")
    icp_slug: str = Field(..., description="ICP identifier")
    primary_product: str = Field(..., description="Target product")
    sequence_step: int = Field(..., ge=1, le=10, description="Current step number")
    framework_used: str = Field(..., description="Copy framework used")
    cta_text: str = Field(..., description="CTA text used")
    cta_url: str = Field(..., description="CTA URL used")
    word_count: int = Field(..., ge=0, description="Word count of the email")


class EvaluateValentinEmailResponse(BaseModel):
    compliance: int = Field(..., ge=0, le=20, description="Compliance score 0-20")
    personalization: int = Field(..., ge=0, le=20, description="Personalization score 0-20")
    clarity: int = Field(..., ge=0, le=15, description="Clarity score 0-15")
    subject_power: int = Field(..., ge=0, le=15, description="Subject power score 0-15")
    cta_strength: int = Field(..., ge=0, le=15, description="CTA strength score 0-15")
    brand_tone: int = Field(..., ge=0, le=15, description="Brand tone score 0-15")
    total_score: int = Field(..., ge=0, le=100, description="Total score 0-100")
    send_recommendation: str = Field(..., description="send_now|send_with_note|manual_review|block")
    prohibited_terms_found: list[str] = Field(default_factory=list, description="Prohibited terms found")
    compliance_issues: list[str] = Field(default_factory=list, description="Compliance issues found")
    strengths: list[str] = Field(default_factory=list, description="Email strengths")
    improvements: list[str] = Field(default_factory=list, description="Suggested improvements")
    blocking_reason: str = Field(default="", description="Reason if blocked")


# ============== LEAD CLASSIFICATION (ICP) ==============

class ClassifyLeadRequest(BaseModel):
    lead_data: dict = Field(..., description="Lead information (name, email, message, phone, etc.)")
    source: str = Field(default="", description="Where the lead came from (web, whatsapp, referral, phone)")
    trigger: str = Field(default="", description="What triggered the contact (form, call, message, newsletter)")
    zone: str = Field(default="", description="Geographic zone if known")


class ClassifyLeadResponse(BaseModel):
    icp_slug: str = Field(..., description="ICP identifier (salud-madrid, extranjeros-nie, etc.)")
    confidence: float = Field(..., ge=0, le=1, description="Classification confidence 0-1")
    reasoning: str = Field(..., description="Brief explanation of the classification")
    primary_product: str = Field(..., description="Recommended primary product")
    secondary_products: list[str] = Field(default_factory=list, description="Recommended secondary products")
    intent_score: int = Field(..., ge=0, le=100, description="Intent score 0-100")
    urgency: str = Field(..., description="Urgency level (baja, media, alta)")
    needs_enrichment: bool = Field(..., description="Whether more data is needed for confident classification")
    discard_reason: str = Field(default="", description="Reason if lead was discarded")


# ============== VALENTÍN EMAIL GENERATION ==============

class ValentinEmailRequest(BaseModel):
    first_name: str = Field(..., description="Prospect's first name")
    zone: str = Field(..., description="Geographic zone (e.g., Boadilla del Monte)")
    icp_slug: str = Field(..., description="ICP identifier from classification")
    intent_signal: str = Field(..., description="Detected intent signal")
    primary_product: str = Field(..., description="Target product")
    sequence_step: int = Field(..., ge=1, le=10, description="Current step number (1=first contact)")
    sequence_total: int = Field(..., ge=1, le=10, description="Total steps in sequence")
    previous_emails_summary: str = Field(default="", description="Summary of previous emails sent")
    extra_context: str = Field(default="", description="Additional context about the lead")


class ValentinEmailResponse(BaseModel):
    subject_line: str = Field(..., description="Email subject line (max 55 chars)")
    subject_line_alt: str = Field(..., description="Alternative subject line for A/B testing")
    preview_text: str = Field(..., description="Preview text (max 90 chars)")
    greeting: str = Field(..., description="Email greeting")
    body_html: str = Field(..., description="HTML version of email body")
    body_text: str = Field(..., description="Plain text version of email body")
    cta_text: str = Field(..., description="CTA text")
    cta_url: str = Field(default="https://wa.me/34603448765", description="CTA URL (always WhatsApp)")
    signature: str = Field(..., description="Email signature")
    word_count: int = Field(..., ge=0, description="Word count of the email body")
    framework_used: str = Field(..., description="Copy framework used (AIDA, PAS, etc.)")
    hook_type: str = Field(..., description="Type of hook used")
    personalization_elements: list[str] = Field(default_factory=list, description="Personalization elements used")
    anticipated_objection: str = Field(..., description="Anticipated objection addressed in the email")


# ============== VALENTÍN SEQUENCE DESIGN ==============

class ValentinSequenceRequest(BaseModel):
    icp_slug: str = Field(..., description="ICP identifier from classification")
    first_name: str = Field(..., description="Prospect's first name")
    zone: str = Field(..., description="Geographic zone (e.g., Boadilla del Monte)")
    primary_product: str = Field(..., description="Target product")
    trigger: str = Field(..., description="What triggered the contact (form, call, message, newsletter)")
    urgency_level: str = Field(..., description="Urgency level (baja, media, alta)")


class SequenceEmailItem(BaseModel):
    step: int = Field(..., ge=1, le=10, description="Step number in the sequence")
    send_day: int = Field(..., ge=0, description="Day to send (0 = day 1, 2 = day 3, etc.)")
    mission: str = Field(..., description="What this email needs to achieve")
    framework: str = Field(..., description="Copy framework to use")
    subject_line: str = Field(..., description="Email subject line")
    subject_line_alt: str = Field(..., description="Alternative subject line for A/B testing")
    preview_text: str = Field(..., description="Preview text (max 90 chars)")
    body_text: str = Field(..., description="Email body text")
    cta_text: str = Field(..., description="CTA text")
    word_count: int = Field(..., ge=0, description="Word count of the email body")
    urgency_level: str = Field(..., description="Urgency level for this email (low|medium|high)")


class ValentinSequenceResponse(BaseModel):
    sequence_name: str = Field(..., description="Name of the sequence")
    icp_slug: str = Field(..., description="ICP identifier")
    total_emails: int = Field(..., ge=3, le=5, description="Total number of emails in the sequence")
    emails: list[SequenceEmailItem] = Field(..., description="List of emails in the sequence")
    stop_triggers: list[str] = Field(default_factory=list, description="Triggers that should stop the sequence")
    estimated_reply_rate: str = Field(..., description="Estimated reply rate (e.g., '15%')")
    best_send_times: list[str] = Field(default_factory=list, description="Best times to send emails")


# ============== VALENTÍN REPLY CLASSIFICATION ==============

class ReplyClassifyRequest(BaseModel):
    lead_name: str = Field(..., description="Name of the lead who replied")
    icp_slug: str = Field(..., description="ICP identifier from classification")
    sent_subject: str = Field(..., description="Subject line of the email that was sent")
    reply_text: str = Field(..., description="The reply text from the lead")
    language: str = Field(default="es", description="Language of the reply (es/en)")


class ReplyClassifyResponse(BaseModel):
    intent: str = Field(..., description="Detected intent (positive|neutral|negative|unsubscribe|question|out_of_office)")
    action: str = Field(..., description="Action to take (notify_urgent|notify_standard|auto_respond|continue_sequence|stop_and_flag)")
    urgency: str = Field(..., description="Urgency level (immediate|2h|24h|none)")
    summary_es: str = Field(..., description="Brief explanation of the classification in Spanish (max 100 chars)")
    suggested_response: str = Field(default="", description="Suggested response text if action is auto_respond")
    stop_sequence: bool = Field(..., description="Whether to stop the email sequence")
    whatsapp_alert_text: str = Field(default="", description="WhatsApp alert text for notify_urgent or notify_standard")


# ============== LEAD SCORING ==============

class ScoreLeadRequest(BaseModel):
    lead_data: dict = Field(..., description="Lead information (name, email, message, phone, etc.)")
    source: str = Field(..., description="Where the lead came from (web, whatsapp, referral, phone)")
    icp_slug: str = Field(..., description="ICP identifier from classification")


class ScoreLeadResponse(BaseModel):
    quality_score: int = Field(..., ge=0, le=100, description="Quality score 0-100")
    action: str = Field(..., description="Action to take (priority_sequence|standard_sequence|enrich_first|discard)")
    discard_reason: str | None = Field(default=None, description="Reason if discarded")
    enrichment_needed: list[str] = Field(default_factory=list, description="Fields that need enrichment")
    personalization_available: list[str] = Field(default_factory=list, description="Data points available for personalization")
    risk_flags: list[str] = Field(default_factory=list, description="Risk flags detected")
    estimated_intent: int = Field(..., ge=1, le=10, description="Estimated intent level 1-10")
