#!/bin/bash
set -euo pipefail

source .env

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/xoberon_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "=== 数据库备份 ==="
echo "时间: $(date)"

docker compose exec -T postgres pg_dump \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --no-owner \
    --no-privileges \
    | gzip > "$BACKUP_FILE"

echo "✓ 备份完成: $BACKUP_FILE"
echo "  大小: $(du -h "$BACKUP_FILE" | cut -f1)"

find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete
echo "✓ 已清理 30 天前的备份"
