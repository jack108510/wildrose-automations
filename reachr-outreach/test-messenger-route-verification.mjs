import assert from 'node:assert/strict';
import { waitForNewMessageOccurrence, waitForVerifiedComposer } from './messenger-route-verification.mjs';

let reads = 0;
const delayed = await waitForVerifiedComposer('Two Men and a Truck Winnipeg', async () => {
  reads += 1;
  return reads < 3 ? '' : 'Write to Two Men and a Truck Winnipeg';
}, { attempts: 4, intervalMs: 0 });
assert.equal(delayed.recipient, 'Two Men and a Truck Winnipeg');
assert.equal(reads, 3);

await assert.rejects(
  waitForVerifiedComposer('Expected Business', async () => 'Write to Different Business', { attempts: 2, intervalMs: 0 }),
  /recipient verification failed/i,
);

await assert.rejects(
  waitForVerifiedComposer('Expected Business', async () => '', { attempts: 2, intervalMs: 0 }),
  /no composer/i,
);

let counts = [2, 3, 2, 3, 3];
assert.equal(await waitForNewMessageOccurrence(2, async () => counts.shift(), { attempts: 5, intervalMs: 0, stableChecks: 2 }), 3);
let optimisticOnly = [1, 2, 1, 1];
await assert.rejects(
  waitForNewMessageOccurrence(1, async () => optimisticOnly.shift(), { attempts: 4, intervalMs: 0, stableChecks: 2 }),
  /did not confirm exact outgoing message/i,
);
await assert.rejects(
  waitForNewMessageOccurrence(1, async () => 1, { attempts: 2, intervalMs: 0, stableChecks: 2 }),
  /did not confirm exact outgoing message/i,
);

console.log('Messenger composer polling tests passed');
