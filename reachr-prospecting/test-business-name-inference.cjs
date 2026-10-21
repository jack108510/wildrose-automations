const assert = require('node:assert/strict');
const { inferBusinessName } = require('./business-name-inference.cjs');

assert.equal(
  inferBusinessName('Alyssa Oldford', 'I am the co-founder of an infant and children’s clothing company called Fog & Tide Apparel I created this business with a friend.'),
  'Fog & Tide Apparel'
);
assert.equal(
  inferBusinessName('Sofia Alves', 'TIRE SEASON IS COMING. Naccs Auto offers quick and convenient mobile mechanic services.'),
  'Naccs Auto'
);
assert.equal(inferBusinessName('Heating Guy', 'When your comfort cannot wait.'), 'Heating Guy');
console.log('business-name inference tests passed');
