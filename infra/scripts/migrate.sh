#!/bin/bash
# ============================================================================
# GenMail Database Migration Script
# Run Prisma migrations in production
# ============================================================================

set -e

INSTALL_DIR="/opt/genmail"
COMPOSE_FILE="$INSTALL_DIR/infra/docker-compose.prod.yml"

echo "🗄️  GenMail Database Migration"
echo "======================================"

# Check if running as root (should not be)
if [ "$EUID" -eq 0 ]; then
   echo "⚠️  Warning: Running as root. Consider using a non-root user with docker permissions."
fi

# Check if docker-compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ Error: Docker compose file not found at $COMPOSE_FILE"
    exit 1
fi

# Load environment variables
echo "🔐 Loading environment..."
if [ -f "$INSTALL_DIR/.env.production" ]; then
    export $(grep -v '^#' "$INSTALL_DIR/.env.production" | xargs)
else
    echo "❌ Error: .env.production file not found at $INSTALL_DIR"
    exit 1
fi

# Check if services are running
echo "🔍 Checking services..."
if ! docker compose -f "$COMPOSE_FILE" ps | grep -q "postgres"; then
    echo "❌ Error: PostgreSQL container is not running"
    echo "   Start services first: docker compose -f $COMPOSE_FILE up -d"
    exit 1
fi

# Wait for postgres to be ready
echo "⏳ Waiting for PostgreSQL..."
until docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U "${POSTGRES_USER:-postgres}" > /dev/null 2>&1; do
    echo "   PostgreSQL is unavailable - sleeping 1s"
    sleep 1
done

# Run migrations using worker container (has prisma)
echo "🚀 Running Prisma migrations..."
docker compose -f "$COMPOSE_FILE" run --rm --entrypoint "" worker \
    npx prisma migrate deploy \
    --schema=/app/packages/db/prisma/schema.prisma

echo ""
echo "======================================"
echo "✅ Migration completed successfully!"
echo "======================================"
