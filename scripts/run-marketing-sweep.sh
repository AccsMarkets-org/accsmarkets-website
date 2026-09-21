#!/usr/bin/env bash
# Cron entry point: POSTs /api/internal/marketing-sweep with the secret read
# from .env so the secret never lives in the crontab itself. Run once a day —
# every segment has its own cooldown in MarketingEmailLog, so a second run the
# same day sends nothing new. Suggested crontab line:
#   15 14 * * * /path/to/app/scripts/run-marketing-sweep.sh
set -u

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$APP_DIR/backups/marketing-sweep.log"
PORT="${PORT:-3000}"

SECRET="$(grep -E '^INTERNAL_SWEEP_SECRET=' "$APP_DIR/.env" | cut -d= -f2- | sed -E "s/^['\"]//; s/['\"]$//")"
if [ -z "$SECRET" ]; then
  echo "$(date -Is) ERROR INTERNAL_SWEEP_SECRET not set in .env" >> "$LOG"
  exit 1
fi

# Long timeout: the sweep sends up to a few hundred emails sequentially.
RESP="$(curl -s -m 1800 -X POST -H "x-sweep-secret: $SECRET" "http://127.0.0.1:$PORT/api/internal/marketing-sweep")"
echo "$(date -Is) $RESP" >> "$LOG"

# keep the log bounded
tail -n 2000 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
