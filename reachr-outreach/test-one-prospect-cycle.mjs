import assert from 'node:assert/strict';
import { planOneProspectCycle } from './one-prospect-cycle-policy.mjs';

const now = new Date('2026-09-16T19:53:00Z');
const queue = {
  prospects: [
    { businessName: 'Known Business', status: 'sent', sentAt: '2026-09-16T19:45:00Z', delivery: 'messenger_confirmed' },
    { businessName: 'Ready Business', status: 'queued', messengerUrl: 'https://m.me/readybusiness', recipientName: 'Ready Business' }
  ]
};
const discovered = [
  { businessName: 'Known Business', businessUrl: 'https://facebook.com/known', sources: [{ businessUrl: 'https://facebook.com/known', observedText: 'a'.repeat(100), promotionSignals: ['book now'] }] },
  { businessName: 'Candidate One', businessUrl: 'https://facebook.com/candidateone', sources: [{ businessUrl: 'https://facebook.com/candidateone', observedText: 'a'.repeat(100), promotionSignals: ['free estimate'] }] },
  { businessName: 'Candidate Two', businessUrl: 'https://facebook.com/candidatetwo', sources: [{ businessUrl: 'https://facebook.com/candidatetwo', observedText: 'a'.repeat(100), promotionSignals: ['contact us'] }] }
];

const plan = planOneProspectCycle({ queue, discovered, state: { records: {} }, now, verifyLimit: 2 });
assert.equal(plan.send.reason, 'send_gap');
assert.equal(plan.routeCandidates.length, 2);
assert.deepEqual(plan.routeCandidates.map(item => item.businessName), ['Candidate One', 'Candidate Two']);
assert.equal(plan.source.additionsTarget, 8);
assert.equal(plan.source.maxGroups, 4);
assert.equal(plan.send.maxOutboundMessages, 1);

const due = planOneProspectCycle({ queue, discovered, state: { records: {} }, now: new Date('2026-09-16T20:01:00Z'), verifyLimit: 1 });
assert.equal(due.send.prospect.businessName, 'Ready Business');
assert.equal(due.send.maxOutboundMessages, 1);
assert.equal(due.routeCandidates.length, 1);
console.log('one-prospect cycle planning tests passed');
