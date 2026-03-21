#!/bin/bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Arca — Nightly Backup Script
#  Runs inside the backup-cron container via cron.
#  Performs an atomic SQLite backup (safe with WAL mode),
#  compresses it, prunes old backups, and optionally syncs
#  the latest backup to Nextcloud.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

set -euo pipefail

BACKUP_DIR="/data/backups"
DB_PATH="${DATABASE_PATH:-/data/sqlite/arca.db}"
DATE=$(date +%Y-%m-%d_%H%M)
BACKUP_FILE="$BACKUP_DIR/arca_$DATE.db"
RETENTION="${BACKUP_RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting backup..."

# Atomic SQLite backup — safe during live writes (WAL mode)
sqlite3 "$DB_PATH" ".backup $BACKUP_FILE"

# Compress
gzip "$BACKUP_FILE"
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Backup written: arca_$DATE.db.gz"

# Prune old backups
find "$BACKUP_DIR" -name "arca_*.db.gz" -mtime +"$RETENTION" -delete
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Pruned backups older than $RETENTION days"

# Optional: sync to Nextcloud
if [ -n "${NEXTCLOUD_URL:-}" ] && [ -n "${NEXTCLOUD_USER:-}" ]; then
  DEST="${NEXTCLOUD_URL}/remote.php/dav/files/${NEXTCLOUD_USER}/Arca-Backups/"
  curl --silent --fail \
    -u "${NEXTCLOUD_USER}:${NEXTCLOUD_PASSWORD}" \
    -T "${BACKUP_FILE}.gz" \
    "$DEST" && echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Synced to Nextcloud: $DEST"
fi

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Backup complete."
