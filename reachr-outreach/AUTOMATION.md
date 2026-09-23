# Reachr automation topology

The committed files are the complete source blueprint for the current Reachr outreach system. Runtime state and private prospect/customer records are deliberately excluded.

## Current components

| Component | Purpose | n8n template |
|---|---|---|
| Verified queue producer | Discovers public promotion evidence, resolves a business Page, verifies the exact Messenger composer, and adds a safe queue record without sending | `n8n-verified-queue-producer.json` |
| Buffered sender | Claims at most one queued prospect, enforces pacing/quota, sends, reopens the conversation, and confirms persistence | `n8n-buffered-messenger-sender.json` |
| Reply monitor | Inspects Messenger threads, classifies inbound replies, and creates deduplicated local tasks | `n8n-reply-monitor.json` |
| SMS approval handler | Accepts signed one-time approval commands for a proposed response | `n8n-twilio-inbound-approval.json` |
| CRM/inbox | Syncs verified conversation evidence into a private local CRM/API | n/a |
| Dashboard | Displays local operational state | n/a |

All workflow exports in Git are inactive. Live activation state belongs to the local n8n instance and must be checked there.

## End-to-end flow

1. `reachr-prospecting/discover-search-live.cjs` inspects configured, already-authorized Facebook group sources through the managed Chrome DevTools session.
2. `one-prospect-cycle.mjs --queue-only` advances a durable source cursor, invokes discovery, and asks `refresh-verified-queue.mjs` to verify a public Page and exact Messenger composer.
3. `send-next-prospect.mjs` claims one eligible queue item, verifies the live recipient, enters the personalized message, submits it, and confirms exact-message persistence in a freshly reopened thread.
4. `monitor-good-replies.mjs` scans known sent conversations and creates a review task for inbound responses.
5. `reachr-sms-approvals.mjs` and `handle-approval-sms.mjs` optionally allow a separately reviewed response to be approved through a one-time SMS code.
6. CRM/inbox and dashboard files expose only locally stored verified evidence.

## Guardrails

- one outbound recipient per sender run
- exact composer/recipient checks
- explicit Messenger rejection detection
- fresh-target delivery readback
- nine-minute pacing and Edmonton-day quota
- cycle, CDP, and sender locks
- dedupe and opt-out-safe state transitions
- fail-closed pause markers and review states
- no workflow auto-activation from Git

## Private runtime files

Prospect queues, source text, messages, replies, route-resolution records, cookies, credentials, logs, locks, cursors, databases, approval state, and delivery ledgers are excluded by `.gitignore` and must remain local.
