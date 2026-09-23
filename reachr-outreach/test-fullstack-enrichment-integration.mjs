import assert from 'node:assert/strict';
import fs from 'node:fs';

const messengerPath = new URL('./one-prospect-cycle.mjs', import.meta.url);
const enrichmentPath = new URL('./run-rose-enrichment-persistence.mjs', import.meta.url);
const messenger = fs.readFileSync(messengerPath, 'utf8');

assert.doesNotMatch(messenger, /reachr_fullstack_enrichment\.py/);
assert.doesNotMatch(messenger, /rose-enrichment-state\.json/);
assert.doesNotMatch(messenger, /rose-prospects\.sqlite3/);
assert.doesNotMatch(messenger, /output\.enrichment/);
assert.match(messenger, /automation:\s*'reachr-messenger-outreach'/);

assert.equal(fs.existsSync(enrichmentPath), true, 'dedicated enrichment runner must exist');
const enrichment = fs.readFileSync(enrichmentPath, 'utf8');
assert.match(enrichment, /reachr_fullstack_enrichment\.py/);
assert.match(enrichment, /rose-enrichment-state\.json/);
assert.match(enrichment, /rose-prospects\.sqlite3/);
assert.match(enrichment, /ROSE_ENABLE_PERSISTENCE/);
assert.match(enrichment, /--confirm-persistence/);
assert.match(enrichment, /automation:\s*'rose-enrichment-persistence'/);
assert.doesNotMatch(enrichment, /send-qualified-prospect/);
assert.doesNotMatch(enrichment, /discover-search-live/);
assert.doesNotMatch(enrichment, /refresh-verified-queue/);

console.log('automation separation contract passed');
