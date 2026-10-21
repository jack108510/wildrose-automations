import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('.', import.meta.url);
const cycle = fs.readFileSync(new URL('./one-prospect-cycle.mjs', root), 'utf8');
const verifier = fs.readFileSync(new URL('./refresh-verified-queue.mjs', root), 'utf8');

assert.match(cycle, /refresh-verified-queue\.mjs'.*--no-queue-write/s, 'full cycle must persist route outcomes without pre-populating the outbound queue');
assert.match(cycle, /send-qualified-prospect\.mjs/, 'full cycle must hand its newly verified lead directly to the sender');
assert.match(verifier, /additions/, 'verifier must return the exact verified lead to its caller');
assert.match(verifier, /NO_QUEUE_WRITE/, 'verifier must support direct dispatch without queue staging');
assert.match(verifier, /state\.records\[key\] = outcome;[\s\S]*atomicJson\(STATE, state\);[\s\S]*outcomes\.push\(outcome\)/, 'each route outcome must persist before the next candidate so timeouts cannot reset progress');
console.log('direct discovery-to-send contract tests passed');
