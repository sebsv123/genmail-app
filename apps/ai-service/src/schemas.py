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
