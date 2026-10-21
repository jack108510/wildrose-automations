import assert from 'node:assert/strict';
import { summarizeOutreach } from './dashboard-data.mjs';

const records = [
  { businessName: 'Alpha', status: 'sent', delivery: 'messenger_confirmed', sentAt: '2026-09-22T06:20:00.000Z', conversationStatus: 'closed_declined', lastReplySentAt: '2026-09-22T15:00:00.000Z' },
  { businessName: 'Beta', status: 'sent', delivery: 'messenger_ui_confirmed', sentAt: '2026-09-22T16:20:00.000Z', conversationStatus: 'waiting_for_email', lastReplySentAt: '2026-09-22T17:00:00.000Z' },
  { businessName: 'Old', status: 'sent', delivery: 'messenger_confirmed', sentAt: '2026-09-21T23:00:00.000Z', conversationStatus: 'interested', lastReplySentAt: '2026-09-21T23:30:00.000Z' },
  { businessName: 'Marketplace listing', sourceGroup: 'Local Pet Services & Marketplace', status: 'sent', delivery: 'messenger_confirmed', sentAt: '2026-09-22T16:30:00.000Z', conversationStatus: 'waiting_for_email', lastReplySentAt: '2026-09-22T17:30:00.000Z' },
  { businessName: 'Review', status: 'needs_review' },
  { businessName: 'Queued', status: 'queued' }
];
const data = summarizeOutreach(records, new Date('2026-09-22T18:00:00.000Z'));
assert.equal(data.sentToday, 2);
assert.equal(data.totalConfirmed, 3);
assert.equal(data.replies, 3);
assert.equal(data.positiveReplies, 2);
assert.equal(data.needsReview, 1);
assert.equal(data.queued, 1);
assert.deepEqual(data.recentSends.map(item => item.businessName), ['Beta', 'Alpha']);
assert.deepEqual(data.dailyBreakdown, [
  { date: '2026-09-22', sent: 2, replies: 2, positiveReplies: 1 },
  { date: '2026-09-21', sent: 1, replies: 1, positiveReplies: 1 }
]);
console.log('Reachr dashboard data tests passed');
