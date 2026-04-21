"""Pydantic schemas for AI Service API."""

from typing import Literal
from pydantic import BaseModel, Field


# ============== HEALTH ==============

class HealthResponse(BaseModel):
    status: str = "ok"


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
