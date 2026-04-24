FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/db/package.json ./packages/db/
COPY packages/queue/package.json ./packages/queue/
COPY packages/email-engine/package.json ./packages/email-engine/
COPY packages/lead-hunter/package.json ./packages/lead-hunter/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy all files
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client using root node_modules binary
RUN node_modules/.bin/prisma generate --schema=packages/db/prisma/schema.prisma

# Build the worker
RUN pnpm turbo run build --filter=worker

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install pnpm
RUN npm install -g pnpm@9

# Copy necessary files
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/apps/worker/package.json ./apps/worker/
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 worker
USER worker

EXPOSE 3001

CMD ["node", "apps/worker/dist/index.js"]
