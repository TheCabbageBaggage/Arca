#!/bin/bash
# Reset Arca database and seed with bootstrap data
# Usage: ./scripts/reset-db.sh

set -e

DB_PATH="data/sqlite/arca.db"
if [ -n "$1" ]; then
  DB_PATH="$1"
fi

BACKUP_DIR="data/backups"

echo "Arca Database Reset Script"
echo "=========================="
echo "Database: $DB_PATH"
echo ""

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Backup existing database if it exists
if [ -f "$DB_PATH" ]; then
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  BACKUP_FILE="$BACKUP_DIR/arca_backup_${TIMESTAMP}.db"
  echo "Backing up existing database to: $BACKUP_FILE"
  cp "$DB_PATH" "$BACKUP_FILE"
  echo "Backup created."
else
  echo "No existing database found at $DB_PATH"
fi

# Remove existing database
echo "Removing existing database..."
rm -f "$DB_PATH"

# Create directory for database
mkdir -p "$(dirname "$DB_PATH")"

echo "Database removed. Ready for fresh setup."
echo ""
echo "To set up a fresh database:"
echo "1. Run migrations: docker compose exec backend npm run db:migrate"
echo "2. Seed data: sqlite3 \"$DB_PATH\" < scripts/seed-bootstrap.sql"
echo "3. Or use complete seed: sqlite3 \"$DB_PATH\" < scripts/seed-complete.sql"
