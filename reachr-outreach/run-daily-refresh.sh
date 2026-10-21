#!/usr/bin/env bash
set -uo pipefail
# launchd supplies only the system PATH; Node is installed through Homebrew.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
ROOT="/Users/jackserver/wildrose-automations"
LOCK="$ROOT/reachr-outreach/.daily-refresh.lock"
CDP_LOCK="$ROOT/reachr-outreach/.reachr-cdp.lock"
LOG_DIR="$ROOT/reachr-outreach/logs"
MIN_QUEUED_BACKLOG="${REACHR_MIN_QUEUED_BACKLOG:-10}"
mkdir -p "$LOG_DIR"
QUEUED="$(node "$ROOT/reachr-outreach/queue-backlog.mjs" "$ROOT/reachr-outreach/prospects.json")"
if ! [[ "$QUEUED" =~ ^[0-9]+$ ]] || ! [[ "$MIN_QUEUED_BACKLOG" =~ ^[0-9]+$ ]]; then
  printf 'REFRESH_ERROR:invalid_queue_backlog queued=%s minimum=%s\n' "$QUEUED" "$MIN_QUEUED_BACKLOG"
  exit 1
fi
if (( QUEUED >= MIN_QUEUED_BACKLOG )); then
  printf 'NO_REFRESH:queue_sufficient queued=%s minimum=%s\n' "$QUEUED" "$MIN_QUEUED_BACKLOG"
  exit 0
fi
if ! mkdir "$LOCK" 2>/dev/null; then
  printf 'NO_REFRESH:already_running\n'
  exit 0
fi
if ! mkdir "$CDP_LOCK" 2>/dev/null; then
  rm -rf "$LOCK"
  printf 'NO_REFRESH:cdp_busy\n'
  exit 0
fi
printf '{"pid":%s,"acquiredAt":"%s"}\n' "$$" "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" > "$CDP_LOCK/owner.json"
trap 'rm -rf "$CDP_LOCK" "$LOCK"' EXIT
STAMP="$(date '+%Y-%m-%d_%H%M%S')"
LOG="$LOG_DIR/daily-refresh-$STAMP.log"
{
  printf 'Reachr daily refresh started %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  if node "$ROOT/reachr-prospecting/discover-search-live.cjs"; then
    printf 'DISCOVERY_OK\n'
  else
    printf 'DISCOVERY_WARNING:using_existing_discovery_data\n'
  fi
  # Keep a verified backlog ahead of the nine-minute sender. The lock above makes
  # repeated scheduler ticks safe: only one Chrome/CDP producer runs at a time.
  node "$ROOT/reachr-outreach/refresh-verified-queue.mjs" --limit=60
  printf 'REFRESH_OK %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
} 2>&1 | tee "$LOG"
