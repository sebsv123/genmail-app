FROM node:20-alpine AS base

# ==================== Builder stage ====================
FROM base AS builder
WORKDIR /app

# System deps (openssl required by Prisma, libc6-compat for Alpine)
RUN apk add --no-cache libc6-compat openssl

# Install pnpm + prisma CLI globally
RUN npm install -g pnpm@9 prisma@5.22.0

# Copy EVERYTHING (simpler and more reliable than selective copies)
COPY . .

# Install all workspace dependencies (pnpm installs @prisma/client into packages/db/node_modules)
RUN pnpm install --no-frozen-lockfile

# Generate Prisma client: run from packages/db so prisma finds @prisma/client via pnpm symlinks
RUN cd packages/db && prisma generate

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
