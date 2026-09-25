import assert from 'node:assert/strict';
import { buildCommandCenterConversations, canonicalMessengerRoute } from './command-center-model.mjs';

assert.equal(canonicalMessengerRoute('https://m.me/12345'), canonicalMessengerRoute('https://www.facebook.com/messages/t/12345/'));
const ledger = { prospects: [
  { businessName: 'Example Shop', recipientName: 'Alex Shop', messengerUrl: 'https://m.me/12345', senderAccount: 'Doue John', delivery: 'messenger_confirmed', sentMessage: 'Hello Alex', sentAt: '2026-09-25T10:00:00Z' },
  { businessName: 'Example Shop', recipientName: 'Alex Shop', messengerUrl: 'https://www.facebook.com/messages/t/12345/', senderAccount: 'Jack Sereda', delivery: 'messenger_confirmed', sentMessage: 'Following up', sentAt: '2026-09-25T11:00:00Z' },
  { businessName: 'Marketplace Item', sourceGroup: 'Local Marketplace', messengerUrl: 'https://m.me/999', delivery: 'messenger_confirmed', sentMessage: 'Excluded', sentAt: '2026-09-25T10:00:00Z' }
] };
const state = { seen: {
  first: { businessName: 'Example Shop', preview: 'Unread message: Could you explain?', observedAt: '2026-09-25T12:00:00Z' },
  duplicate: { businessName: 'Example Shop', preview: 'Could you explain?', observedAt: '2026-09-25T12:05:00Z' }
} };
const imported = [{ conversation: { business_name: 'Example Shop', messenger_url: 'https://m.me/12345', verified_inbound: true }, messages: [{ direction: 'inbound', body: 'Could you explain?', observed_at: '2026-09-25T12:00:00Z' }] }];
const rows = buildCommandCenterConversations(ledger, state, {}, imported);
assert.equal(rows.length, 1);
assert.deepEqual(rows[0].accounts.sort(), ['Doue John', 'Jack Sereda']);
assert.equal(rows[0].messages.length, 3);
assert.equal(rows[0].verifiedReplyCount, 1);
assert.equal(rows[0].candidateCount, 0);
assert.equal(rows[0].status, 'needs_review');
const reviewed = buildCommandCenterConversations(ledger, state, { [rows[0].id]: { status: 'waiting', note: 'Follow up tomorrow', updatedAt: '2026-09-25T13:00:00Z' } }, imported);
assert.equal(reviewed[0].status, 'waiting');
assert.equal(reviewed[0].note, 'Follow up tomorrow');
const reopened = buildCommandCenterConversations(ledger, state, { [rows[0].id]: { status: 'closed', updatedAt: '2026-09-25T11:30:00Z' } }, imported);
assert.equal(reopened[0].status, 'needs_review');
const noReply = buildCommandCenterConversations(ledger, { seen: {} });
assert.equal(noReply[0].status, 'awaiting_reply');
console.log('Command Center conversation model tests passed');
