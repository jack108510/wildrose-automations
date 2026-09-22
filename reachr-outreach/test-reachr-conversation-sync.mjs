import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConversations } from './reachr-conversation-sync.mjs';
const record=(businessName,overrides={})=>({businessName,messengerUrl:'https://www.messenger.com/t/'+businessName,delivery:'messenger_confirmed',sentMessage:'Initial exact text',sentAt:'2026-09-22T10:00:00Z',...overrides});
test('retains observed inbound and exact outbound text with idempotent fingerprints',()=>{
 const ledger={prospects:[record('Example',{lastReplySentMessage:'Exact follow-up',lastReplySentAt:'2026-09-22T11:00:00Z'})]};
 const state={seen:{one:{businessName:'Example',preview:'Real reply',observedAt:'2026-09-22T10:30:00Z',classification:{reason:'interested'}},two:{businessName:'Example',preview:'Real reply',observedAt:'2026-09-22T10:30:00Z',classification:{reason:'interested'}}}};
 const rows=normalizeConversations(ledger,state);
 assert.equal(rows.length,1);assert.deepEqual(rows[0].messages.map(m=>m.direction),['outbound','inbound','inbound','outbound']);
 assert.equal(rows[0].messages[1].body,'Real reply');assert.equal(rows[0].messages[3].body,'Exact follow-up');
 assert.deepEqual(normalizeConversations(ledger,state),rows);
});
test('never admits Marketplace, unconfirmed, outbound-only or ambiguous business',()=>{
 const ledger={prospects:[record('Good'),record('Market',{sourceGroup:'Facebook Marketplace'}),record('Unconfirmed',{delivery:'queued'}),record('Duplicate'),record('Duplicate',{messengerUrl:'https://m.me/other'})]};
 const seen=Object.fromEntries(['Good','Market','Unconfirmed','Duplicate'].map((name,i)=>[i,{businessName:name,preview:'hello',classification:{reason:'interested'}}]));
 seen.out={businessName:'Good',preview:'our own text',classification:{reason:'outbound_or_empty'}};
 const result=normalizeConversations(ledger,{seen});assert.equal(result.length,1);assert.equal(result[0].conversation.business_name,'Good');assert.equal(result[0].messages.length,2);
});
test('rejects untrusted routes and refuses mutation without --execute',()=>{
 const result=normalizeConversations({prospects:[record('Bad',{messengerUrl:'https://www.messenger.com.evil.org/t/Bad'})]},{seen:{a:{businessName:'Bad',preview:'Hello'}}});assert.equal(result.length,0);
});
