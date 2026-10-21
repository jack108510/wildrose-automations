import assert from 'node:assert/strict';
import { queuedCount, hasSufficientQueuedBacklog } from './queue-backlog.mjs';

const queue = {
  prospects: [
    { status: 'queued' },
    { status: 'sent' },
    { status: 'queued' },
    { status: 'needs_review' }
  ]
};

assert.equal(queuedCount(queue), 2);
assert.equal(queuedCount({ prospects: [] }), 0);
assert.equal(hasSufficientQueuedBacklog(queue, 2), true);
assert.equal(hasSufficientQueuedBacklog(queue, 3), false);
console.log('queue backlog guard tests passed');
