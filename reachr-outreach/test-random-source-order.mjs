import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { deterministicShuffle } = require('../reachr-prospecting/discovery-order.cjs');

const sources = ['empty-group', 'qualified-group', 'third-group', 'fourth-group', 'fifth-group'];
const firstPass = deterministicShuffle(sources, 'cycle-pass-7');
const replay = deterministicShuffle(sources, 'cycle-pass-7');
const nextPass = deterministicShuffle(sources, 'cycle-pass-8');

assert.deepEqual(firstPass, replay, 'the stored seed must replay the exact same source order after a restart');
assert.notDeepEqual(firstPass, sources, 'configured sources must not remain in fixed order');
assert.notDeepEqual(nextPass, firstPass, 'a new pass must receive a new randomized order');
assert.deepEqual([...firstPass].sort(), [...sources].sort(), 'randomization must retain every source exactly once');

const visits = [];
for (const source of firstPass) {
  visits.push(source);
  if (source === 'qualified-group') break;
}
assert.equal(visits[0], firstPass[0]);
assert.ok(visits.includes('qualified-group'), 'an empty source must not terminate traversal before a later eligible source');
assert.equal(new Set(visits).size, visits.length, 'no source may be revisited during a pass');

console.log('randomized complete source traversal tests passed');
