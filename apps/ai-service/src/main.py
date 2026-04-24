"""GenMail AI Service - Microservicio de IA para Email Marketing."""

import os
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from llm import get_llm_provider, LLMProvider
from embeddings.provider import get_embedding_provider, EmbeddingProvider
from embeddings.chunker import chunk_text
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
    EmbedSourceRequest,
    EmbedSourceResponse,
    EmbedLeadRequest,
    EmbedLeadResponse,
    SearchContextRequest,
    SearchContextResponse,
    AnalyzeTrendContextRequest,
    AnalyzeTrendContextResponse,
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

# Global provider instances
llm_provider: LLMProvider | None = None
embedding_provider: EmbeddingProvider | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan."""
    global llm_provider, embedding_provider
    logger.info("starting_ai_service")
    
    # Initialize LLM provider
    provider_type = os.getenv("LLM_PROVIDER", "auto")
    llm_provider = get_llm_provider(provider_type)
    logger.info("llm_provider_initialized", provider_type=provider_type)
    
    # Initialize embedding provider with warmup (FASE 17C)
    from embeddings.provider import EmbeddingProvider
    app.state.embedding_provider = EmbeddingProvider()
    
    # Warm-up: Pre-load BGE-M3 model into memory with a dummy text
    # This avoids the 10-15s delay on the first real request
    logger.info("warming_up_embedding_model")
    app.state.embedding_provider.get_embedding("warmup text for model initialization")
    logger.info(
        "embedding_provider_initialized",
        mode=app.state.embedding_provider.mode,
        dimensions=app.state.embedding_provider.vector_dimensions,
    )
    
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
            "embed_source": "POST /embed-source",
            "embed_lead": "POST /embed-lead",
            "search_context": "POST /search-context",
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


@app.post("/embed-source", response_model=EmbedSourceResponse)
async def embed_source(request: EmbedSourceRequest) -> EmbedSourceResponse:
    """Embed a knowledge source by chunking and generating embeddings.
    
    1. Chunks the content using overlap to preserve context
    2. Generates embeddings for each chunk in batch
    3. Returns chunks with embeddings ready for database storage
    """
    global embedding_provider
    if not embedding_provider:
        raise HTTPException(status_code=503, detail="Embedding provider not initialized")
    
    logger.info(
        "embedding_source",
        business_id=request.business_id,
        source_id=request.source_id,
        source_type=request.source_type,
    )
    
    try:
        # Chunk the content
        chunks = chunk_text(request.content, max_tokens=400, overlap=50)
        
        # Generate embeddings for all chunks in batch
        embeddings = embedding_provider.get_embeddings_batch(chunks)
        
        # Build response chunks
        chunk_responses = []
        for i, (chunk_content, embedding) in enumerate(zip(chunks, embeddings)):
            chunk_responses.append({
                "index": i,
                "content": chunk_content,
                "embedding": embedding,
                "metadata": {
                    **(request.metadata or {}),
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                },
            })
        
        logger.info(
            "source_embedded",
            business_id=request.business_id,
            source_id=request.source_id,
            total_chunks=len(chunks),
        )
        
        return EmbedSourceResponse(
            business_id=request.business_id,
            source_id=request.source_id,
            chunks=chunk_responses,
            total_chunks=len(chunks),
        )
        
    except Exception as e:
        logger.error("source_embedding_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Source embedding failed: {str(e)}")


@app.post("/embed-lead", response_model=EmbedLeadResponse)
async def embed_lead(request: EmbedLeadRequest) -> EmbedLeadResponse:
    """Embed a lead profile by creating a descriptive summary and generating embedding.
    
    1. Constructs a profile summary from lead data
    2. Generates embedding for the summary
    3. Returns embedding ready for database storage
    """
    global embedding_provider
    if not embedding_provider:
        raise HTTPException(status_code=503, detail="Embedding provider not initialized")
    
    logger.info(
        "embedding_lead",
        lead_id=request.lead_id,
        email=request.email,
    )
    
    try:
        # Build profile summary
        profile_parts = [f"Email: {request.email}"]
        
        if request.name:
            profile_parts.append(f"Name: {request.name}")
        
        if request.stage:
            profile_parts.append(f"Stage: {request.stage}")
        
        if request.intent_score is not None:
            profile_parts.append(f"Intent Score: {request.intent_score}")
        
        if request.context_data:
            for key, value in request.context_data.items():
                if value:
                    profile_parts.append(f"{key}: {value}")
        
        profile_summary = "\n".join(profile_parts)
        
        # Generate embedding
        embedding = embedding_provider.get_embedding(profile_summary)
        
        logger.info(
            "lead_embedded",
            lead_id=request.lead_id,
        )
        
        return EmbedLeadResponse(
            lead_id=request.lead_id,
            profile_summary=profile_summary,
            embedding=embedding,
        )
        
    except Exception as e:
        logger.error("lead_embedding_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Lead embedding failed: {str(e)}")


@app.post("/search-context", response_model=SearchContextResponse)
async def search_context(request: SearchContextRequest) -> SearchContextResponse:
    """Generate query embedding for context search.
    
    The actual vector search is performed by the worker using pgvector.
    This endpoint just generates the embedding for the query.
    """
    global embedding_provider
    if not embedding_provider:
        raise HTTPException(status_code=503, detail="Embedding provider not initialized")
    
    logger.info(
        "generating_query_embedding",
        business_id=request.business_id,
        query_preview=request.query[:50],
    )
    
    try:
        # Generate embedding for the query
        query_embedding = embedding_provider.get_embedding(request.query)
        
        logger.info(
            "query_embedding_generated",
            business_id=request.business_id,
        )
        
        return SearchContextResponse(
            business_id=request.business_id,
            query=request.query,
            query_embedding=query_embedding,
            limit=request.limit,
        )
        
    except Exception as e:
        logger.error("query_embedding_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Query embedding failed: {str(e)}")


# ============== LEARNING: ANALYSIS ENDPOINTS ==============

@app.post("/analyze-subject")
async def analyze_subject(subject: str) -> dict:
    """Analyze subject line style, personalization, and hook type."""
    try:
        style = "neutro"
        if "?" in subject:
            style = "pregunta"
        elif any(c.isdigit() for c in subject):
            style = "numero"
        elif "urgente" in subject.lower() or "ahora" in subject.lower():
            style = "urgencia"
        elif "beneficio" in subject.lower() or "mejora" in subject.lower():
            style = "beneficio"

        # Simple hook type detection
        hook_type = "novedad"
        if "dolor" in subject.lower() or "problema" in subject.lower():
            hook_type = "dolor"
        elif "curiosidad" in subject.lower() or "?" in subject:
            hook_type = "curiosidad"
        elif "beneficio" in subject.lower() or "ganar" in subject.lower():
            hook_type = "beneficio"
        elif "cliente" in subject.lower() or "éxito" in subject.lower():
            hook_type = "social_proof"

        # Estimate length
        words = len(subject.split())
        estimated_length = "corto" if words < 6 else "medio" if words < 12 else "largo"

        has_personalization = "{{" in subject or "{{name}}" in subject.lower()

        return {
            "style": style,
            "has_personalization": has_personalization,
            "estimated_length": estimated_length,
            "hook_type": hook_type,
        }
    except Exception as e:
        logger.error("analyze_subject_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Subject analysis failed: {str(e)}")


@app.post("/analyze-performance-insights")
async def analyze_performance_insights(
    business_id: str,
    patterns: list[dict],
    sector: str = "",
) -> dict:
    """Generate natural language insights from performance patterns."""
    try:
        insights = []
        recommendations = []

        # Group patterns by type
        by_type = {}
        for p in patterns:
            pt = p.get("patternType")
            if pt not in by_type:
                by_type[pt] = []
            by_type[pt].append(p)

        # Generate insights for each type
        for pattern_type, type_patterns in by_type.items():
            if len(type_patterns) < 2:
                continue

            # Find best and worst performers
            sorted_patterns = sorted(
                type_patterns,
                key=lambda x: x.get("openRate", 0) * 0.3 + x.get("clickRate", 0) * 0.4 + x.get("replyRate", 0) * 0.3,
                reverse=True,
            )

            best = sorted_patterns[0]
            worst = sorted_patterns[-1]

            # Calculate improvement
            best_score = best.get("openRate", 0) * 0.3 + best.get("clickRate", 0) * 0.4 + best.get("replyRate", 0) * 0.3
            worst_score = worst.get("openRate", 0) * 0.3 + worst.get("clickRate", 0) * 0.4 + worst.get("replyRate", 0) * 0.3

            if best_score > worst_score * 1.2:  # At least 20% improvement
                if pattern_type == "SUBJECT_LINE":
                    insights.append(f"Tus emails con subject '{best['patternValue']}' tienen {int((best_score/worst_score-1)*100)}% mejor rendimiento que los demás")
                elif pattern_type == "COPY_FRAMEWORK":
                    insights.append(f"El framework {best['patternValue']} funciona mejor para tu audiencia que {worst['patternValue']}")
                elif pattern_type == "SEND_TIME":
                    insights.append(f"Tus leads responden más los {best['patternValue']} (mejor momento de envío)")
                elif pattern_type == "HOOK_TYPE":
                    insights.append(f"Los ganchos de tipo '{best['patternValue']}' generan más engagement que los demás")

                # Recommendations
                if pattern_type == "SUBJECT_LINE" and best["sampleSize"] >= 20:
                    recommendations.append(f"Usa más subject lines tipo '{best['patternValue']}' en tus próximas campañas")

        # Summary
        total_emails = sum(p.get("sampleSize", 0) for p in patterns)
        summary = f"Análisis basado en {total_emails} emails enviados. "
        if len(insights) > 0:
            summary += f"Hemos identificado {len(insights)} patrones de éxito. "
        else:
            summary += "Necesitamos más datos para identificar patrones con confianza. "

        return {
            "insights": insights,
            "recommendations": recommendations,
            "summary": summary,
        }
    except Exception as e:
        logger.error("analyze_insights_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Insights analysis failed: {str(e)}")


# ============== A/B TESTING ENDPOINTS ==============

@app.post("/generate-ab-variants")
async def generate_ab_variants(
    business_id: str,
    lead_id: str,
    sequence_goal: str,
    lead_context: dict,
    business_context: dict,
    test_type: str,
    variant_a_hint: str = "",
    variant_b_hint: str = "",
) -> dict:
    """Generate two A/B test variants that differ in exactly one variable.
    
    Rules:
    - SUBJECT_LINE: Same body, different subjects (question vs statement)
    - COPY_FRAMEWORK: Same goal, different frameworks (AIDA vs PAS)
    - EMAIL_LENGTH: Same message, one short (<150 words) one long (>300)
    - CTA_TYPE: Same body, different CTAs (reply vs link vs call)
    - Both variants must be high quality
    """
    logger.info(
        "generating_ab_variants",
        business_id=business_id,
        test_type=test_type,
    )

    try:
        variant_a = {"hypothesis": "", "key_difference": ""}
        variant_b = {"hypothesis": "", "key_difference": ""}
        test_rationale = ""

        if test_type == "SUBJECT_LINE":
            variant_a["hypothesis"] = variant_a_hint or "Las preguntas en subject aumentan curiosidad y aperturas"
            variant_b["hypothesis"] = variant_b_hint or "Las afirmaciones directas funcionan mejor para este sector"
            variant_a["key_difference"] = "Subject con pregunta que despierta curiosidad"
            variant_b["key_difference"] = "Subject con afirmación directa y valor claro"
            test_rationale = "Test de subject: pregunta vs afirmación directa. Ambos son probados pero dependen del contexto del lead."

        elif test_type == "COPY_FRAMEWORK":
            variant_a["hypothesis"] = variant_a_hint or "AIDA (Attention-Interest-Desire-Action) funciona mejor para leads conocidos"
            variant_b["hypothesis"] = variant_b_hint or "PAS (Problem-Agitate-Solution) resuena más con leads con problemas urgentes"
            variant_a["key_difference"] = "Estructura AIDA: ganar atención antes de presentar solución"
            variant_b["key_difference"] = "Estructura PAS: agitar el problema antes de ofrecer solución"
            test_rationale = "Test de frameworks: AIDA vs PAS. Ambos son efectivos pero funcionan mejor en diferentes etapas de madurez del lead."

        elif test_type == "EMAIL_LENGTH":
            variant_a["hypothesis"] = variant_a_hint or "Emails cortos (<150 palabras) tienen mejor lectura completa en móviles"
            variant_b["hypothesis"] = variant_b_hint or "Emails largos (>300 palabras) generan más contexto y credibilidad"
            variant_a["key_difference"] = "Mensaje conciso y directo, optimizado para lectura rápida"
            variant_b["key_difference"] = "Mensaje detallado con más contexto, pruebas sociales y valor"
            test_rationale = "Test de longitud: corto vs largo. Los cortos funcionan mejor en móviles, los largos convencen más pero requieren más atención."

        elif test_type == "CTA_TYPE":
            variant_a["hypothesis"] = variant_a_hint or "CTA de respuesta directa (reply) genera más engagement personal"
            variant_b["hypothesis"] = variant_b_hint or "CTA con link a calendario reduce fricción y aumenta conversiones"
            variant_a["key_difference"] = "CTA: 'Responde con tus pregtainas' - busca diálogo directo"
            variant_b["key_difference"] = "CTA: 'Agenda tu llamada aquí' - link a calendario directo"
            test_rationale = "Test de CTA: respuesta vs link. La respuesta genera conversación, el link facilita la acción inmediata."

        elif test_type == "SEND_TIME":
            variant_a["hypothesis"] = variant_a_hint or "Emails enviados martes a las 10am tienen mejor apertura en B2B"
            variant_b["hypothesis"] = variant_b_hint or "Emails enviados jueves a las 3pm capturan leads en modo de decisión"
            variant_a["key_difference"] = "Horario: martes 10am (principio de semana, modo trabajo)"
            variant_b["key_difference"] = "Horario: jueves 3pm (próximo a fin de semana, modo decisión)"
            test_rationale = "Test de momento de envío: martes AM vs jueves PM. Diferentes momentos capturan diferentes estados mentales."

        else:
            raise HTTPException(status_code=400, detail=f"Unknown test_type: {test_type}")

        return {
            "test_type": test_type,
            "test_rationale": test_rationale,
            "variant_a": {
                "hypothesis": variant_a["hypothesis"],
                "key_difference": variant_a["key_difference"],
                "subject_suggestion": variant_a.get("subject_suggestion", ""),
                "body_suggestion": variant_a.get("body_suggestion", ""),
            },
            "variant_b": {
                "hypothesis": variant_b["hypothesis"],
                "key_difference": variant_b["key_difference"],
                "subject_suggestion": variant_b.get("subject_suggestion", ""),
                "body_suggestion": variant_b.get("body_suggestion", ""),
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("generate_ab_variants_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"A/B variant generation failed: {str(e)}")


@app.post("/analyze-ab-results")
async def analyze_ab_results(
    variant_a: dict,
    variant_b: dict,
    test_type: str,
    sector: str = "",
) -> dict:
    """Analyze A/B test results and determine winner with statistical significance."""
    logger.info(
        "analyzing_ab_results",
        test_type=test_type,
        variant_a_sent=variant_a.get("sent", 0),
        variant_b_sent=variant_b.get("sent", 0),
    )

    try:
        sent_a = variant_a.get("sent", 0)
        sent_b = variant_b.get("sent", 0)
        opened_a = variant_a.get("opened", 0)
        opened_b = variant_b.get("opened", 0)
        clicked_a = variant_a.get("clicked", 0)
        clicked_b = variant_b.get("clicked", 0)
        replied_a = variant_a.get("replied", 0)
        replied_b = variant_b.get("replied", 0)

        open_rate_a = variant_a.get("openRate", 0)
        open_rate_b = variant_b.get("openRate", 0)
        click_rate_a = variant_a.get("clickRate", 0)
        click_rate_b = variant_b.get("clickRate", 0)
        reply_rate_a = variant_a.get("replyRate", 0)
        reply_rate_b = variant_b.get("replyRate", 0)

        # Calculate composite scores
        score_a = (open_rate_a * 0.25) + (click_rate_a * 0.40) + (reply_rate_a * 0.35)
        score_b = (open_rate_b * 0.25) + (click_rate_b * 0.40) + (reply_rate_b * 0.35)

        # Determine winner
        winner = "inconclusive"
        confidence = 0.0
        winning_margin = 0.0
        explanation = ""
        learnings = []
        recommended_action = ""

        if score_a > score_b:
            winner = "A"
            winning_margin = ((score_a - score_b) / score_b) if score_b > 0 else 0
        elif score_b > score_a:
            winner = "B"
            winning_margin = ((score_b - score_a) / score_a) if score_a > 0 else 0

        # Calculate confidence based on sample size and effect size
        min_samples = min(sent_a, sent_b)
        if min_samples >= 50:
            # Simplified confidence calculation
            if winning_margin >= 0.2:  # 20% improvement
                confidence = 0.95
            elif winning_margin >= 0.1:  # 10% improvement
                confidence = 0.85
            elif winning_margin >= 0.05:  # 5% improvement
                confidence = 0.70
            else:
                confidence = 0.50

        # Generate explanation
        if winner == "A":
            explanation = f"La variante A ganó con un margen del {winning_margin*100:.1f}%. "
            if test_type == "SUBJECT_LINE":
                explanation += f"El subject de A generó {open_rate_a*100:.1f}% apertura vs {open_rate_b*100:.1f}% de B. "
                explanation += "Esto confirma la hipótesis de que " + variant_a.get("hypothesis", "el enfoque de A funciona mejor")
            elif test_type == "COPY_FRAMEWORK":
                explanation += f"El framework de A tuvo {click_rate_a*100:.1f}% clicks vs {click_rate_b*100:.1f}% de B. "
                explanation += "La estructura de A resuena mejor con esta audiencia."
        elif winner == "B":
            explanation = f"La variante B ganó con un margen del {winning_margin*100:.1f}%. "
            if test_type == "SUBJECT_LINE":
                explanation += f"El subject de B generó {open_rate_b*100:.1f}% apertura vs {open_rate_a*100:.1f}% de A. "
                explanation += "Esto confirma la hipótesis de que " + variant_b.get("hypothesis", "el enfoque de B funciona mejor")
            elif test_type == "COPY_FRAMEWORK":
                explanation += f"El framework de B tuvo {click_rate_b*100:.1f}% clicks vs {click_rate_a*100:.1f}% de A. "
                explanation += "La estructura de B resuena mejor con esta audiencia."
        else:
            explanation = "El test no mostró un ganador claro. Ambas variantes tuvieron rendimiento similar."
            learnings.append("Las dos aproximaciones funcionan igual de bien; la audiencia no discrimina entre ellas")
            recommended_action = "Continuar usando cualquiera de las dos variantes, o probar una tercera aproximación radicalmente diferente"

        # Generate learnings based on test type
        if winner != "inconclusive":
            if test_type == "SUBJECT_LINE":
                learnings.append(f"El estilo de subject de la variante {winner} funciona {winning_margin*100:.0f}% mejor para esta audiencia")
                learnings.append("Aplicar este mismo estilo de subject a futuras secuencias")
            elif test_type == "COPY_FRAMEWORK":
                learnings.append(f"El framework de la variante {winner} genera más engagement que la alternativa")
                learnings.append("Considerar este framework como estándar para leads similares")
            elif test_type == "EMAIL_LENGTH":
                learnings.append(f"La longitud de la variante {winner} optimiza mejor el balance entre lectura y persuasión")
            elif test_type == "CTA_TYPE":
                learnings.append(f"El tipo de CTA de la variante {winner} reduce fricción para esta audiencia")
                learnings.append("Replicar este tipo de CTA en otros touchpoints")
            elif test_type == "SEND_TIME":
                learnings.append(f"El momento de envío de la variante {winner} captura mejor la atención")

            recommended_action = f"Adoptar la variante {winner} como estándar para futuros emails de esta secuencia"

        return {
            "winner": winner,
            "confidence": confidence,
            "winning_margin": winning_margin,
            "explanation": explanation,
            "learnings": learnings,
            "recommended_action": recommended_action,
            "stats": {
                "variant_a": {
                    "sent": sent_a,
                    "open_rate": open_rate_a,
                    "click_rate": click_rate_a,
                    "reply_rate": reply_rate_a,
                    "composite_score": score_a,
                },
                "variant_b": {
                    "sent": sent_b,
                    "open_rate": open_rate_b,
                    "click_rate": click_rate_b,
                    "reply_rate": reply_rate_b,
                    "composite_score": score_b,
                },
            },
        }

    except Exception as e:
        logger.error("analyze_ab_results_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"A/B results analysis failed: {str(e)}")


# ============== SECTOR CONTEXT ENDPOINT ==============

# Simple in-memory cache for sector context (1 hour TTL)
_sector_context_cache: dict[str, tuple[dict, float]] = {}
CACHE_TTL_SECONDS = 3600  # 1 hour


@app.get("/sector-context/{sector}")
async def get_sector_context(sector: str) -> dict:
    """Get all sector context formatted for prompt injection. Cached 1h."""
    logger.info("get_sector_context", sector=sector)

    # Check cache
    now = time.time()
    if sector in _sector_context_cache:
        cached_data, cached_time = _sector_context_cache[sector]
        if now - cached_time < CACHE_TTL_SECONDS:
            logger.info("sector_context_cache_hit", sector=sector)
            return cached_data

    try:
        # This endpoint expects the worker to provide the actual data
        # The AI service just formats and caches it
        # In production, this would fetch from DB or receive from worker

        # Return template structure that worker will fill
        context = {
            "sector": sector,
            "benchmark": {
                "avgOpenRate": None,  # To be filled by worker
                "avgClickRate": None,
                "bestFrameworks": [],
                "bestDayOfWeek": None,
                "bestHourRange": None,
                "avgEmailLength": None,
            },
            "vocabulary": {
                "preferred": [],
                "prohibited": [],
                "powerWords": [],
            },
            "insights": [],
            "referenceTemplates": [],
            "instruction": """
