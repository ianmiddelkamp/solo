#!/bin/bash
set -euo pipefail

# First arg labels the backup by what triggered it. The deploy workflow passes "pre-deploy"
# explicitly; anything run without an arg (the existing cron entry, or running it by hand)
# defaults to "auto" — avoids needing to update the crontab entry just to add a label.
REASON="${1:-auto}"

BACKUP_DIR=~/backups/invoice
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
KEEP_DAYS=14

COMPOSE="docker compose -f $HOME/invoice_app/docker-compose.prod.yml"

# Pings Healthchecks.io on failure (any command failing under `set -e`, or an uncaught error) so
# a missed/broken backup is actually noticed — not just a silently missing file weeks later.
# HEALTHCHECK_URL comes from .env.prod (loaded below), not hardcoded here — guarded since this
# trap is registered before that file is loaded, and `set -u` would otherwise error on the
# unset var if a failure happens before then. `|| true` on every ping: never let the
# notification itself be why the script fails.
notify_fail() {
  [ -n "${HEALTHCHECK_URL:-}" ] && curl -fsS -m 10 --retry 3 "$HEALTHCHECK_URL/fail" >/dev/null 2>&1
  true
}
trap notify_fail ERR

echo "=== Invoice App Backup ($REASON) ==="
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

# One folder per backup run (reason + timestamp), db/ and files/ separated inside it — e.g.
#   ~/backups/invoice/prod/pre-deploy_20260814_140300/db/invoice_prod.sql.gz
#   ~/backups/invoice/prod/pre-deploy_20260814_140300/files/storage.tar.gz
# so "the snapshot from right before that migration" is a single, obviously-named folder rather
# than having to match up timestamps across separate flat db/ and files/ directories.
RUN_LABEL="${REASON}_${TIMESTAMP}"
RUN_DIR="$BACKUP_DIR/$ENV_LABEL/$RUN_LABEL"
DB_BACKUP_DIR="$RUN_DIR/db"
FILES_BACKUP_DIR="$RUN_DIR/files"

mkdir -p "$DB_BACKUP_DIR" "$FILES_BACKUP_DIR"

echo "Environment: $ENV_LABEL ($DB_HOST/$DB_NAME)"
echo "Run folder:  $RUN_DIR"
echo ""

# --- Database ---
# Runs pg_dump *inside* the db_prod container via `compose exec`, not as a host-side pg_dump
# connecting over TCP — db_prod has no `ports:` mapping at all (deliberately, never reachable
# from outside the compose network), so a host-side connection attempt would just fail. This
# also means no postgresql-client needs to be installed on the host anymore.
echo "📦 Backing up database..."
DB_FILE="$DB_BACKUP_DIR/${DB_NAME}.sql.gz"

$COMPOSE exec -T -e PGPASSWORD="$DB_PASS" db_prod \
  pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges \
  | gzip > "$DB_FILE"

DB_SIZE=$(du -sh "$DB_FILE" | cut -f1)
echo "   Saved: $DB_FILE ($DB_SIZE)"

# --- Storage files ---
echo ""
echo "📁 Backing up storage files..."
STORAGE_VOLUME="invoice_app_storage_${ENV_LABEL}"
FILES_FILE="$FILES_BACKUP_DIR/storage.tar.gz"

if docker volume inspect "$STORAGE_VOLUME" &>/dev/null; then
  docker run --rm -v "${STORAGE_VOLUME}:/data" alpine tar -czf - -C /data . > "$FILES_FILE"
  FILES_SIZE=$(du -sh "$FILES_FILE" | cut -f1)
  echo "   Saved: $FILES_FILE ($FILES_SIZE)"
else
  echo "   Skipped — storage volume not found (no files uploaded yet?)"
fi

# --- Offsite upload (Cloudflare R2, S3-compatible) ---
echo ""
if [ -z "${BACKUP_STORAGE_URL:-}" ] || [ -z "${BACKUP_STORAGE_ACCESS_KEY_ID:-}" ]; then
  echo "☁️  Offsite upload skipped — BACKUP_STORAGE_* not set in $ENV_FILE"
elif ! command -v aws &>/dev/null; then
  echo "☁️  Offsite upload skipped — aws CLI not installed (sudo apt install -y awscli)"
else
  echo "☁️  Uploading offsite to Cloudflare R2..."
  # BACKUP_STORAGE_URL includes the bucket as its path, e.g.
  # https://<account_id>.r2.cloudflarestorage.com/<bucket_name> — split into the bare endpoint
  # (everything before the last /) and the bucket name (everything after).
  R2_ENDPOINT="${BACKUP_STORAGE_URL%/*}"
  R2_BUCKET="${BACKUP_STORAGE_URL##*/}"

  export AWS_ACCESS_KEY_ID="$BACKUP_STORAGE_ACCESS_KEY_ID"
  export AWS_SECRET_ACCESS_KEY="$BACKUP_STORAGE_SECRET_ACCESS_KEY"
  # R2 only accepts its own region set (auto, wnam, enam, weur, eeur, apac, oc) — not standard
  # AWS regions. Without this, aws-cli falls back to some ambient/default region that R2 rejects.
  export AWS_DEFAULT_REGION="auto"

  # Mirrors the same run-folder structure remotely: <bucket>/<run_label>/db/... and .../files/...
  aws s3 cp "$DB_FILE" "s3://$R2_BUCKET/$RUN_LABEL/db/" --endpoint-url "$R2_ENDPOINT" --region auto --only-show-errors
  echo "   Uploaded: $RUN_LABEL/db/$(basename "$DB_FILE")"

  if [ -f "$FILES_FILE" ]; then
    aws s3 cp "$FILES_FILE" "s3://$R2_BUCKET/$RUN_LABEL/files/" --endpoint-url "$R2_ENDPOINT" --region auto --only-show-errors
    echo "   Uploaded: $RUN_LABEL/files/$(basename "$FILES_FILE")"
  fi

  unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_DEFAULT_REGION
fi

# --- Prune old backups ---
# Prunes whole run-folders older than KEEP_DAYS (based on the folder's mtime), not individual
# files within them, since a run-folder is the atomic unit now.
echo ""
echo "🧹 Pruning backups older than $KEEP_DAYS days..."
PRUNED=$(find "$BACKUP_DIR/$ENV_LABEL" -mindepth 1 -maxdepth 1 -type d -mtime +"$KEEP_DAYS" -print)
if [ -n "$PRUNED" ]; then
  echo "$PRUNED" | while IFS= read -r dir; do rm -rf "$dir"; done
fi
PRUNED_COUNT=$(echo "$PRUNED" | grep -c . || true)
echo "   Removed: $PRUNED_COUNT backup run(s)"

# --- Summary ---
echo ""
echo "=== Summary ==="
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
RUN_COUNT=$(find "$BACKUP_DIR/$ENV_LABEL" -mindepth 1 -maxdepth 1 -type d | wc -l)
echo "   Backup runs retained: $RUN_COUNT"
echo "   Total backup size:    $TOTAL_SIZE"
echo "   Location:             $BACKUP_DIR/$ENV_LABEL"
echo ""
echo "✅ Backup complete."

if [ -n "${HEALTHCHECK_URL:-}" ]; then
  curl -fsS -m 10 --retry 3 "$HEALTHCHECK_URL" >/dev/null 2>&1 || true
fi
