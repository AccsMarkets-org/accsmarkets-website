#!/usr/bin/env bash
# Cron entry point: POSTs /api/internal/daily-email with the secret read from
# .env so the secret never lives in the crontab itself. This endpoint uses a
# different credential from the sweeps: "Authorization: Bearer $CRON_SECRET".
# Run once a day; its campaign keys are date-scoped, so it is safe alongside
# run-marketing-sweep.sh (whichever runs second that day skips). Suggested
# crontab line:
#   0 15 * * * /path/to/app/scripts/run-daily-email.sh
set -u

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$APP_DIR/backups/daily-email.log"
PORT="${PORT:-3000}"

SECRET="$(grep -E '^CRON_SECRET=' "$APP_DIR/.env" | cut -d= -f2- | sed -E "s/^['\"]//; s/['\"]$//")"
if [ -z "$SECRET" ]; then
  echo "$(date -Is) ERROR CRON_SECRET not set in .env" >> "$LOG"
  exit 1
fi

# Long timeout: the send loops over the whole opted-in user base.
RESP="$(curl -s -m 1800 -X POST -H "Authorization: Bearer $SECRET" "http://127.0.0.1:$PORT/api/internal/daily-email")"
echo "$(date -Is) $RESP" >> "$LOG"

# keep the log bounded
tail -n 2000 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
