FROM node:20-alpine AS base

# ==================== Builder stage ====================
FROM base AS builder
WORKDIR /app

# System deps (openssl required by Prisma, libc6-compat for Alpine)
RUN apk add --no-cache libc6-compat openssl

# Install pnpm globally
RUN npm install -g pnpm@9

# Copy everything
COPY . .

# Install all workspace deps (prisma + @prisma/client now in root package.json)
RUN pnpm install --no-frozen-lockfile

# Generate Prisma client using hoisted binary from root node_modules
RUN node_modules/.bin/prisma generate --schema=packages/db/prisma/schema.prisma

# Build internal packages only (worker runs via tsx, no build needed)
# This compiles @genmail/db, @genmail/queue, @genmail/email-engine, @genmail/lead-hunter, @genmail/shared
RUN pnpm turbo run build --filter=@genmail/db --filter=@genmail/queue --filter=@genmail/email-engine --filter=@genmail/lead-hunter --filter=@genmail/shared

# ==================== Production stage ====================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl netcat-openbsd
RUN npm install -g pnpm@9 tsx

# Copy worker source (runs via tsx, no compile step) and node_modules
COPY --from=builder /app/apps/worker/src ./apps/worker/src
COPY --from=builder /app/apps/worker/package.json ./apps/worker/
COPY --from=builder /app/apps/worker/tsconfig.json ./apps/worker/
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/.npmrc ./

# Copy entrypoint script (strip CRLF in case it was created on Windows)
COPY apps/worker/entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 3001

# Run entrypoint as root so it can do migrate/seed (Postgres-only operations)
ENTRYPOINT ["/entrypoint.sh"]
