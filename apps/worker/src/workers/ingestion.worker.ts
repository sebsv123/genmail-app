import { Worker, Job } from "bullmq";
import { redisConnection, INGESTION_QUEUE } from "@genmail/queue";
import { db, calculateContentHash, searchSimilarChunks } from "@genmail/db";
import { aiClient } from "../lib/ai-client";
import axios from "axios";
import * as cheerio from "cheerio";
import { XMLParser } from "fast-xml-parser";

// Types for job data
interface IngestSourceJobData {
  sourceId: string;
}

interface IngestLeadJobData {
  leadId: string;
}

interface RefreshRSSJobData {
  // No data needed
}

/**
 * Ingestion Worker: Handles content embedding for RAG
 */
export const ingestionWorker = new Worker<IngestSourceJobData | IngestLeadJobData | RefreshRSSJobData>(
  INGESTION_QUEUE,
  async (job: Job<IngestSourceJobData | IngestLeadJobData | RefreshRSSJobData>) => {
    const jobName = job.name;
    const jobId = job.id;

    console.log(`[IngestionWorker] Processing ${jobName} (${jobId})`);

    try {
      switch (jobName) {
        case "ingest-source":
          return await processIngestSource(job.data as IngestSourceJobData);
        case "ingest-lead":
          return await processIngestLead(job.data as IngestLeadJobData);
        case "refresh-rss":
          return await processRefreshRSS();
        default:
          throw new Error(`Unknown job type: ${jobName}`);
      }
    } catch (error) {
      console.error(`[IngestionWorker] Error processing ${jobName}:`, error);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

/**
 * Process IngestSourceJob: Extract content, chunk, embed, store
 */
async function processIngestSource(data: IngestSourceJobData): Promise<{ chunksIndexed: number }> {
  const { sourceId } = data;

  // Load source from DB
  const source = await db.knowledgeSource.findUnique({
    where: { id: sourceId },
  });

  if (!source) {
    throw new Error(`KnowledgeSource not found: ${sourceId}`);
  }

  // Update status to PROCESSING
  await db.knowledgeSource.update({
    where: { id: sourceId },
    data: { status: "PROCESSING" },
  });

  let content: string;
  let extractedMetadata: any = {};

  try {
    // Extract content based on type
    switch (source.type) {
      case "RSS":
        const rssResult = await extractRSSContent(source.url || "");
        content = rssResult.content;
        extractedMetadata = rssResult.metadata;
        break;

      case "URL":
        const urlResult = await extractURLContent(source.url || "");
        content = urlResult.content;
        extractedMetadata = urlResult.metadata;
        break;

      case "DOCUMENT":
      case "SAMPLE_EMAIL":
        // Use stored content directly
        content = source.content || "";
        break;

      default:
        throw new Error(`Unsupported source type: ${source.type}`);
    }

    if (!content.trim()) {
      throw new Error("No content to process");
    }

    // Call AI service to embed source
    const embedResponse = await aiClient.embedSource({
      business_id: source.businessId,
      source_id: sourceId,
      content,
      source_type: source.type,
      metadata: {
        ...source.metadata,
        ...extractedMetadata,
        title: source.name,
      },
    });

    // Delete existing chunks for this source (re-ingest)
    await db.embeddingChunk.deleteMany({
      where: { sourceId },
    });

    // Store chunks with deduplication
    let chunksIndexed = 0;
    for (const chunk of embedResponse.chunks) {
      const contentHash = calculateContentHash(chunk.content);

      // Check for duplicate (businessId + contentHash unique constraint)
      const existing = await db.embeddingChunk.findUnique({
        where: {
          businessId_contentHash: {
            businessId: source.businessId,
            contentHash,
          },
        },
      });

      if (existing) {
        console.log(`[IngestionWorker] Skipping duplicate chunk for source ${sourceId}`);
        continue;
      }

      // Store chunk
      await db.embeddingChunk.create({
        data: {
          businessId: source.businessId,
          sourceId,
          content: chunk.content,
          contentHash,
          embedding: chunk.embedding as any,
          metadata: chunk.metadata,
        },
      });

      chunksIndexed++;
    }

    // Update source status to READY
    await db.knowledgeSource.update({
      where: { id: sourceId },
      data: {
        status: "READY",
        lastSyncedAt: new Date(),
        metadata: {
          ...source.metadata,
          ...extractedMetadata,
          lastIngested: new Date().toISOString(),
          chunksIndexed,
        },
      },
    });

    console.log(`[IngestionWorker] Indexed ${chunksIndexed} chunks for source ${sourceId}`);

    return { chunksIndexed };

  } catch (error: any) {
    // Update source status to ERROR
    await db.knowledgeSource.update({
      where: { id: sourceId },
      data: {
        status: "ERROR",
        metadata: {
          ...source.metadata,
          error: error.message,
          errorAt: new Date().toISOString(),
        },
      },
    });

    throw error;
  }
}

/**
 * Process IngestLeadJob: Create lead embedding
 */
async function processIngestLead(data: IngestLeadJobData): Promise<{ success: boolean }> {
  const { leadId } = data;

  // Load lead with context
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    include: {
      business: true,
    },
  });

  if (!lead) {
    throw new Error(`Lead not found: ${leadId}`);
  }

  // Call AI service to embed lead
  const embedResponse = await aiClient.embedLead({
    lead_id: leadId,
    email: lead.email,
    name: lead.name || undefined,
    stage: lead.stage,
    intent_score: lead.intentScore || undefined,
    context_data: lead.contextData as any,
  });

  // Upsert lead embedding
  await db.leadEmbedding.upsert({
    where: { leadId },
    create: {
      leadId,
      profileSummary: embedResponse.profile_summary,
      embedding: embedResponse.embedding as any,
    },
    update: {
      profileSummary: embedResponse.profile_summary,
      embedding: embedResponse.embedding as any,
    },
  });

  console.log(`[IngestionWorker] Embedded lead ${leadId}`);

  return { success: true };
}

/**
 * Process RefreshRSSJob: Re-ingest all RSS sources
 */
async function processRefreshRSS(): Promise<{ sourcesRefreshed: number }> {
  // Find all RSS sources with READY status
  const rssSources = await db.knowledgeSource.findMany({
    where: {
      type: "RSS",
      status: "READY",
    },
  });

  console.log(`[IngestionWorker] Refreshing ${rssSources.length} RSS sources`);

  // Import queue dynamically to avoid circular dependency
  const { addIngestSourceJob } = await import("@genmail/queue");

  // Queue ingestion jobs for each RSS source
  for (const source of rssSources) {
    await addIngestSourceJob(source.id);
    console.log(`[IngestionWorker] Queued re-ingest for RSS source ${source.id}`);
  }

  return { sourcesRefreshed: rssSources.length };
}

/**
 * Extract content from RSS feed
 */
async function extractRSSContent(url: string): Promise<{ content: string; metadata: any }> {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent": "GenMail Bot/1.0",
      },
    });

    const parser = new XMLParser({
      ignoreAttributes: false,
      parseAttributeValue: false,
    });

    const feed = parser.parse(response.data);
    const items = feed.rss?.channel?.item || feed.feed?.entry || [];
    const itemArray = Array.isArray(items) ? items : [items];

    // Extract content from recent items
    const contents: string[] = [];
    const metadata: any = {
      title: feed.rss?.channel?.title || feed.feed?.title,
      feedUrl: url,
      itemCount: itemArray.length,
    };

    for (const item of itemArray.slice(0, 20)) {
      // Get title and description
      const title = item.title || "";
      const description = item.description || item.summary || "";
      const link = item.link || item.id || "";
      const pubDate = item.pubDate || item.published || "";

      if (title || description) {
        contents.push(`${title}\n${description}\n${link}`);
      }
    }

    return {
      content: contents.join("\n\n---\n\n"),
      metadata,
    };
  } catch (error) {
    console.error(`[IngestionWorker] Failed to fetch RSS from ${url}:`, error);
    throw new Error(`RSS fetch failed: ${(error as Error).message}`);
  }
}

/**
 * Extract content from URL
 */
async function extractURLContent(url: string): Promise<{ content: string; metadata: any }> {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GenMail Bot/1.0)",
      },
    });

    const $ = cheerio.load(response.data);

    // Remove script, style, nav, footer elements
    $("script, style, nav, footer, header, aside, iframe, .advertisement").remove();

    // Extract title
    const title = $("title").text().trim() || $("h1").first().text().trim();

    // Extract main content
    // Try common content containers
    let content = "";
    const contentSelectors = [
      "article",
      "main",
      "[role='main']",
      ".content",
      ".article-content",
      ".post-content",
      ".entry-content",
      "body",
    ];

    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text();
        break;
      }
    }

    // Clean up whitespace
    content = content
      .replace(/\s+/g, " ")
      .replace(/\n+/g, "\n")
      .trim();

    // Extract description
    const description = $("meta[name='description']").attr("content") || "";

    return {
      content: `${title}\n\n${description}\n\n${content}`,
      metadata: {
        title,
        description,
        url,
      },
    };
  } catch (error) {
    console.error(`[IngestionWorker] Failed to fetch URL ${url}:`, error);
    throw new Error(`URL fetch failed: ${(error as Error).message}`);
  }
}
