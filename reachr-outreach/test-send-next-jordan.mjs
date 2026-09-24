import assert from 'node:assert/strict';
import {
  composeMessage,
  getPageMessageRouteEvidence,
  hasExactApproval,
  pickNextProspect,
  senderIdentityAllowed
} from './send-next-jordan.mjs';

const now = new Date('2026-09-23T19:00:00Z');
const queued = {
  businessName: 'Example Business',
  recipientName: 'Example Business',
  messengerUrl: 'https://m.me/61588162330467',
  status: 'queued',
  qualifiedBy: 'promotion-evidence-and-exact-page-route',
  routeVerifiedAt: now.toISOString(),
  sourceEvidence: 'Example Business is accepting new clients.'
};
queued.jordanApproval = {
  senderAccount: 'Jordan Slone',
  recipientName: queued.recipientName,
  message: composeMessage(queued),
  approvedAt: now.toISOString()
};
const sent = (senderAccount = 'Jordan Slone') => ({
  status: 'sent', senderAccount, sentAt: '2026-09-23T17:00:00Z', delivery: 'messenger_confirmed'
});
const queue = records => ({ prospects: [...records, queued] });

assert.equal(pickNextProspect(queue(Array.from({ length: 44 }, () => sent())), now).prospect.businessName, 'Example Business');
assert.equal(pickNextProspect(queue(Array.from({ length: 45 }, () => sent())), now).reason, 'daily_cap');
const failedAttempt = () => ({ status: 'needs_review', senderAccount: 'Jordan Slone', attemptStartedAt: '2026-09-23T17:00:00Z' });
assert.equal(pickNextProspect(queue(Array.from({ length: 45 }, failedAttempt)), now).reason, 'daily_cap');
assert.equal(pickNextProspect(queue(Array.from({ length: 100 }, () => sent('Jack Sereda'))), now).prospect.businessName, 'Example Business');
assert.equal(pickNextProspect({ prospects: [{ ...queued, routeVerifiedAt: '' }] }, now).reason, 'queue_empty');
assert.equal(pickNextProspect({ prospects: [{ ...queued, messengerUrl: 'https://m.me/SomePerson' }] }, now).reason, 'queue_empty');
assert.equal(hasExactApproval(queued), true);
assert.equal(hasExactApproval({ ...queued, jordanApproval: { ...queued.jordanApproval, message: 'Changed copy' } }), false);
assert.equal(pickNextProspect({ prospects: [{ ...queued, jordanApproval: undefined }] }, now).reason, 'queue_empty');
assert.equal(senderIdentityAllowed('Jordan Slone'), true);
assert.equal(senderIdentityAllowed('Jack Sereda'), false);
assert.equal(getPageMessageRouteEvidence('https://www.facebook.com/messages/t/61588162330467/').allowed, true);
assert.equal(getPageMessageRouteEvidence('https://www.messenger.com/t/61588162330467/').allowed, false);
assert.match(composeMessage(queued), /schedule the posts, saving you from posting manually every day/);
console.log('Jordan sender policy tests passed');
