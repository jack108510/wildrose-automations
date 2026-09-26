# Reachr Daily Prospect Review

Standalone acquisition workspace. It does **not** read or modify Reachr customer campaign/group data.

## What it does

- At 9:00 AM local time, sets a `50` badge as a daily review reminder.
- On user click, scans all **already-open** Facebook group-feed tabs.
- Reads only posts already rendered in those tabs; no member-list scraping, joining, scrolling, or hidden API calls.
- Requires multiple promotion/intent signals before a post enters review.
- Deduplicates repeated observations across groups and preserves decisions.
- Creates a source-backed review queue with the observed post text, group, candidate profile/Page route, and a personalized Reachr draft.
- Supports approve/reject, copying a draft, and opening the source/profile for manual verification.
- Adds a separate **Messenger approval queue**: sync only the conversations already visible in an open Messenger inbox, edit a proposed reply, and explicitly approve sending it in that same thread.

It intentionally does **not** auto-send unsolicited Messenger DMs. Inbox sync is read-only. A Messenger reply can be sent only by clicking **Approve & Send** on that specific conversation card; a failed send remains unsent and visible for review.

## Daily use

1. Keep the Facebook groups you want reviewed open on their normal group feed URLs.
2. Click the **Reachr Prospecting** extension.
3. Click **Scan all open group tabs**.
4. Click **Open review queue** and verify each candidate is a real business with a usable public Page/Messenger route.
5. Approve or reject. For approved candidates, copy the draft and send manually from the verified Page route.
6. For replies: open the normal Messenger inbox, click **Sync open Messenger inbox**, then use **Open approval board**. Review the captured thread preview and editable draft. Only **Approve & Send** opens that exact thread and submits the approved text.

Goal: up to 50 verified prospects per day. The scanner does not fabricate volume when fewer qualified visible promotions exist.

## Rose website candidates

The separate `discover-search-live.cjs` batch scan also saves `rose-website-candidates.json` for Rose demo review. It collects external website links visible in a promotional post, including links written as text. A missing Facebook post permalink does not discard a Rose website candidate. Reachr's outreach prospect export keeps its stricter profile and post URL requirements. The Rose sidecar stays private and is excluded from Git.

## Installation

The Amplr runner now includes this directory as a second unpacked extension on the next managed-Chrome launch:

```text
/Users/jackserver/wildrose-automations/reachr-prospecting
```

The existing running Chrome process is not force-restarted, so its open tabs are not disrupted. The extension becomes active on the next normal managed-Chrome restart.

Manual load remains possible via `chrome://extensions` → Developer mode → Load unpacked.

## Verification

```bash
cd /Users/jackserver/wildrose-automations/reachr-prospecting
node test-content.js
node --check content.js
node --check popup.js
node --check background.js
node --check review.js
node --check messenger.js
node test-messenger-utils.js
node test-live-scan.cjs
```

The live test connects read-only to the managed Facebook session on `127.0.0.1:9223` and scans one currently open group tab.

## Storage

Queue data stays in extension-local Chrome storage under:

```text
reachr_prospecting_visible_observations   # prospect review
reachr_messenger_reply_queue              # Messenger replies and approval audit
```

Messenger records include the thread URL, visible inbox preview, editable draft, approval/sent timestamps, status, and next action. Records include business name/route, source group, exact observed text, promotion-signal result, draft, status, and timestamps.
