const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('CAD and USD amounts are clearly differentiated and estimates use the returned rate', () => {
  const { formatRosePrice } = require('../rose-currency.js');
  assert.equal(formatRosePrice(39, 'CAD'), 'CA$39');
  assert.equal(formatRosePrice(39, 'USD', 0.70159), '≈ US$27.36');
  assert.equal(formatRosePrice(129, 'USD', 0.70159), '≈ US$90.51');
  assert.equal(formatRosePrice(0.29, 'USD', 0.70159), '≈ US$0.20');
  assert.throws(() => formatRosePrice(39, 'USD', NaN), /exchange rate/i);
});

test('exchange responses must be fresh, positive and for CAD to USD', () => {
  const { parseRoseRate } = require('../rose-currency.js');
  const current = new Date('2026-10-07T12:00:00Z');
  const fresh = Date.parse('2026-10-07T00:02:32Z') / 1000;
  assert.equal(parseRoseRate({result: 'success', base_code: 'CAD', time_last_update_unix: fresh, rates: {USD: 0.70159}}, current).rate, 0.70159);
  assert.throws(() => parseRoseRate({result: 'success', base_code: 'USD', time_last_update_unix: fresh, rates: {USD: 1}}, current), /CAD/i);
  assert.throws(() => parseRoseRate({result: 'success', base_code: 'CAD', time_last_update_unix: Date.parse('2026-09-01T00:00:00Z') / 1000, rates: {USD: 0.7}}, current), /stale/i);
  assert.throws(() => parseRoseRate({result: 'success', base_code: 'CAD', time_last_update_unix: fresh, rates: {USD: 0}}, current), /rate/i);
});

test('USD estimates credit the exchange-rate source and retain CAD payment disclosure', () => {
  const script = read('rose-currency.js');
  assert.match(script, /https:\/\/www\.exchangerate-api\.com/);
  assert.match(script, /Square checkout is charged in CAD/);
});

test('live preview and purchase page offer estimated USD while retaining CAD checkout', () => {
  for (const file of ['ai-tool-mockup-final.html', 'rose-purchase-demo/index.html']) {
    const html = read(file);
    assert.match(html, /rose-currency\.js\?v=/, file);
    assert.match(html, /data-rose-currency-picker/, file);
    assert.match(html, /data-rose-cad="39"/, file);
    assert.match(html, /data-rose-cad="129"/, file);
    assert.match(html, /charged in CAD/i, file);
    assert.doesNotMatch(html, /Rose Basic — \$24|Rose Pro — \$79|\$24\/month|\$79\/month/, file);
  }
});
