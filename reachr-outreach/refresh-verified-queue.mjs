#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeVerifiedAddition, messengerRouteFromProfileUrl, normalizeBusinessName as norm, selectRouteCandidates, sourceKey } from './route-state-policy.mjs';
import { waitForVerifiedComposer } from './messenger-route-verification.mjs';
import { selectOfficialPageSearchResult } from './page-search-policy.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DISCOVERY = path.join(ROOT, '../reachr-prospecting/discovery-50-results.json');
const QUEUE = path.join(ROOT, 'prospects.json');
const STATE = path.join(ROOT, 'route-resolution-state.json');
const QUEUE_LOCK = path.join(ROOT, '.send-next-prospect.lock');
const CDP = process.env.REACHR_CDP_ENDPOINT || 'http://127.0.0.1:9223';
const argLimit = process.argv.find(x => x.startsWith('--limit='));
const LIMIT = Number(argLimit?.split('=')[1] || 20);
const UNTIL_VERIFIED = process.argv.includes('--until-verified');
const NO_WRITE = process.argv.includes('--no-write');
const NO_QUEUE_WRITE = NO_WRITE || process.argv.includes('--no-queue-write');
const WAIT = Number(process.env.REACHR_PAGE_WAIT_MS || 6500);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));


function get(url) {
  return new Promise((resolve, reject) => http.get(url, response => {
    let body = '';
    response.on('data', chunk => body += chunk);
    response.on('end', () => { try { resolve(JSON.parse(body)); } catch (error) { reject(error); } });
  }).on('error', reject));
}
function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.onopen = () => {
      let id = 0;
      const pending = new Map();
      ws.onmessage = event => {
        const message = JSON.parse(event.data);
        const item = pending.get(message.id);
        if (!item) return;
        pending.delete(message.id);
        clearTimeout(item.timer);
        message.error ? item.reject(Error(message.error.message)) : item.resolve(message.result);
      };
      resolve({ ws, call: (method, params = {}) => new Promise((res, rej) => {
        const requestId = ++id;
        const timer = setTimeout(() => { pending.delete(requestId); rej(Error(`${method} timeout`)); }, 20000);
        pending.set(requestId, { resolve: res, reject: rej, timer });
        ws.send(JSON.stringify({ id: requestId, method, params }));
      }) });
    };
    ws.onerror = reject;
  });
}

