/**
 * Re-indexing Script for Embedding Migration (FASE 17B)
 * 
 * Re-processes all EmbeddingChunks and LeadEmbeddings with the new model.
 * Must be run AFTER the BGE-M3 model is deployed and the dimension migration is applied.
 * 
 * Usage: npx tsx src/reindex-embeddings.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const BATCH_SIZE = 50;

interface SourceData {
  id: string;
  businessId: string;
  content: string;
  type: string;
  name: string;
  metadata: any;
}

async function reindexChunks(): Promise<{ processed: number; errors: number }> {
  console.log("\n=== Re-indexing EmbeddingChunks ===");
  
  // Get all knowledge sources that have chunks
  const sources = await prisma.$queryRaw`
    SELECT DISTINCT s.id, s."businessId", s.content, s.type, s.name, s.metadata
    FROM "KnowledgeSource" s
    INNER JOIN "EmbeddingChunk" ec ON ec."sourceId" = s.id
    WHERE s.status = 'INDEXED'
  ` as SourceData[];

  console.log(`Found ${sources.length} sources to re-index`);

  let processed = 0;
  let errors = 0;

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    const progress = `Re-indexando: ${i + 1}/${sources.length} sources...`;
    process.stdout.write(`\r${progress}`);

    try {
      // Delete old chunks for this source
      await prisma.embeddingChunk.deleteMany({
        where: { sourceId: source.id },
      });

      // Call AI service to re-embed
      const response = await fetch(`${AI_SERVICE_URL}/embed-source`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: source.businessId,
          source_id: source.id,
          content: source.content,
          source_type: source.type,
          metadata: {
            ...source.metadata,
            title: source.name,
            reindexedAt: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) {
        console.error(`\nFailed to re-index source ${source.id}: ${response.statusText}`);
        errors++;
        continue;
      }

      const result = await response.json();
      processed += result.total_chunks || 0;

    } catch (error) {
      console.error(`\nError re-indexing source ${source.id}:`, error);
      errors++;
    }
  }

  console.log(`\n\nChunks re-indexed: ${processed}`);
  console.log(`Errors: ${errors}`);
  return { processed, errors };
}

async function reindexLeads(): Promise<{ processed: number; errors: number }> {
  console.log("\n=== Re-indexing LeadEmbeddings ===");

  const leads = await prisma.lead.findMany({
    where: {
      embedding: { isNot: null },
    },
    select: {
      id: true,
      email: true,
      name: true,
      stage: true,
      intentScore: true,
      contextData: true,
    },
  });

  console.log(`Found ${leads.length} leads to re-index`);

  let processed = 0;
  let errors = 0;

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const progress = `Re-indexando: ${i + 1}/${leads.length} leads...`;
    process.stdout.write(`\r${progress}`);

    try {
      // Delete old embedding
      await prisma.leadEmbedding.deleteMany({
        where: { leadId: lead.id },
      });

      // Call AI service to re-embed
      const response = await fetch(`${AI_SERVICE_URL}/embed-lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: lead.id,
          email: lead.email,
          name: lead.name || undefined,
          stage: lead.stage,
          intent_score: lead.intentScore || undefined,
          context_data: lead.contextData as any,
        }),
      });

      if (!response.ok) {
        console.error(`\nFailed to re-index lead ${lead.id}: ${response.statusText}`);
        errors++;
        continue;
      }

      const result = await response.json();
      
      // Create new embedding
      await prisma.leadEmbedding.create({
        data: {
          leadId: lead.id,
          profileSummary: result.profile_summary,
          embedding: result.embedding as any,
        },
      });

      processed++;

    } catch (error) {
      console.error(`\nError re-indexing lead ${lead.id}:`, error);
      errors++;
    }
  }

  console.log(`\n\nLeads re-indexed: ${processed}`);
  console.log(`Errors: ${errors}`);
  return { processed, errors };
}

async function main() {
  console.log("🔄 Starting embedding re-indexing for BGE-M3 migration...");
  console.log(`AI Service: ${AI_SERVICE_URL}`);
  console.log(`Batch size: ${BATCH_SIZE}`);

  const startTime = Date.now();

  try {
    // Re-index sources
    const chunkResult = await reindexChunks();
    
    // Re-index leads
    const leadResult = await reindexLeads();

    const duration = (Date.now() - startTime) / 1000;
    
    console.log("\n=== Summary ===");
    console.log(`Chunks re-indexed: ${chunkResult.processed}`);
    console.log(`Chunk errors: ${chunkResult.errors}`);
    console.log(`Leads re-indexed: ${leadResult.processed}`);
    console.log(`Lead errors: ${leadResult.errors}`);
    console.log(`Total time: ${duration.toFixed(1)}s`);

    if (chunkResult.errors > 0 || leadResult.errors > 0) {
      console.log("\n⚠️  Some items failed to re-index. Check logs above.");
      process.exit(1);
    }

    console.log("\n✅ Re-indexing completed successfully!");
  } catch (error) {
    console.error("\n❌ Re-indexing failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
