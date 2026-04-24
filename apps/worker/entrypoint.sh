#!/bin/sh
set -e

echo "===================================================="
echo "  GenMail Worker - Entrypoint"
echo "===================================================="

# Extract host and port from DATABASE_URL
# Format: postgresql://user:pass@host:port/db
DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|^[^@]+@([^:/]+).*|\1|')
DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|^[^@]+@[^:]+:([0-9]+).*|\1|')
DB_HOST=${DB_HOST:-postgres}
DB_PORT=${DB_PORT:-5432}

echo "[Entrypoint] Waiting for postgres at $DB_HOST:$DB_PORT..."
RETRIES=30
until nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
  RETRIES=$((RETRIES-1))
  if [ $RETRIES -le 0 ]; then
    echo "[Entrypoint] ERROR: Postgres not reachable after 60s. Aborting."
    exit 1
  fi
  echo "[Entrypoint] Postgres not ready, retrying in 2s... ($RETRIES retries left)"
  sleep 2
done
echo "[Entrypoint] Postgres is ready."

cd /app

# Enable pgvector extension (required by EmbeddingChunk and KnowledgeSource)
echo "[Entrypoint] Enabling pgvector extension..."
node -e "
const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect()
  .then(() => c.query('CREATE EXTENSION IF NOT EXISTS vector'))
  .then(() => c.end())
  .then(() => console.log('[Entrypoint] pgvector extension ready.'))
  .catch((e) => { console.error('[Entrypoint] WARNING:', e.message); process.exit(0); });
" 2>/dev/null || echo "[Entrypoint] pg module not available, skipping (extension may already exist)."

# Apply schema (db push for dev - idempotent, no migrations folder needed)
echo "[Entrypoint] Applying Prisma schema (db push)..."
node_modules/.bin/prisma db push --schema=packages/db/prisma/schema.prisma --accept-data-loss --skip-generate || {
  echo "[Entrypoint] ERROR: prisma db push failed."
  exit 1
}
echo "[Entrypoint] Prisma schema applied."

# Seed sector knowledge (idempotent - uses upsert)
if [ "${SEED_SECTORS:-true}" = "true" ]; then
  echo "[Entrypoint] Seeding sector knowledge..."
  node_modules/.bin/tsx packages/db/src/seed-sector-knowledge.ts || \
    echo "[Entrypoint] WARNING: Seed failed (non-fatal, continuing)."
fi

echo "[Entrypoint] Starting worker (tsx)..."
exec node_modules/.bin/tsx apps/worker/src/index.ts