async function inspectPage(page) {
  const evaluated = await page.call('Runtime.evaluate', {
    expression: `(() => ({url:location.href,title:document.title,body:document.body.innerText.slice(0,5000)}))()`,
    returnByValue: true
  });
  return evaluated.result.value;
}
function acquireQueueLock() {
  try { fs.writeFileSync(QUEUE_LOCK, `${process.pid}\n${new Date().toISOString()}\n`, { flag: 'wx' }); return true; }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const age = Date.now() - fs.statSync(QUEUE_LOCK).mtimeMs;
    if (age <= 30 * 60 * 1000) return false;
    fs.unlinkSync(QUEUE_LOCK);
    fs.writeFileSync(QUEUE_LOCK, `${process.pid}\n${new Date().toISOString()}\n`, { flag: 'wx' });
    return true;
  }
}
function atomicJson(pathname, value) {
  const temporary = `${pathname}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporary, pathname);
}

async function main() {
  const discovery = JSON.parse(fs.readFileSync(DISCOVERY));
  const startingQueue = JSON.parse(fs.readFileSync(QUEUE));
  const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE)) : { schema: 'reachr.route-state.v1', records: {} };
  const candidates = selectRouteCandidates(discovery.prospects, startingQueue.prospects, state, new Date(), LIMIT);
  const tabs = await get(`${CDP}/json/list`);
  const base = tabs.find(tab => tab.type === 'page' && /fb-autoposter\/dashboard/.test(tab.url)) || tabs.find(tab => tab.type === 'page');
  if (!base) throw Error('managed Chrome controller unavailable');
  const controller = await connect(base.webSocketDebuggerUrl);
  const outcomes = [], additions = [];

  for (const candidate of candidates) {
    const source = candidate.selectedSource || candidate.sources[0], key = sourceKey(candidate, source);
    const previous = state.records[key];
    const outcome = { businessName: candidate.businessName, key, status: 'not_queued', checkedAt: new Date().toISOString(), attempts: Number(previous?.attempts || 0) + 1, pageSearchAttempted: false };
    let targetId, page;
    try {
      const numericId = (candidate.businessUrl.match(/\/user\/(\d+)/) || candidate.businessUrl.match(/[?&]id=(\d+)/) || [])[1];
      const profileUrl = numericId ? `https://www.facebook.com/profile.php?id=${numericId}` : candidate.businessUrl;
      const made = await controller.call('Target.createTarget', { url: profileUrl, background: true });
      targetId = made.targetId;
      await sleep(WAIT);
      const live = await get(`${CDP}/json/list`), tab = live.find(item => item.id === targetId);
      if (!tab) throw Error('profile tab missing');
      page = await connect(tab.webSocketDebuggerUrl);
      let profile = await inspectPage(page);
      let body = profile.body || '';
      let apparentPage = /\bfollowers?\b|\bPage\s*·|Accounting Service|Local Service|Business Service|Contractor|Restaurant|Pet Service|Consulting|Bookkeeping|Automotive|Shopping|Clothing Store|Product\/service/i.test(body);
      if (!apparentPage || !norm(body).includes(norm(candidate.businessName))) {
        outcome.pageSearchAttempted = true;
        await page.call('Page.navigate', { url: `https://www.facebook.com/search/pages/?q=${encodeURIComponent(candidate.businessName)}` });
        await sleep(WAIT);
        const searchResult = await page.call('Runtime.evaluate', {
          expression: `(() => [...document.querySelectorAll('a[href]')].map(a => ({href:a.href,text:(a.innerText||a.textContent||'').trim(),context:((a.closest('[role="article"]')||a.parentElement?.parentElement||a).innerText||'').slice(0,600)})).filter(x => x.href && x.text).slice(0,250))()`,
          returnByValue: true
        });
        const officialPage = selectOfficialPageSearchResult(searchResult.result.value || [], candidate.businessName);
        if (!officialPage) throw Error('no matching public business Page found');
        await page.call('Page.navigate', { url: officialPage.href });
        await sleep(WAIT);
        profile = await inspectPage(page);
        body = profile.body || '';
        apparentPage = /\bfollowers?\b|\bPage\s*·|Accounting Service|Local Service|Business Service|Contractor|Restaurant|Pet Service|Consulting|Bookkeeping|Automotive|Shopping|Clothing Store|Product\/service/i.test(body);
      }
      if (!apparentPage) throw Error('identity is not a public business Page');
      if (!norm(body).includes(norm(candidate.businessName))) throw Error('business identity not present on resolved profile');
      const messengerUrl = messengerRouteFromProfileUrl(profile.url);
      if (!messengerUrl) throw Error('Page has no stable public route; refusing to synthesize a Messenger thread from a profile ID');
      await page.call('Page.navigate', { url: messengerUrl });
      await sleep(WAIT);
      const verifiedComposer = await waitForVerifiedComposer(candidate.businessName, async () => {
        const labelResult = await page.call('Runtime.evaluate', {
          expression: `(() => [...document.querySelectorAll('[contenteditable="true"]')].map(e => e.getAttribute('aria-label') || '').find(label => /^Write to/i.test(label)) || '')()`,
          returnByValue: true
        });
        return labelResult.result.value || '';
      }, { attempts: 15, intervalMs: 1000 });
      const { recipient } = verifiedComposer;
      additions.push({
        businessName: candidate.businessName,
        recipientName: recipient,
        messengerUrl,
        sourceGroup: source.sourceGroup || source.sourceGroupUrl,
        sourceUrl: source.postUrl || candidate.businessUrl,
        sourceEvidence: (source.observedText || '').slice(0, 1200),
        promotionContext: 'your services',
        status: 'queued',
        qualifiedAt: new Date().toISOString(),
        qualifiedBy: 'promotion-evidence-and-exact-page-route',
        routeVerifiedAt: new Date().toISOString()
      });
      outcome.status = 'queued'; outcome.recipient = recipient; outcome.messengerUrl = messengerUrl;
      console.log(`${candidate.businessName}: queued as ${recipient}`);
    } catch (error) {
      outcome.reason = error.message;
      console.log(`${candidate.businessName}: not_queued (${error.message})`);
    } finally {
      state.records[key] = outcome;
      if (!NO_WRITE) atomicJson(STATE, state);
      outcomes.push(outcome);
      try { page?.ws.close(); } catch {}
      if (targetId) try { await controller.call('Target.closeTarget', { targetId }); } catch {}
    }
    if (UNTIL_VERIFIED && additions.length > 0) break;
  }
  controller.ws.close();

  let added = 0, recovered = 0, remainingQueue = startingQueue.prospects.filter(p => p.status === 'queued').length;
  if (!NO_QUEUE_WRITE) {
    let locked = acquireQueueLock();
    if (!locked) {
      await sleep(30000);
      locked = acquireQueueLock();
    }
    if (!locked) throw Error('queue busy; verified routes retained in state but not merged');
    try {
      const latest = JSON.parse(fs.readFileSync(QUEUE));
      for (const addition of additions) {
        const result = mergeVerifiedAddition(latest.prospects, addition);
        added += result.added;
        recovered += result.recovered;
      }
      atomicJson(QUEUE, latest);
      remainingQueue = latest.prospects.filter(p => p.status === 'queued').length;
    } finally { try { fs.unlinkSync(QUEUE_LOCK); } catch {} }
  }
  if (!NO_WRITE) atomicJson(STATE, state);
  // `additions` lets the full-cycle caller dispatch the exact freshly verified
  // lead without using the queue as a pre-send staging area.
  console.log(JSON.stringify({ checked: outcomes.length, verified: additions.length, additions, added, recovered, noWrite: NO_WRITE, noQueueWrite: NO_QUEUE_WRITE, remainingQueue }, null, 2));
}
main().catch(error => { console.error(error.stack || error); process.exit(1); });
