import { PrismaClient, Prisma } from "@prisma/client";

// Raw SQL for vector similarity search using pgvector
export async function searchSimilarChunks(
  prisma: PrismaClient,
  businessId: string,
  queryEmbedding: number[],
  limit: number = 5
): Promise<Array<{ id: string; content: string; metadata: any; similarity: number }>> {
  const embeddingString = `[${queryEmbedding.join(",")}]`;

  // Use cosine similarity: 1 - distance = similarity
  // The <=> operator computes cosine distance (0 = identical, 2 = opposite)
  const result = await prisma.$queryRaw`
    SELECT 
      id,
      content,
      metadata,
      1 - (embedding <=> ${embeddingString}::vector) AS similarity
    FROM "EmbeddingChunk"
    WHERE "businessId" = ${businessId}
    ORDER BY embedding <=> ${embeddingString}::vector
    LIMIT ${limit}
  `;

  return result as any;
}

export async function searchSimilarChunksWithThreshold(
  prisma: PrismaClient,
  businessId: string,
  queryEmbedding: number[],
  limit: number = 5,
  similarityThreshold: number = 0.75
): Promise<Array<{ id: string; content: string; metadata: any; similarity: number }>> {
  const embeddingString = `[${queryEmbedding.join(",")}]`;

  const result = await prisma.$queryRaw`
    SELECT 
      id,
      content,
      metadata,
      1 - (embedding <=> ${embeddingString}::vector) AS similarity
    FROM "EmbeddingChunk"
    WHERE "businessId" = ${businessId}
      AND 1 - (embedding <=> ${embeddingString}::vector) >= ${similarityThreshold}
    ORDER BY embedding <=> ${embeddingString}::vector
    LIMIT ${limit}
  `;

  return result as any;
}

// Get total chunks count for a business
export async function getChunksCount(
  prisma: PrismaClient,
  businessId: string
): Promise<number> {
  const result = await prisma.embeddingChunk.count({
    where: { businessId },
  });
  return result;
}

// Get chunks count by source
export async function getChunksCountBySource(
  prisma: PrismaClient,
  sourceId: string
): Promise<number> {
  const result = await prisma.embeddingChunk.count({
    where: { sourceId },
  });
  return result;
}

// Delete all chunks for a source (used when re-indexing)
export async function deleteChunksBySource(
  prisma: PrismaClient,
  sourceId: string
): Promise<number> {
  const result = await prisma.embeddingChunk.deleteMany({
    where: { sourceId },
  });
  return result.count;
}

// Calculate content hash for deduplication
export function calculateContentHash(content: string): string {
  // Simple hash function - in production use a proper crypto hash
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}
