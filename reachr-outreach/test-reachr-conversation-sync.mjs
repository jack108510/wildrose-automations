import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConversations } from './reachr-conversation-sync.mjs';
const record=(businessName,overrides={})=>({businessName,messengerUrl:'https://www.messenger.com/t/'+businessName,sourceUrl:'https://www.facebook.com/groups/example',delivery:'messenger_confirmed',sentMessage:'Initial exact text',sentAt:'2026-09-22T10:00:00Z',...overrides});
const verified=(businessName,overrides={})=>({businessName,threadSpeaker:businessName,threadVerified:true,threadTextVerified:true,preview:'Real reply',observedAt:'2026-09-22T10:30:00Z',classification:{reason:'interested'},...overrides});
test('retains inspected inbound and ledger outbound with stable fingerprints',()=>{
 const ledger={prospects:[record('Example',{lastReplySentMessage:'Exact follow-up',lastReplySentAt:'2026-09-22T11:00:00Z'})]};
 const state={seen:{one:verified('Example'),two:verified('Example')}};
 const rows=normalizeConversations(ledger,state);
 assert.equal(rows.length,1);assert.deepEqual(rows[0].messages.map(m=>m.direction),['outbound','inbound','inbound','outbound']);
 assert.equal(rows[0].messages[1].body,'Real reply');assert.equal(rows[0].messages[3].body,'Exact follow-up');
 assert.deepEqual(normalizeConversations(ledger,state),rows);
});
test('fails closed for unverified inbox previews, sender mismatch, ambiguous aliases, and outbound-only',()=>{
 const ledger={prospects:[record('Good',{recipientName:'Recipient'}),record('Duplicate'),record('Duplicate',{messengerUrl:'https://m.me/other'})]};
 const seen={good:verified('Recipient'),preview:verified('Good',{threadTextVerified:false}),wrong:verified('Good',{threadSpeaker:'Another business'}),dup:verified('Duplicate'),out:verified('Good',{classification:{reason:'outbound_or_empty'}})};
 const result=normalizeConversations(ledger,{seen});assert.equal(result.length,1);assert.equal(result[0].conversation.business_name,'Good');assert.equal(result[0].messages.length,2);
});
test('rejects Marketplace provenance and untrusted routes, not incidental text mention',()=>{
 const ledger={prospects:[record('Good'),record('Market',{sourceUrl:'https://www.facebook.com/marketplace/item/123'}),record('Unconfirmed',{delivery:'queued'}),record('Bad',{messengerUrl:'https://www.messenger.com.evil.org/t/Bad'})]};
 const seen={good:verified('Good',{preview:'We do not sell on Marketplace'}),market:verified('Market'),unconfirmed:verified('Unconfirmed'),bad:verified('Bad')};
 const rows=normalizeConversations(ledger,{seen});assert.equal(rows.length,1);assert.equal(rows[0].messages[1].body,'We do not sell on Marketplace');
});
