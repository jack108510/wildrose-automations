#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const cycle = fs.readFileSync(new URL('./one-prospect-cycle.mjs', import.meta.url), 'utf8');

assert.match(cycle, /--queue-only/, 'cycle must expose an explicit non-sending queue producer mode');
assert.match(cycle, /--max-batches/, 'producer must expose a hard batch-count bound');
assert.match(cycle, /QUEUE_ONLY[\s\S]*--no-queue-write/, 'direct dispatch must avoid queue staging while queue-only mode writes verified prospects');
assert.match(cycle, /reason:\s*'queue_producer'/, 'queue-only mode must report a non-sending producer outcome');
assert.match(cycle, /maxOutboundMessages:\s*0/, 'queue-only mode must prove zero outbound messages');

console.log('buffered producer/sender contract tests passed');