#!/bin/bash
set -euo pipefail

BACKUP_DIR=~/backups/invoice
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
KEEP_DAYS=14

COMPOSE="docker compose -f ~/invoice_app/docker-compose.prod.yml"

echo "=== Invoice App Backup ==="
echo "Timestamp: $TIMESTAMP"
echo ""

# Load env for DB credentials
ENV_FILE=""
for f in ~/invoice_app/.env.prod ~/invoice_app/.env.production ~/invoice_app/.env; do
  if [ -f "$f" ]; then ENV_FILE="$f"; break; fi
done

if [ -n "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  echo "❌ No .env file found. Looked for .env.prod, .env.production, .env"
  exit 1
fi

if [ -z "${DB_USER:-}" ]; then
  echo "❌ DB_USER not set in $ENV_FILE"
  exit 1
fi

# Derive env label from which file was loaded
case "$ENV_FILE" in
  *prod*) ENV_LABEL="prod" ;;
  *)
    echo "⚠️  Dev environment detected — backups are for production only."
    exit 0
    ;;
esac

DB_BACKUP_DIR=$BACKUP_DIR/$ENV_LABEL/db
FILES_BACKUP_DIR=$BACKUP_DIR/$ENV_LABEL/files

mkdir -p "$DB_BACKUP_DIR" "$FILES_BACKUP_DIR"

echo "Environment: $ENV_LABEL ($DB_HOST/$DB_NAME)"
echo ""

# --- Database ---
# Runs pg_dump *inside* the db_prod container via `compose exec`, not as a host-side pg_dump
# connecting over TCP — db_prod has no `ports:` mapping at all (deliberately, never reachable
# from outside the compose network), so a host-side connection attempt would just fail. This
# also means no postgresql-client needs to be installed on the host anymore.
echo "📦 Backing up database..."
DB_FILE="$DB_BACKUP_DIR/${DB_NAME}_$TIMESTAMP.sql.gz"

$COMPOSE exec -T -e PGPASSWORD="$DB_PASS" db_prod \
  pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges \
  | gzip > "$DB_FILE"

DB_SIZE=$(du -sh "$DB_FILE" | cut -f1)
echo "   Saved: $DB_FILE ($DB_SIZE)"

# --- Storage files ---
echo ""
echo "📁 Backing up storage files..."
STORAGE_VOLUME="invoice_app_storage_${ENV_LABEL}"
FILES_FILE="$FILES_BACKUP_DIR/storage_$TIMESTAMP.tar.gz"

if docker volume inspect "$STORAGE_VOLUME" &>/dev/null; then
  docker run --rm -v "${STORAGE_VOLUME}:/data" alpine tar -czf - -C /data . > "$FILES_FILE"
  FILES_SIZE=$(du -sh "$FILES_FILE" | cut -f1)
  echo "   Saved: $FILES_FILE ($FILES_SIZE)"
else
  echo "   Skipped — storage volume not found (no files uploaded yet?)"
fi

# --- Prune old backups ---
echo ""
echo "🧹 Pruning backups older than $KEEP_DAYS days..."
DB_PRUNED=$(find "$DB_BACKUP_DIR" -name "*.sql.gz" -mtime +"$KEEP_DAYS" -print -delete | wc -l)
FILES_PRUNED=$(find "$FILES_BACKUP_DIR" -name "*.tar.gz" -mtime +"$KEEP_DAYS" -print -delete | wc -l)
echo "   Removed: $DB_PRUNED db backup(s), $FILES_PRUNED file backup(s)"

# --- Summary ---
echo ""
echo "=== Summary ==="
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
DB_COUNT=$(find "$DB_BACKUP_DIR" -name "*.sql.gz" | wc -l)
FILES_COUNT=$(find "$FILES_BACKUP_DIR" -name "*.tar.gz" | wc -l)
echo "   DB backups retained:   $DB_COUNT"
echo "   File backups retained: $FILES_COUNT"
echo "   Total backup size:     $TOTAL_SIZE"
echo "   Location:              $BACKUP_DIR"
echo ""
echo "✅ Backup complete."
