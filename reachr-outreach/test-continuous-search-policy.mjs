import assert from 'node:assert/strict';
import { advanceSourceCursor } from './continuous-search-policy.mjs';

let state = { sourceOffset: 0, pass: 0 };
state = advanceSourceCursor(state, { totalSources: 12, batchSize: 4, foundEligible: false });
assert.deepEqual(state, { sourceOffset: 4, pass: 0, outcome: 'continue' });
state = advanceSourceCursor(state, { totalSources: 12, batchSize: 4, foundEligible: false });
assert.deepEqual(state, { sourceOffset: 8, pass: 0, outcome: 'continue' });
state = advanceSourceCursor(state, { totalSources: 12, batchSize: 4, foundEligible: true });
assert.deepEqual(state, { sourceOffset: 0, pass: 1, outcome: 'found_eligible' });
state = advanceSourceCursor({ sourceOffset: 8, pass: 1 }, { totalSources: 12, batchSize: 4, foundEligible: false });
assert.deepEqual(state, { sourceOffset: 0, pass: 2, outcome: 'source_exhausted' });
state = advanceSourceCursor({ sourceOffset: 4, pass: 2, sourceOrderSeed: 'persisted-seed' }, { totalSources: 12, batchSize: 4, foundEligible: false });
assert.deepEqual(state, { sourceOffset: 8, pass: 2, sourceOrderSeed: 'persisted-seed', outcome: 'continue' });
console.log('continuous source cursor tests passed: empty shards advance, eligible result stops, exhaustion is explicit');
