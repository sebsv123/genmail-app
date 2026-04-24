-- Add vector embeddings support

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEmbeddingChunk table
CREATE TABLE "EmbeddingChunk" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "businessId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    content TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    embedding vector(1536) NOT NULL,
    metadata JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmbeddingChunk_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"(id) ON DELETE CASCADE
);

-- Create indexes for EmbeddingChunk
CREATE INDEX "EmbeddingChunk_businessId_idx" ON "EmbeddingChunk"("businessId");
CREATE UNIQUE INDEX "EmbeddingChunk_businessId_contentHash_key" ON "EmbeddingChunk"("businessId", "contentHash");

-- Create vector similarity search index (IVFFlat for approximate nearest neighbor)
CREATE INDEX ON "EmbeddingChunk" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create LeadEmbedding table
CREATE TABLE "LeadEmbedding" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "leadId" TEXT NOT NULL UNIQUE,
    "profileSummary" TEXT NOT NULL,
    embedding vector(1536) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadEmbedding_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"(id) ON DELETE CASCADE
);

-- Create indexes for LeadEmbedding
CREATE INDEX "LeadEmbedding_leadId_idx" ON "LeadEmbedding"("leadId");

-- Create vector similarity search index for lead embeddings
CREATE INDEX ON "LeadEmbedding" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
