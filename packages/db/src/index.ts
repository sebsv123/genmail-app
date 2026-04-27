import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';
export * from './vector';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Alias for compatibility (some code uses `db`, other uses `prisma`)
export const db = prisma;
