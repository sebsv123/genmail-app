FROM node:20-alpine AS base

# ==================== Builder stage ====================
FROM base AS builder
WORKDIR /app

# System deps (openssl required by Prisma, libc6-compat for Alpine)
RUN apk add --no-cache libc6-compat openssl

# Install pnpm
RUN npm install -g pnpm@9

# Copy EVERYTHING (simpler and more reliable than selective copies)
COPY . .

# Install all workspace dependencies
RUN pnpm install --no-frozen-lockfile

# Generate Prisma client (uses hoisted binary via .npmrc shamefully-hoist)
RUN ./node_modules/.bin/prisma generate --schema=packages/db/prisma/schema.prisma

# Build the worker
RUN pnpm turbo run build --filter=worker

# ==================== Production stage ====================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl
RUN npm install -g pnpm@9

# Copy built artifacts and node_modules
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/apps/worker/package.json ./apps/worker/
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/.npmrc ./

# Non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 worker
USER worker

EXPOSE 3001

CMD ["node", "apps/worker/dist/index.js"]
