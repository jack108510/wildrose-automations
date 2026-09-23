import assert from 'node:assert/strict';
import { waitForCdp } from './cdp-readiness.mjs';

let attempts = 0;
assert.equal(await waitForCdp({ timeoutMs: 100, intervalMs: 1, probe: async () => ++attempts >= 3 }), true);
assert.equal(attempts, 3);
assert.equal(await waitForCdp({ timeoutMs: 5, intervalMs: 1, probe: async () => false }), false);
console.log('cdp readiness tests passed');
