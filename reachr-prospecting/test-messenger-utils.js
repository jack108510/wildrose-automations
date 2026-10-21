const assert = require('assert');
const { mergeMessengerRows, makeDraft } = require('./messenger-utils.js');
const prior = [{ threadUrl: 'https://www.messenger.com/t/1', name: 'Trisha', status: 'closed', draft: 'No thanks', createdAt: '2026-09-20T00:00:00Z' }];
const merged = mergeMessengerRows(prior, [{ threadUrl: 'https://www.messenger.com/t/1', name: 'Trisha Cleaning', lastMessage: 'Hello', status: 'needs_approval', lastActivityAt: '2026-09-21T00:00:00Z' }]);
assert.equal(merged.length, 1);
assert.equal(merged[0].status, 'closed');
assert.equal(merged[0].draft, 'No thanks');
assert.match(makeDraft({ name: 'Wizard of Pawz Pet Grooming' }), /Hi Wizard/);
console.log('messenger utils: PASS');
