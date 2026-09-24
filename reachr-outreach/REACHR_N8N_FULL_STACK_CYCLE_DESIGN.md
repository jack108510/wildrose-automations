# Reachr n8n Full-Stack Prospect Cycle

## Objective
Run a controlled prospecting cycle that continues past empty sources and rejected candidates until it queues one eligible business, then sends no more than one verified Messenger DM.

## Non-negotiable safeguards
- One outbound recipient per cycle.
- Atomic queue claim and immutable send outcome.
- Exact `Write to <business>` recipient verification before send.
- Daily cap and elapsed-from-confirmed-send pacing remain enforced by the sender.
- CDP/Chrome lock is held only during a single browser operation; never during a wait/backoff.
- Empty search result, rejected Page, no Messenger route, and transient error advance the cursor; none are success exits.

## Durable state (external JSON/SQLite, not n8n static data)
```json
{
  "schema": "reachr.full-stack-cycle.v1",
  "cursor": { "sourceIndex": 0, "queryIndex": 0, "candidateIndex": 0 },
  "attemptsInPass": 0,
  "passStartedAt": "ISO-8601",
  "lastOutcome": "empty_source|rejected|queued|sent|retrying|source_exhausted",
  "nextEligibleAt": "ISO-8601",
  "cancelled": false
}
```

## n8n workflow: `Reachr — Full-Stack One-Prospect Cycle`

```text
Schedule Trigger (every 9 minutes)
  -> Acquire cycle lock / read durable cursor
  -> IF cancelled or daily cap reached: release lock -> end
  -> Set deadline (now + 7 minutes)
  -> Loop guard: deadline reached?
       yes -> persist cursor + nextEligibleAt -> release -> end
       no  -> Source next cursor shard (one group/query)
  -> IF no raw candidate
       advance source/query cursor -> short Wait/backoff -> Loop guard
  -> Dedupe + business/Page prefilter
  -> IF rejected
       persist rejection -> advance candidate cursor -> Loop guard
  -> Acquire short CDP lock
  -> Verify exact public Page + Messenger composer
  -> Release CDP lock (always)
  -> IF transient Facebook failure
       persist retry/backoff -> advance to next candidate -> Loop guard
  -> IF permanent rejection
       persist exclusion -> advance candidate cursor -> Loop guard
  -> IF verified
       atomically merge/claim one eligible prospect
       re-check cap, suppression, dedupe, and pacing
       send exactly one Messenger DM
       require outgoing-message persistence confirmation
       write immutable outcome
       release cycle lock -> end
```

## Loop controls
| Control | Value | Reason |
|---|---:|---|
| Cycle work deadline | 7 minutes | Leaves headroom before the next 9-minute scheduler tick. |
| Empty-source backoff | 3–10 seconds | Avoids a tight self-loop. |
| Transient route retry | 30 minutes, max 3 | Avoids repeatedly hammering Facebook/CDP. |
| Full source pass | Persist `source_exhausted`, reset cursor, retry on next scheduled cycle | A pass ending with zero candidates is observable—not silently treated as success. |
| CDP lock | Per browser action only | Sender is not blocked during state updates/backoff. |
| Outbound claim | Exactly one | Prevents duplicate or batch messaging. |

## n8n node map
| Node | Type | Purpose |
|---|---|---|
| Every 9 minutes | Schedule Trigger | Starts/resumes a cycle. |
| Load / claim cycle state | Code or Execute Command | Atomic lock + durable cursor read. |
| Deadline / cancellation check | IF | Ends safely only for explicit terminal states. |
| Source next shard | Execute Command | Runs one bounded group/query search based on cursor. |
| Candidate found? | IF | Empty result advances cursor and loops. |
| Filter/dedupe | Code | Rejects known, personal, duplicate, or non-business candidates before browser work. |
| Verify route | Execute Command | Opens one official Page; checks Page identity and exact composer. |
| Route outcome | Switch | `queued`, `transient`, `permanent`, `empty`. |
| Persist cursor/outcome | Execute Command | Records every outcome and advances cursor. |
| Wait/backoff | Wait | Releases n8n execution pressure before the next source attempt. |
| Claim + send one | Execute Command | Re-checks safety, sends one, confirms persistence. |
| Audit result | Code | Writes outcome metrics. |
| Release lock | Execute Command | Runs on every terminal branch. |

## Deployment rule
Do not activate this alongside the existing separate discovery and sender workflows. Cut over atomically: deactivate old overlapping workflows, import this workflow, run a `--no-send` test, then activate only after approval.
