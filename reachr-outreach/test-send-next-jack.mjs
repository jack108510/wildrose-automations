import assert from 'node:assert/strict';
import {
  composeMessage,
  getPageMessageRouteEvidence,
  hasExactApproval,
  pickNextProspect,
  senderIdentityAllowed
} from './send-next-jack.mjs';

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
queued.jackApproval = {
  senderAccount: 'Jack Sereda',
  recipientName: queued.recipientName,
  message: composeMessage(queued),
  approvedAt: now.toISOString()
};
const sent = (senderAccount = 'Jack Sereda') => ({
  status: 'sent', senderAccount, sentAt: '2026-09-23T17:00:00Z', delivery: 'messenger_confirmed'
});
const queue = records => ({ prospects: [...records, queued] });

assert.equal(pickNextProspect(queue(Array.from({ length: 47 }, () => sent())), now).prospect.businessName, 'Example Business');
assert.equal(pickNextProspect(queue(Array.from({ length: 48 }, () => sent())), now).reason, 'daily_cap');
const failedAttempt = () => ({ status: 'needs_review', senderAccount: 'Jack Sereda', attemptStartedAt: '2026-09-23T17:00:00Z' });
assert.equal(pickNextProspect(queue(Array.from({ length: 48 }, failedAttempt)), now).reason, 'daily_cap');
assert.equal(pickNextProspect(queue(Array.from({ length: 100 }, () => sent('Jordan Slone'))), now).prospect.businessName, 'Example Business');
assert.equal(pickNextProspect({ prospects: [{ ...queued, routeVerifiedAt: '' }] }, now).reason, 'queue_empty');
assert.equal(pickNextProspect({ prospects: [{ ...queued, messengerUrl: 'https://m.me/SomePerson' }] }, now).reason, 'queue_empty');
assert.equal(hasExactApproval(queued), true);
assert.equal(hasExactApproval({ ...queued, jackApproval: { ...queued.jackApproval, message: 'Changed copy' } }), false);
assert.equal(pickNextProspect({ prospects: [{ ...queued, jackApproval: undefined }] }, now).reason, 'queue_empty');
assert.equal(pickNextProspect({ prospects: [{ ...queued, jackApproval: undefined, jordanApproval: { ...queued.jackApproval, senderAccount: 'Jordan Slone' } }] }, now).reason, 'queue_empty');
assert.equal(senderIdentityAllowed('Jack Sereda'), true);
assert.equal(senderIdentityAllowed('Jordan Slone'), false);
assert.equal(getPageMessageRouteEvidence('https://www.facebook.com/messages/t/61588162330467/').allowed, true);
assert.equal(getPageMessageRouteEvidence('https://www.messenger.com/t/61588162330467/').allowed, false);
assert.match(composeMessage(queued), /I’m a student at SMU/);
assert.match(composeMessage(queued), /Would Example Business be interested in testing the tool for free/);
console.log('Jack sender policy tests passed');
