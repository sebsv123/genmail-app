-- FASE 17B: Update vector dimensions from 1536 to 1024 for BGE-M3 compatibility

-- Drop existing vector indexes (they depend on the column type)
DROP INDEX IF EXISTS "EmbeddingChunk_embedding_idx";
DROP INDEX IF EXISTS "LeadEmbedding_embedding_idx";

-- Alter EmbeddingChunk embedding column to vector(1024)
ALTER TABLE "EmbeddingChunk" 
  ALTER COLUMN "embedding" TYPE vector(1024);

-- Alter LeadEmbedding embedding column to vector(1024)
ALTER TABLE "LeadEmbedding" 
  ALTER COLUMN "embedding" TYPE vector(1024);

-- Recreate vector indexes for cosine similarity search
CREATE INDEX "EmbeddingChunk_embedding_idx" 
  ON "EmbeddingChunk" 
  USING ivfflat ("embedding" vector_cosine_ops) 
  WITH (lists = 100);

CREATE INDEX "LeadEmbedding_embedding_idx" 
  ON "LeadEmbedding" 
  USING ivfflat ("embedding" vector_cosine_ops) 
  WITH (lists = 100);
