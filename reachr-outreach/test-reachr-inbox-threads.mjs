import test from 'node:test';
import assert from 'node:assert/strict';
import {buildInboxThreads,mergeImportedMessages} from './reachr-conversation-sync.mjs';
const sent=(name,more={})=>({businessName:name,recipientName:name,messengerUrl:'https://www.messenger.com/t/'+encodeURIComponent(name),sourceUrl:'https://www.facebook.com/groups/lead',delivery:'messenger_confirmed',sentMessage:'Exact sent text',sentAt:'2026-09-22T10:00:00Z',...more});
const candidate=(name,more={})=>({businessName:name,preview:'Potential reply',classification:{reason:'interested'},observedAt:'2026-09-23T10:00:00Z',...more});
test('lists confirmed non-Marketplace Messenger deliveries with exact outbound evidence even without a verified inbound reply',()=>{
 const rows=buildInboxThreads({prospects:[sent('A'),sent('Excluded',{sourceUrl:'https://facebook.com/marketplace/item/1'}),sent('Excluded source',{sourceGroup:'Local Marketplace'}),sent('Excluded messaging origin',{messagingSource:'Facebook Marketplace'}),sent('Unsent',{delivery:'queued'}),sent('Bad host',{messengerUrl:'https://messenger.com.evil.test/t/1'})]},{seen:{}});
 assert.equal(rows.length,1);assert.equal(rows[0].conversation.business_name,'A');assert.equal(rows[0].conversation.review_candidate,false);assert.deepEqual(rows[0].messages.map(x=>x.direction),['outbound']);assert.equal(rows[0].messages[0].body,'Exact sent text');
});
test('marks unique monitor previews for review without calling them verified messages',()=>{
 const rows=buildInboxThreads({prospects:[sent('A',{recipientName:'Alice'}),sent('B',{recipientName:'Bert'}),sent('C',{recipientName:'Cody'}),sent('C',{messengerUrl:'https://www.messenger.com/t/other'})]},{seen:{first:candidate('Alice'),invalid:candidate('B',{classification:{reason:'outbound_or_empty'}}),ambiguous:candidate('C')}});
 assert.equal(rows.length,2);const a=rows.find(x=>x.conversation.business_name==='A');assert.equal(a.conversation.review_candidate,true);assert.equal(a.conversation.preview_source,'unverified_monitor_preview');assert.deepEqual(a.messages.map(x=>x.direction),['outbound']);assert.equal(rows.find(x=>x.conversation.business_name==='B').conversation.review_candidate,false);
});
test('merges exact-route verified live history with ledger, replacing duplicate outbound text',()=>{
 const rows=buildInboxThreads({prospects:[sent('A')]},{seen:{}}),url=rows[0].conversation.messenger_url;
 const plan={conversations:[{external_key:'import-a',business_name:'A',messenger_url:url}],messages:[{external_key:'import-a',direction:'outbound',body:'Exact sent text',observed_at:'2026-09-22T10:01:00Z',provenance:'messenger_aria_label:1'},{external_key:'import-a',direction:'inbound',body:'Yes, please send details',observed_at:'2026-09-22T10:05:00Z',provenance:'messenger_aria_label:2'}]};
 const merged=mergeImportedMessages(rows,plan);assert.equal(merged.length,1);assert.deepEqual(merged[0].messages.map(x=>x.direction),['outbound','inbound']);assert.equal(merged[0].conversation.verified_inbound,true);assert.equal(merged[0].messages[0].provenance,'messenger_aria_label:1');
});
test('live evidence replaces a matching follow-up ledger copy without changing the message count',()=>{
 const rows=buildInboxThreads({prospects:[sent('A',{lastReplySentMessage:'Follow-up text',lastReplySentAt:'2026-09-23T10:00:00Z'})]},{seen:{}}),url=rows[0].conversation.messenger_url;
 const plan={conversations:[{external_key:'a',business_name:'A',messenger_url:url}],messages:[{external_key:'a',direction:'outbound',body:'Follow-up text',observed_at:'2026-09-23T10:01:00Z',provenance:'messenger_aria_label:abcd'}]};
 const merged=mergeImportedMessages(rows,plan);assert.equal(merged[0].messages.length,2);assert.equal(merged[0].messages[1].provenance,'messenger_aria_label:abcd');
});
test('retains distinct live messages with the same text within five minutes',()=>{
 const rows=buildInboxThreads({prospects:[sent('A')]},{seen:{}}),url=rows[0].conversation.messenger_url;
 const plan={conversations:[{external_key:'a',business_name:'A',messenger_url:url}],messages:[{external_key:'a',direction:'inbound',body:'Yes',observed_at:'2026-09-22T10:00:00Z',provenance:'messenger_aria_label:1'},{external_key:'a',direction:'inbound',body:'Yes',observed_at:'2026-09-22T10:01:00Z',provenance:'messenger_aria_label:2'}]};
 assert.equal(mergeImportedMessages(rows,plan)[0].messages.filter(x=>x.direction==='inbound').length,2);
});
test('retains distinct live messages with the same text at different times',()=>{
 const rows=buildInboxThreads({prospects:[sent('A')]},{seen:{}}),url=rows[0].conversation.messenger_url;
 const plan={conversations:[{external_key:'a',business_name:'A',messenger_url:url}],messages:[{external_key:'a',direction:'inbound',body:'Yes',observed_at:'2026-09-22T10:00:00Z',provenance:'messenger_aria_label:1'},{external_key:'a',direction:'inbound',body:'Yes',observed_at:'2026-09-23T10:00:00Z',provenance:'messenger_aria_label:2'}]};
 assert.equal(mergeImportedMessages(rows,plan)[0].messages.filter(x=>x.direction==='inbound').length,2);
});
test('normalized Messenger URL with or without trailing slash joins the same exact thread',()=>{
 const rows=buildInboxThreads({prospects:[sent('A')]},{seen:{}}),url=rows[0].conversation.messenger_url;
 const plan={conversations:[{external_key:'a',business_name:'A',messenger_url:url+'/'}],messages:[{external_key:'a',direction:'inbound',body:'Interested',observed_at:'2026-09-23T10:00:00Z',provenance:'messenger_aria_label:abcd'}]};
 assert.equal(mergeImportedMessages(rows,plan)[0].conversation.verified_inbound,true);
});
test('never merges a message at the wrong route or an unverified preview into another thread',()=>{
 const rows=buildInboxThreads({prospects:[sent('A')]},{seen:{}});
 const plan={conversations:[{external_key:'b',business_name:'A',messenger_url:'https://www.messenger.com/t/B'}],messages:[{external_key:'b',direction:'inbound',body:'not this recipient',provenance:'reply-monitor-preview:1'}]};
 const merged=mergeImportedMessages(rows,plan);assert.deepEqual(merged,rows);
});
test('verified inspected reply becomes inbound evidence in same stable conversation',()=>{
 const seen={one:candidate('A',{threadSpeaker:'A',threadTextVerified:true,threadVerified:true})};const rows=buildInboxThreads({prospects:[sent('A')]},{seen});assert.equal(rows.length,1);assert.equal(rows[0].conversation.verified_inbound,true);assert.deepEqual(rows[0].messages.map(x=>x.direction),['outbound','inbound']);
});
