"""GenMail AI Service - Microservicio de IA para Email Marketing."""

import os
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from llm import get_llm_provider, LLMProvider
from prompts import (
    build_generate_email_prompt,
    build_evaluate_email_prompt,
    build_extract_voice_prompt,
    select_copy_framework,
    build_generate_cold_email_prompt,
)
from schemas import (
    HealthResponse,
    GenerateEmailRequest,
    GenerateEmailResponse,
    EvaluateEmailRequest,
    EvaluateEmailResponse,
    EvaluationBreakdown,
    ExtractBrandVoiceRequest,
    ExtractBrandVoiceResponse,
    GenerateColdEmailRequest,
    GenerateColdEmailResponse,
)

# Configure logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer(),
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Global LLM provider instance
llm_provider: LLMProvider | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan."""
    global llm_provider
    logger.info("starting_ai_service")
    
    # Initialize LLM provider
    provider_type = os.getenv("LLM_PROVIDER", "auto")
    llm_provider = get_llm_provider(provider_type)
    logger.info("llm_provider_initialized", provider_type=provider_type)
    
    yield
    
    logger.info("shutting_down_ai_service")


app = FastAPI(
    title="GenMail AI Service",
    description="Microservicio de IA para GenMail - Generación y evaluación de emails con GPT-4",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse(status="ok", service="genmail-ai")


@app.get("/")
async def root() -> dict:
    """Root endpoint with API info."""
    return {
        "service": "GenMail AI Service",
        "version": "0.1.0",
        "endpoints": {
            "health": "/health",
            "generate_email": "POST /generate-email",
            "evaluate_email": "POST /evaluate-email",
            "extract_brand_voice": "POST /extract-brand-voice",
        },
        "docs": "/docs",
    }


@app.post("/generate-email", response_model=GenerateEmailResponse)
async def generate_email(request: GenerateEmailRequest) -> GenerateEmailResponse:
    """Generate a personalized email for a lead.
    
    This endpoint:
    1. Selects the best copy framework based on goal and sequence mode
    2. Builds a comprehensive prompt with brand voice, lead context, and anti-repetition memory
    3. Calls the LLM to generate the email
    4. Returns structured email data with quality score
    """
    if not llm_provider:
        raise HTTPException(status_code=503, detail="LLM provider not initialized")
    
    logger.info(
        "generating_email",
        business_id=request.business_id,
        lead_email=request.lead_profile.email,
        sequence_mode=request.sequence_mode,
    )
    
    # Select copy framework
    framework = select_copy_framework(request.step_goal, request.sequence_mode)
    
    # Build prompt
    messages = build_generate_email_prompt(
        business_id=request.business_id,
        brand_voice=request.brand_voice,
        lead_profile=request.lead_profile.model_dump(),
        sequence_mode=request.sequence_mode,
        step_goal=request.step_goal,
        memory_summary=request.memory_summary.model_dump(),
        relevant_sources=[s.model_dump() for s in request.relevant_sources],
        constraints=request.constraints.model_dump(),
        copy_framework=framework,
    )
    
    try:
        # Call LLM
        response_data = await llm_provider.generate_json(
            messages=messages,
            temperature=0.7,
            max_tokens=3000,
        )
        
        logger.info(
            "email_generated",
            business_id=request.business_id,
            framework=framework,
            quality_score=response_data.get("quality_score", 0),
        )
        
        return GenerateEmailResponse(
            subject=response_data.get("subject", ""),
            preview_text=response_data.get("preview_text", ""),
            body_html=response_data.get("body_html", ""),
            body_text=response_data.get("body_text", ""),
            copy_framework_used=response_data.get("copy_framework_used", framework),
            rationale=response_data.get("rationale", ""),
            used_sources=response_data.get("used_sources", []),
            quality_score=response_data.get("quality_score", 0.5),
        )
        
    except Exception as e:
        logger.error("email_generation_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Email generation failed: {str(e)}")


@app.post("/evaluate-email", response_model=EvaluateEmailResponse)
async def evaluate_email(request: EvaluateEmailRequest) -> EvaluateEmailResponse:
    """Evaluate an email for quality, compliance, and effectiveness.
    
    Returns a quality score (0-1), issues found, suggestions for improvement,
    and an approval decision.
    """
    if not llm_provider:
        raise HTTPException(status_code=503, detail="LLM provider not initialized")
    
    logger.info("evaluating_email", subject=request.subject[:50])
    
    # Build prompt
    messages = build_evaluate_email_prompt(
        subject=request.subject,
        body_text=request.body_text,
        memory_summary=request.memory_summary.model_dump(),
        brand_voice=request.brand_voice,
        prohibited_claims=request.prohibited_claims,
    )
    
    try:
        response_data = await llm_provider.generate_json(
            messages=messages,
            temperature=0.3,  # Lower temperature for consistent evaluation
            max_tokens=2000,
        )
        
        # Parse breakdown if present
        breakdown_data = response_data.get("breakdown")
        breakdown = None
        if breakdown_data:
            breakdown = EvaluationBreakdown(
                brand_alignment=breakdown_data.get("brand_alignment", 0),
                message_clarity=breakdown_data.get("message_clarity", 0),
                cta_strength=breakdown_data.get("cta_strength", 0),
                originality=breakdown_data.get("originality", 0),
                spam_score=breakdown_data.get("spam_score", 0),
                compliance=breakdown_data.get("compliance", 0),
            )
        
        logger.info(
            "email_evaluated",
            score=response_data.get("score", 0),
            approved=response_data.get("approved", False),
        )
        
        return EvaluateEmailResponse(
            score=response_data.get("score", 0),
            issues=response_data.get("issues", []),
            suggestions=response_data.get("suggestions", []),
            approved=response_data.get("approved", False),
            breakdown=breakdown,
        )
        
    except Exception as e:
        logger.error("email_evaluation_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Email evaluation failed: {str(e)}")


@app.post("/extract-brand-voice", response_model=ExtractBrandVoiceResponse)
async def extract_brand_voice(request: ExtractBrandVoiceRequest) -> ExtractBrandVoiceResponse:
    """Extract brand voice characteristics from sample emails.
    
    Analyzes sample emails and business description to extract:
    - Tone and style patterns
    - Preferred and avoided vocabulary
    - Average email length
    - Common CTA patterns
    """
    if not llm_provider:
        raise HTTPException(status_code=503, detail="LLM provider not initialized")
    
    logger.info(
        "extracting_brand_voice",
        sample_count=len(request.sample_emails),
    )
    
    # Build prompt
    messages = build_extract_voice_prompt(
        sample_emails=request.sample_emails,
        business_description=request.business_description,
    )
    
    try:
        response_data = await llm_provider.generate_json(
            messages=messages,
            temperature=0.4,
            max_tokens=2000,
        )
        
        logger.info("brand_voice_extracted")
        
        return ExtractBrandVoiceResponse(
            tone=response_data.get("tone", ""),
            style=response_data.get("style", ""),
            vocabulary_preferred=response_data.get("vocabulary_preferred", []),
            vocabulary_avoided=response_data.get("vocabulary_avoided", []),
            avg_length=response_data.get("avg_length", 0),
            cta_patterns=response_data.get("cta_patterns", []),
            additional_notes=response_data.get("additional_notes", ""),
        )
        
    except Exception as e:
        logger.error("brand_voice_extraction_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Brand voice extraction failed: {str(e)}")


@app.post("/generate-cold-email", response_model=GenerateColdEmailResponse)
async def generate_cold_email(request: GenerateColdEmailRequest) -> GenerateColdEmailResponse:
    """Generate a personalized cold email for a prospect.
    
    This endpoint:
    1. Selects tone based on step_number (1=soft intro, 2=value, 3=direct CTA)
    2. Builds a prompt using real prospect data and ICP
    3. Generates email that sounds human and individual
    4. Respects prohibited_claims and brand_voice
    """
    if not llm_provider:
        raise HTTPException(status_code=503, detail="LLM provider not initialized")
    
    logger.info(
        "generating_cold_email",
        business_id=request.business_id,
        prospect_email=request.prospect.email,
        step=request.step_number,
    )
    
    # Build prompt
    messages = build_generate_cold_email_prompt(
        business_id=request.business_id,
        brand_voice=request.brand_voice,
        prospect=request.prospect.model_dump(),
        icp=request.icp.model_dump(),
        step_number=request.step_number,
        constraints=request.constraints.model_dump(),
    )
    
    try:
        # Call LLM
        response_data = await llm_provider.generate_json(
            messages=messages,
            temperature=0.6,  # Slightly lower for cold emails
            max_tokens=2500,
        )
        
        logger.info(
            "cold_email_generated",
            business_id=request.business_id,
            step=request.step_number,
            quality_score=response_data.get("quality_score", 0),
        )
        
        return GenerateColdEmailResponse(
            subject=response_data.get("subject", ""),
            body_html=response_data.get("body_html", ""),
            body_text=response_data.get("body_text", ""),
            personalization_hooks=response_data.get("personalization_hooks", []),
            copy_framework_used=response_data.get("copy_framework_used", "AIDA"),
            quality_score=response_data.get("quality_score", 0.5),
        )
        
    except Exception as e:
        logger.error("cold_email_generation_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Cold email generation failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
