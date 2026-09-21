#!/usr/bin/env bash
# Cron entry point: POSTs /api/internal/sweep with the secret read from .env
# so the secret never lives in the crontab itself.
set -u

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$APP_DIR/backups/sweep.log"
PORT="${PORT:-3000}"

SECRET="$(grep -E '^INTERNAL_SWEEP_SECRET=' "$APP_DIR/.env" | cut -d= -f2- | sed -E "s/^['\"]//; s/['\"]$//")"
if [ -z "$SECRET" ]; then
  echo "$(date -Is) ERROR INTERNAL_SWEEP_SECRET not set in .env" >> "$LOG"
  exit 1
fi

RESP="$(curl -s -m 120 -X POST -H "x-sweep-secret: $SECRET" "http://127.0.0.1:$PORT/api/internal/sweep")"
echo "$(date -Is) $RESP" >> "$LOG"

# keep the log bounded
tail -n 2000 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
