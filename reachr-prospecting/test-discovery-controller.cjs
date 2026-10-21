const assert = require('node:assert/strict');
const { selectDiscoveryController } = require('./discovery-controller.cjs');

const dashboard = { type: 'page', url: 'https://jack108510.github.io/fb-autoposter/dashboard.html' };
const facebookGroup = { type: 'page', url: 'https://www.facebook.com/groups/example/' };
const messenger = { type: 'page', url: 'https://www.messenger.com/' };

assert.equal(
  selectDiscoveryController([messenger, facebookGroup]),
  facebookGroup,
  'discovery must use an available Facebook group tab when its old dashboard is absent'
);
assert.equal(
  selectDiscoveryController([facebookGroup, dashboard]),
  dashboard,
  'the dashboard remains preferred when it is available'
);
assert.equal(selectDiscoveryController([messenger]), messenger);
assert.equal(selectDiscoveryController([]), null);

console.log('discovery controller tests passed');
