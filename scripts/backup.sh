#!/bin/bash
set -euo pipefail

BACKUP_DIR="/data/backups"
DB_PATH="${DATABASE_PATH:-/data/sqlite/arca.db}"
DATE=$(date +%Y-%m-%d_%H%M)
BACKUP_FILE="$BACKUP_DIR/arca_$DATE.db"
RETENTION="${BACKUP_RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB_PATH" ]; then
  echo "Database not found at $DB_PATH, skipping backup."
  exit 0
fi

sqlite3 "$DB_PATH" ".backup $BACKUP_FILE"
gzip "$BACKUP_FILE"
find "$BACKUP_DIR" -name "arca_*.db.gz" -mtime +"$RETENTION" -delete

echo "Backup complete: arca_$DATE.db.gz"
