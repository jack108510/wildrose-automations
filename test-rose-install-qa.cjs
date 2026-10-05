const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('rose-install-qa-20261005.html', 'utf8');
assert.match(html, /name="robots" content="noindex, nofollow"/);
assert.match(html, /wildrose-widget-client\.js\?v=customer-1&amp;client=wildrose-automations/);
assert.match(html, /data-business-id="wildrose-automations"/);
assert.match(html, /data-owner-email="jack@wildroseautomations\.ca"/);
assert.doesNotMatch(html, /wildrose-widget-sandbox\.js/);
console.log('controlled Rose install fixture passed');
