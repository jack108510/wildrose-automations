# Reachr outreach pipeline

This directory contains the version-controlled blueprint for Reachr’s local, browser-driven prospecting and Messenger outreach pipeline.

## Architecture

```text
reachr-prospecting/discover-search-live.cjs
        ↓ public Facebook-group promotion evidence
one-prospect-cycle.mjs
        ↓ exact public-Page and Messenger-route verification
prospects.json (local runtime queue; never committed)
        ↓ one queued prospect per invocation
send-next-prospect.mjs
        ↓ fresh-thread persistence confirmation
Messenger
        ↓ inbound reply scan
monitor-good-replies.mjs
        ↓ local task + optional SMS approval
handle-approval-sms.mjs
```

n8n schedules the queue producer, sender, reply monitor, and optional inbound-SMS approval handler. Exported workflows are committed **inactive** so importing this public repository cannot dispatch messages automatically.

## Production entry points

| Component | Entry point / template |
|---|---|
| Discovery | `../reachr-prospecting/discover-search-live.cjs` |
| Serialized queue producer | `one-prospect-cycle.mjs --queue-only` / `n8n-verified-queue-producer.json` |
| One-message sender | `send-next-prospect.mjs` / `n8n-buffered-messenger-sender.json` |
| Reply monitor | `monitor-good-replies.mjs` / `n8n-reply-monitor.json` |
| SMS approvals | `handle-approval-sms.mjs` / `n8n-twilio-inbound-approval.json` |
| CRM/inbox sync | `reachr-conversation-sync.mjs`, `reachr-inbox-api.mjs` |
| Local dashboard | `reachr-dashboard-server.mjs`, `reachr-dashboard.html` |

## Safety model

- One outbound message at most per sender invocation.
- Nine-minute dispatch spacing and a 150-confirmed-send Edmonton-day cap.
- Atomic cycle, CDP, and sender locks.
- Exact recipient-composer verification before text entry.
- Explicit Messenger failure detection.
- A send is recorded only after the exact message is found outside the composer in a freshly reopened conversation.
- Any ambiguous delivery or route mismatch fails closed and moves the record to review.
- Workflow exports are inactive by default.

## Local-only prerequisites

The repository intentionally does **not** include:

- Facebook/Chrome profiles, cookies, or login sessions
- prospect queues, source posts, messages, reply history, or delivery ledgers
- API keys, Twilio/Supabase credentials, or n8n’s database
- runtime cursors, locks, logs, pause markers, or approval state

The pipeline expects a managed Chrome DevTools endpoint at `http://127.0.0.1:9223` unless `REACHR_CDP_ENDPOINT` is set. Paths in the n8n templates reflect the production Mac and must be adjusted on another machine.

## Verification

Run the complete non-live test suite from this directory:

```sh
bash ./test-all.sh
```

Tests do not send messages. Live browser checks and any workflow activation require a separate operator-approved deployment step.
