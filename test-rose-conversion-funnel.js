import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("ai-tool-mockup-funnel-preview.html", "utf8");
assert.match(page, /id="rosePreviewUnlockForm"/, "the preview needs an explicit contact-unlock form");
assert.match(page, /name="name"/, "the unlock form captures a real name");
assert.match(page, /name="email"/, "the unlock form captures an email");
assert.match(page, /\/api\/rose-preview-unlock/, "the contact action must be persisted before showing next steps");
assert.match(page, /Request a 15-minute information meeting/, "prospects need a low-risk assisted-sales CTA");
assert.match(page, /\/api\/rose-meeting-request/, "the information-meeting request must be durable");
assert.match(page, /information meeting/, "the CTA must not call the appointment a setup meeting");
assert.match(page, /rose_preview_unlocked/, "successful preview unlocks must be tracked as conversion events");
assert.match(page, /rose_information_meeting_requested/, "meeting requests must be tracked as conversion events");
assert.match(page, /rose_checkout_started/, "checkout starts must be tracked as conversion events");
console.log("rose conversion funnel page tests passed");