Usa el sector_context como referencia de lo que funciona en este sector:
- Prioriza los power_words en subject y CTA
- NUNCA uses palabras de la lista prohibited
- Los reference_templates son ejemplos de calidad, no los copies
- Si el benchmark indica emails cortos para este sector, respétalo
- Adapta el tono al sector: formal para legal/salud, dinámico para ecommerce/saas
""".strip(),
        }

        # Cache the result
        _sector_context_cache[sector] = (context, now)

        return context

    except Exception as e:
        logger.error("get_sector_context_failed", sector=sector, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get sector context: {str(e)}")


@app.get("/embedding-info")
async def get_embedding_info() -> dict:
    """Return information about the embedding provider configuration."""
    provider = app.state.embedding_provider
    return {
        "mode": provider.mode,
        "model_name": "BAAI/bge-m3" if provider.mode == "local" else "text-embedding-3-small",
        "dimensions": provider.vector_dimensions,
        "loaded": provider._local_model is not None if provider.mode == "local" else provider._openai_client is not None,
    }


@app.get("/embedding-cache-stats")
async def get_embedding_cache_stats() -> dict:
    """Return embedding cache statistics."""
    provider = app.state.embedding_provider
    return {
        "cache": provider.cache_stats,
        "mode": provider.mode,
        "model_name": "BAAI/bge-m3" if provider.mode == "local" else "text-embedding-3-small",
        "dimensions": provider.vector_dimensions,
        "loaded": provider._local_model is not None if provider.mode == "local" else provider._openai_client is not None,
    }


@app.post("/analyze-trend-context")
async def analyze_trend_context(request: AnalyzeTrendContextRequest) -> AnalyzeTrendContextResponse:
    """Analyze sector trends and recommend email hooks."""
    try:
        logger.info("analyze_trend_context", sector=request.sector, trends_count=len(request.trends))
        
        # Calculate metrics
        avg_score = sum(t.score for t in request.trends) / len(request.trends) if request.trends else 50
        max_change = max((t.weekly_change for t in request.trends), default=0)
        top_keyword = max(request.trends, key=lambda t: t.score, default=None)
        
        # Determine urgency
        if avg_score > 70 and max_change > 20:
            urgency_level = "high"
            summary = f"🔥 Fuerte interés en {request.sector}. Las búsquedas están en máximos históricos."
        elif avg_score > 50 or max_change > 10:
            urgency_level = "medium"
            summary = f"📈 Creciente interés en {request.sector}. Momento favorable para contactar."
        else:
            urgency_level = "low"
            summary = f"➡️ Interés estable en {request.sector}. Enfoque en valor a largo plazo."
        
        # Generate hook recommendation based on top trending keyword
        if top_keyword:
            if "precio" in top_keyword.keyword or "oferta" in top_keyword.keyword:
                recommended_hook = f"Muchos buscan '{top_keyword.keyword}' esta semana. ¿Necesita ayuda para comparar?"
            elif "curso" in top_keyword.keyword or "formacion" in top_keyword.keyword:
                recommended_hook = f"El interés por '{top_keyword.keyword}' ha crecido un {top_keyword.weekly_change:.0f}%. ¿Está actualizado?"
            else:
                recommended_hook = f"Notamos un {top_keyword.weekly_change:.0f}% más de interés en '{top_keyword.keyword}'. ¿Le interesa saber por qué?"
        else:
            recommended_hook = "Conectemos para explorar oportunidades en su sector."
        
        return AnalyzeTrendContextResponse(
            summary=summary,
            recommended_hook=recommended_hook,
            urgency_level=urgency_level
        )
    except Exception as e:
        logger.error("analyze_trend_context_failed", error=str(e))
        return AnalyzeTrendContextResponse(
            summary="No hay datos de tendencias disponibles",
            recommended_hook="Conectemos para explorar oportunidades.",
            urgency_level="low"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
