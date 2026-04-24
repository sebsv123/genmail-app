const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

export interface GenerateEmailPayload {
  enrollment_id: string;
  lead_id: string;
  business_id: string;
  lead_context: {
    name: string;
    email: string;
    context_data: Record<string, unknown>;
  };
  brand_voice: string;
  prohibited_claims: string[];
  sequence_goal: string;
  sequence_mode: string;
  step_number: number;
  template: {
    subject: string;
    body_html: string;
    body_text: string;
    copy_framework: string;
    goal: string;
  };
  lead_memory: {
    topics: string[];
    hooks: string[];
    ctas: string[];
    tone: string;
  };
  knowledge_sources: Array<{
    type: string;
    content: string;
  }>;
  send_day: string;
  send_time: string;
  timezone: string;
  sector_context?: {
    benchmark?: {
      avgOpenRate?: number;
      avgClickRate?: number;
      bestFrameworks?: string[];
      bestDayOfWeek?: string;
      bestHourRange?: string;
      avgEmailLength?: string;
    };
    vocabulary?: {
      preferred?: string[];
      prohibited?: string[];
      powerWords?: string[];
    };
    insights?: Array<{
      type: string;
      title: string;
      description: string;
    }>;
    referenceTemplates?: Array<{
      subject: string;
      bodyText: string;
      framework: string;
      qualityScore: number;
    }>;
  };
}

export interface GenerateEmailResponse {
  subject: string;
  body_html: string;
  body_text: string;
  personalization_notes: string;
  copy_framework_used: string;
  quality_score: number;
  generation_notes: string[];
}

export async function generateEmail(payload: GenerateEmailPayload): Promise<GenerateEmailResponse | null> {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/generate-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`[AI Client] Generate email failed: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json() as GenerateEmailResponse;
  } catch (error) {
    console.error("[AI Client] Error generating email:", error);
    return null;
  }
}

export interface ExtractBrandVoicePayload {
  sample_emails: string[];
  business_description: string;
}

export interface ExtractBrandVoiceResponse {
  tone: string;
  style: string;
  vocabulary_preferred: string[];
  vocabulary_avoided: string[];
  avg_length: number;
  cta_patterns: string[];
  additional_notes: string;
}

export async function extractBrandVoice(payload: ExtractBrandVoicePayload): Promise<ExtractBrandVoiceResponse | null> {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/extract-brand-voice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`[AI Client] Extract brand voice failed: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json() as ExtractBrandVoiceResponse;
  } catch (error) {
    console.error("[AI Client] Error extracting brand voice:", error);
    return null;
  }
}

export interface GenerateColdEmailPayload {
  business_id: string;
  brand_voice: string;
  prospect: {
    email: string;
    first_name?: string;
    last_name?: string;
    company_name?: string;
    company_website?: string;
    role?: string;
    source_url?: string;
    enrichment_data?: Record<string, unknown>;
  };
  icp: {
    sector: string;
    target_role: string;
    pain_points: string[];
    keywords: string[];
    location?: string;
  };
  step_number: number;
  constraints: {
    max_words: number;
    language: string;
    prohibited_claims: string[];
  };
  sector_context?: {
    benchmark?: {
      avgOpenRate?: number;
      avgClickRate?: number;
      bestFrameworks?: string[];
      bestDayOfWeek?: string;
      bestHourRange?: string;
      avgEmailLength?: string;
    };
    vocabulary?: {
      preferred?: string[];
      prohibited?: string[];
      powerWords?: string[];
    };
    insights?: Array<{
      type: string;
      title: string;
      description: string;
    }>;
    referenceTemplates?: Array<{
      subject: string;
      bodyText: string;
      framework: string;
      qualityScore: number;
    }>;
  };
}

export interface GenerateColdEmailResponse {
  subject: string;
  body_html: string;
  body_text: string;
  personalization_hooks: string[];
  copy_framework_used: string;
  quality_score: number;
}

export async function generateColdEmail(payload: GenerateColdEmailPayload): Promise<GenerateColdEmailResponse | null> {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/generate-cold-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`[AI Client] Generate cold email failed: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json() as GenerateColdEmailResponse;
  } catch (error) {
    console.error("[AI Client] Error generating cold email:", error);
    return null;
  }
}

// ============== RAG: EMBEDDINGS ==============

export interface EmbedSourcePayload {
  business_id: string;
  source_id: string;
  content: string;
  source_type: string;
  metadata?: any;
}

export interface EmbedSourceChunk {
  index: number;
  content: string;
  embedding: number[];
  metadata: any;
}

export interface EmbedSourceResponse {
  business_id: string;
  source_id: string;
  chunks: EmbedSourceChunk[];
  total_chunks: number;
}

export async function embedSource(payload: EmbedSourcePayload): Promise<EmbedSourceResponse> {
  const response = await fetch(`${AI_SERVICE_URL}/embed-source`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Embed source failed: ${response.statusText}`);
  }

  return await response.json() as EmbedSourceResponse;
}

export interface EmbedLeadPayload {
  lead_id: string;
  email: string;
  name?: string;
  stage?: string;
  intent_score?: number;
  context_data?: Record<string, any>;
}

export interface EmbedLeadResponse {
  lead_id: string;
  profile_summary: string;
  embedding: number[];
}

export async function embedLead(payload: EmbedLeadPayload): Promise<EmbedLeadResponse> {
  const response = await fetch(`${AI_SERVICE_URL}/embed-lead`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Embed lead failed: ${response.statusText}`);
  }

  return await response.json() as EmbedLeadResponse;
}

export interface SearchContextPayload {
  business_id: string;
  query: string;
  limit?: number;
}

export interface SearchContextResponse {
  business_id: string;
  query: string;
  query_embedding: number[];
  limit: number;
}

export async function searchContext(payload: SearchContextPayload): Promise<SearchContextResponse> {
  const response = await fetch(`${AI_SERVICE_URL}/search-context`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Search context failed: ${response.statusText}`);
  }

  return await response.json() as SearchContextResponse;
}
