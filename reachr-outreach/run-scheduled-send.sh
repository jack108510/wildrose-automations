#!/usr/bin/env bash
set -uo pipefail

cd /Users/jackserver/wildrose-automations/reachr-outreach
# Page-source verification is enforced inside send-next-prospect.mjs after Meta has
# resolved the m.me launch URL. Do not run the unrelated Facebook profile switcher:
# it cannot change the Messenger Page-message-shortlink sender and can block sends.
output="$(node send-next-prospect.mjs 2>&1)"
status=$?

if [[ $status -ne 0 ]]; then
  printf '%s\n' "$output" >&2
  exit "$status"
fi

if [[ "$output" == SENT:* ]]; then
  printf '%s\n' "$output"
elif [[ "$output" == NO_SEND:* ]]; then
  exit 0
else
  printf 'Unexpected Reachr outreach result: %s\n' "$output" >&2
  exit 1
fi
