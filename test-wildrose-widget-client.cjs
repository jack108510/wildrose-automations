const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('/opt/homebrew/lib/node_modules/playwright');
const asset = path.join(__dirname, 'wildrose-widget-client.js');
let browser;
after(async () => { await browser?.close(); });

async function fixture(attributes = {}, options = {}) {
  browser ||= await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const requests = [];
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://customer.example/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/embed.js') return route.fulfill({ contentType: 'text/javascript', body: fs.existsSync(asset) ? fs.readFileSync(asset, 'utf8') : 'document.currentScript.dataset.loaded="true";' });
    return route.fulfill({ contentType: 'text/html', body: '<div id="rose"></div><div id="other"></div>' });
  });
  await page.route('https://wildrose-widget.wildeautomations.com/api/**', async route => {
    const request = route.request();
    requests.push({ path: new URL(request.url()).pathname, body: request.postDataJSON(), headers: request.headers() });
    const body = request.url().endsWith('/chat/start') ? { chatId: 'chat-123' } : request.url().endsWith('/chat/message') ? { reply: 'We will send this to your team.' } : { accessToken: 'voice-token' };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body), headers: { 'access-control-allow-origin': '*' } });
  });
  await page.route('https://esm.sh/retell-client-js-sdk@2.0.7', route => route.fulfill({ contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body: 'export class RetellWebClient { on(event, fn) { (this.handlers ||= {})[event] = fn; } async startCall({accessToken}) { window.__voiceToken = accessToken; this.handlers.call_started?.(); this.handlers.update?.({conversation:[{role:"agent",content:"Hello"}]}); } stopCall() { this.handlers?.call_ended?.(); } }' }));
  await page.goto('https://customer.example/');
  await page.evaluate(attrs => { const s = document.createElement('script'); s.src = '/embed.js'; s.onload = () => { s.dataset.loaded = 'true'; }; for (const [name, value] of Object.entries(attrs)) s.setAttribute('data-' + name, value); document.body.appendChild(s); }, attributes);
  await page.waitForFunction(() => document.querySelector('script[src="/embed.js"]')?.dataset.loaded === 'true' || document.querySelector('.wrc-ai') || document.querySelector('[data-rose-client-error]'));
  return { page, requests, errors };
}

test('requires explicit client identity and does not render a Wildrose marketing fallback', async () => {
  const { page, requests, errors } = await fixture();
  assert.equal(await page.locator('.wrc-ai').count(), 0);
  assert.deepEqual(requests, []);
  assert.deepEqual(errors, []);
  await page.close();
});

test('mounts isolated customer widget, sends routed chat messages without HTML injection', async () => {
  const { page, requests, errors } = await fixture({ 'business-id': 'client-42', 'owner-email': 'owner@customer.example', 'business-name': '<img src=x onerror="window.pwned=1">', 'greeting': '<b>Welcome</b>', 'mount': '#rose', inline: 'true' });
  assert.equal(await page.locator('#rose > .wrc-ai.inline').count(), 1);
  assert.equal(await page.locator('#other .wrc-ai').count(), 0);
  assert.equal(await page.locator('#rose img[src="x"]').count(), 0);
  assert.equal(await page.locator('#rose .wrc-msg.bot').first().textContent(), '<b>Welcome</b>');
  assert.equal(await page.evaluate(() => window.pwned), undefined);
  await page.locator('.wrc-tab[data-view="chat"]').click();
  await page.locator('.wrc-input').fill('Please call me for a quote');
  await page.locator('.wrc-send').click();
  await page.getByText('We will send this to your team.').waitFor();
  assert.deepEqual(requests.map(r => r.path), ['/api/chat/start', '/api/chat/message']);
  for (const request of requests) {
    assert.equal(request.body.businessId, 'client-42');
    assert.equal(request.body.ownerEmail, 'owner@customer.example');
    assert.equal(request.body.businessName, '<img src=x onerror="window.pwned=1">');
    assert.equal(request.headers['bypass-tunnel-reminder'], '1');
  }
  assert.equal(requests[1].body.content, 'Please call me for a quote');
  assert.deepEqual(errors, []);
  await page.close();
});

test('voice uses client routing and mirrors transcript into chat', async () => {
  const { page, requests, errors } = await fixture({ 'business-id': 'client-42', 'owner-email': 'owner@customer.example' });
  await page.locator('.wrc-fab').click();
  await page.locator('.wrc-start-voice').click();
  await page.waitForFunction(() => window.__voiceToken === 'voice-token');
  assert.equal(requests[0].path, '/api/voice/start');
  assert.equal(requests[0].body.businessId, 'client-42');
  assert.equal(requests[0].body.ownerEmail, 'owner@customer.example');
  assert.match(requests[0].body.voiceVisitorId, /^[a-f0-9-]{20,80}$/i);
  await page.locator('.wrc-tab[data-view="chat"]').click();
  assert.equal(await page.locator('[data-voice-transcript="true"] .wrc-msg').last().textContent(), 'Hello');
  assert.deepEqual(errors, []);
  await page.close();
});

test('customer CSS and markup are namespaced away from sandbox widget', async () => {
  const { page } = await fixture({ 'business-id': 'client-42', 'owner-email': 'owner@customer.example' });
  assert.equal(await page.locator('.wrc-ai').count(), 1);
  assert.equal(await page.locator('.wr-ai').count(), 0);
  assert.doesNotMatch(await page.locator('style').last().textContent(), /\.wr-ai\b/);
  await page.close();
});
