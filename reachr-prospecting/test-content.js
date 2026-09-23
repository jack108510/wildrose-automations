const assert = require('node:assert/strict');
const {
  promotionSignals,
  isLikelyPromotion,
  normalizeBusinessName,
  composeReachrMessage,
  dedupeKey,
} = require('./content');

assert.equal(isLikelyPromotion('Licensed HVAC company taking bookings now. Call for a free estimate.'), true);
assert.equal(isLikelyPromotion('I enjoyed this local event with my family today.'), false);
assert.equal(isLikelyPromotion('DM for a free consultation and ask about our current service special.'), true);
assert.deepEqual(promotionSignals('Call our licensed repair company for a quote.'), [true, false, true]);
assert.equal(normalizeBusinessName('  Example   Business  '), 'Example Business');
assert.equal(normalizeBusinessName('John Smith · Admin'), 'John Smith');
assert.match(composeReachrMessage('Example Business'), /^Hey there, I saw Example Business posting/);
assert.match(composeReachrMessage('Example Business'), /posting manually every day/);
assert.equal(composeReachrMessage(''), '');
assert.equal(dedupeKey({ postUrl: 'https://facebook.com/groups/1/posts/2?x=1' }), 'post:https://facebook.com/groups/1/posts/2');
assert.equal(dedupeKey({ businessUrl: 'https://facebook.com/example/' }), 'business:https://facebook.com/example');

console.log('visible prospecting scan tests passed');
