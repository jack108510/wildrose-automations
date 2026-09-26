const assert=require('node:assert/strict');const {recordKey,mergeReachrRecords}=require('./queue');
const prior=[{businessName:'A&R Landscaping',businessUrl:'https://facebook.com/ar',status:'approved',decisionAt:'yesterday',observedAt:'old'}];
const incoming=[{businessName:'A&R Landscaping',businessUrl:'https://facebook.com/ar?ref=group',status:'pending_review',observedAt:'new'},{businessName:'Masalaz',businessUrl:'https://facebook.com/masalaz',status:'pending_review',observedAt:'new'}];
assert.equal(recordKey(prior[0]),'https://facebook.com/ar');
const normalizedIncoming=incoming.map(x=>({...x,businessUrl:x.businessUrl.split('?')[0]}));const merged=mergeReachrRecords(prior,normalizedIncoming);
assert.equal(merged.length,2);assert.equal(merged[0].status,'approved');assert.equal(merged[0].decisionAt,'yesterday');assert.equal(merged[0].observedAt,'new');assert.equal(merged[1].status,'pending_review');console.log('queue merge tests passed');
