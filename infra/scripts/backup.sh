#!/bin/bash
# ============================================================================
# GenMail Database Backup Script
# Creates daily compressed backups of PostgreSQL database
# ============================================================================

set -e

INSTALL_DIR="/opt/genmail"
BACKUP_DIR="/opt/backups/genmail"
COMPOSE_FILE="$INSTALL_DIR/infra/docker-compose.prod.yml"
RETENTION_DAYS=7

echo "💾 GenMail Database Backup"
echo "======================================"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Load environment variables
if [ -f "$INSTALL_DIR/.env.production" ]; then
    export $(grep -v '^#' "$INSTALL_DIR/.env.production" | xargs)
else
    echo "❌ Error: .env.production file not found"
    exit 1
fi

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/genmail_backup_$TIMESTAMP.sql.gz"

echo "📦 Creating backup: genmail_backup_$TIMESTAMP.sql.gz"

# Run pg_dump inside postgres container
docker compose -f "$COMPOSE_FILE" exec -T postgres \
    pg_dump -U "${POSTGRES_USER:-postgres}" -d genmail | gzip > "$BACKUP_FILE"

# Verify backup was created
if [ -f "$BACKUP_FILE" ]; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup created successfully: $FILE_SIZE"
else
    echo "❌ Backup failed!"
    exit 1
fi

# Clean up old backups (keep last 7 days)
echo "🧹 Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "genmail_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Count remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "genmail_backup_*.sql.gz" | wc -l)
echo "📊 Total backups stored: $BACKUP_COUNT"

echo ""
echo "======================================"
echo "✅ Backup completed!"
echo "======================================"
echo "Location: $BACKUP_FILE"

# Optional: Upload to S3 if AWS credentials are configured
if [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$AWS_SECRET_ACCESS_KEY" ] && [ -n "$S3_BUCKET" ]; then
    echo "☁️  Uploading to S3..."
    aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/backups/" --storage-class STANDARD_IA
    echo "✅ Uploaded to S3"
fi
