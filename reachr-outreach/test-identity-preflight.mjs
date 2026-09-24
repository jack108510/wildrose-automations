import assert from 'node:assert/strict';
import fs from 'node:fs';

const runner = fs.readFileSync(new URL('./run-scheduled-send.sh', import.meta.url), 'utf8');
const sender = fs.readFileSync(new URL('./send-next-prospect.mjs', import.meta.url), 'utf8');
assert.match(sender, /const REQUIRED_SENDER_IDENTITY = 'Jack Sereda';/, 'sender must require Jack Sereda’s personal identity');
assert.doesNotMatch(sender, /ensureWildroseIdentity/, 'personal sender must not switch into the Wildrose Page');
assert.match(sender, /verifyComposerActorEvidence\(composerActor/, 'sender must fail closed on actor evidence from the actual composer');
assert.match(sender, /senderAccount: REQUIRED_SENDER_IDENTITY/, 'send records must retain the verified personal sender');
assert.match(sender, /return value === '1';/, 'actor-proof bypass must remain explicit and opt-in');
console.log('personal-sender preflight runner contract passed');
