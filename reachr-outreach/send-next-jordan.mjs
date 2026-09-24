#!/usr/bin/env node
/**
 * Sends at most one queued Reachr pilot invitation through the already logged-in
 * Messenger browser session. Queue entries are human-qualified public business
 * personal Messenger conversation routes only. This script never searches Facebook
 * or scrapes groups.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { waitForNewMessageOccurrence } from './messenger-route-verification.mjs';
import { releaseCdpLock, tryAcquireCdpLock } from './cdp-lock.mjs';
import { acquirePidFileLock, releasePidFileLock } from './send-lock.mjs';
import { waitForCdp } from './cdp-readiness.mjs';


const ROOT = path.dirname(fileURLToPath(import.meta.url));
const QUEUE_PATH = path.join(ROOT, 'prospects.json');
const OUTBOUND_PAUSE_PATH = path.join(ROOT, 'jordan-outbound.paused');
const MESSENGER_STATE_PATH = path.join(ROOT, 'jordan-sender-state.json');
const LOCK_PATH = path.join(ROOT, '.send-next-prospect.lock');
const CDP_LOCK_PATH = path.join(ROOT, '.reachr-cdp.lock');
const DEBUG_ENDPOINT = process.env.REACHR_CDP_ENDPOINT || 'http://127.0.0.1:9223/json/list';
const CDP_CALL_TIMEOUT_MS = 15_000;
const SEND_GAP_MS = 20 * 60 * 1000;
const DAILY_CAP = 48;
const BATCH_MODE = false;
const REQUIRED_SENDER_IDENTITY = 'Jordan Slone';
const REQUIRED_PROFILE_PATH = '/jordan.slone.778365/';
const MANUAL_BASELINE_DATE = '2026-09-23';
const MANUAL_BASELINE_COUNT = 3;

const getJson = url => new Promise((resolve, reject) => http.get(url, res => {
  let body = ''; res.on('data', chunk => body += chunk); res.on('end', () => {
    try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
  });
}).on('error', reject));

export function normalize(value = '') {
  return String(value).replace(/\s+/g, ' ').trim().toLowerCase();
}

export function composerDraftMatches(state = {}, expected = '') {
  const actual = String(state.innerText || state.textContent || '');
  return actual.trim() === String(expected).trim();
}

export function senderIdentityAllowed(actualIdentity, requiredIdentity = REQUIRED_SENDER_IDENTITY) {
  return normalize(actualIdentity) === normalize(requiredIdentity);
}

// The operator may explicitly allow sending when Messenger hides the actor label.
// The delivery ledger must preserve that this was not independently verified.
export function allowUnverifiedComposerActor(value = process.env.REACHR_ALLOW_UNVERIFIED_COMPOSER_ACTOR) {
  return value === '1';
}

export function classifyMessengerBlockingDialog({ visibleDialogText = '' } = {}) {
  const text = normalize(visibleDialogText);
  if (/you(?:'|’)re temporarily blocked|misusing this feature by going too fast|temporarily blocked from using it/.test(text)) {
    return 'messenger_feature_blocked';
  }
  if (/enter your pin to restore your chats|use a one-time code instead/.test(text)) {
    return 'chat_restore_pin_required';
  }
  return '';
}

export function classifySendFailure(error = {}) {
  const message = String(error?.message || error || '');
  if (error?.code === 'MESSENGER_FEATURE_BLOCKED' || classifyMessengerBlockingDialog({ visibleDialogText: message }) === 'messenger_feature_blocked') {
    return { code: 'MESSENGER_FEATURE_BLOCKED', globalPause: true, preserveQueuedProspect: true };
  }
  return { code: 'PROSPECT_SEND_FAILED', globalPause: false, preserveQueuedProspect: false };
}

function messengerFeatureBlockedError(observedText = '') {
  const error = new Error(`Messenger feature blocked outbound sending: ${String(observedText).replace(/\s+/g, ' ').trim().slice(0, 500)}`);
  error.code = 'MESSENGER_FEATURE_BLOCKED';
  return error;
}

function persistMessengerFeatureBlock(observedText = '', observedAt = new Date().toISOString()) {
  fs.mkdirSync(path.dirname(OUTBOUND_PAUSE_PATH), { recursive: true });
  fs.writeFileSync(OUTBOUND_PAUSE_PATH, `MESSENGER_FEATURE_BLOCKED ${observedAt}\n`);
  const temporary = `${MESSENGER_STATE_PATH}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify({
    status: 'MESSENGER_FEATURE_BLOCKED',
    observedAt,
    observedText: String(observedText).replace(/\s+/g, ' ').trim().slice(0, 1000),
    nextAction: 'manual_read_only_check_before_any_send'
  }, null, 2)}\n`);
  fs.renameSync(temporary, MESSENGER_STATE_PATH);
}

export function messengerExplicitFailure(statusItems = []) {
  const statusText = (statusItems || [])
    .flatMap(item => [item?.aria, item?.title, item?.text])
    .filter(Boolean)
    .join(' ');
  return /couldn(?:'|’)t send/i.test(statusText) ? 'couldnt_send' : '';
}

// Prefer the composer actor. Personal Messenger does not always render one, so
// the exact visible signed-in account menu is an acceptable fallback on the same
// live Messenger target. Page timeline and URL context are never actor proof.
export function verifyComposerActorEvidence(evidence = {}, requiredIdentity = REQUIRED_SENDER_IDENTITY) {
  if (!['composer_ancestor', 'facebook_me_profile'].includes(evidence.actorSource)) {
    return { verified: false, actor: '', source: evidence.actorSource || '' };
  }
  let label = String(evidence.actorLabel || '').replace(/^(?:reply|message|send)\s+as\s+/i, '').trim();
  if (!senderIdentityAllowed(label, requiredIdentity)) {
    return { verified: false, actor: label, source: evidence.actorSource };
  }
  return { verified: true, actor: requiredIdentity, source: evidence.actorSource };
}

// m.me is only the launch URL. For personal-account sending, require the resolved,
// conversation-specific Messenger route and never infer an actor from URL metadata.
export function getPageMessageRouteEvidence(url) {
  try {
    const route = new URL(url);
    const source = route.searchParams.get('messaging_source') || '';
    const sourceId = route.searchParams.get('source_id') || '';
    const isMessenger = route.hostname === 'www.facebook.com';
    const conversationRoute = /^\/messages\/t\/\d+\/?$/i.test(route.pathname);
    return {
      url: route.toString(),
      routeType: conversationRoute ? 'facebook_personal_conversation' : 'unverified_facebook_route',
      messagingSource: source,
      sourceId,
      allowed: isMessenger && conversationRoute
    };
  } catch {
    return { url: String(url || ''), routeType: 'invalid_route', messagingSource: '', sourceId: '', allowed: false };
  }
}

export function composeMessage(input) {
  const prospect = typeof input === 'string' ? { businessName: input } : input;
  const businessName = prospect.businessName;
  return `Hi ${businessName}, I saw your post in a Facebook business group. Reachr lets you write one promotion, choose your groups, and schedule the posts, saving you from posting manually every day. We're inviting a few businesses to try it free and share feedback. Would you like a quick look?`;
}

export function hasExactApproval(prospect) {
  const approval = prospect?.jordanApproval;
  return approval?.senderAccount === REQUIRED_SENDER_IDENTITY &&
    normalize(approval?.recipientName) === normalize(prospect?.recipientName || prospect?.businessName) &&
    approval?.message === composeMessage(prospect) &&
    Boolean(approval?.approvedAt);
}

// Delivery requires a newly rendered thread message and an empty composer.
// Counting whole document text alone is unsafe because it includes unsent drafts.
export function deliveryConfirmedByComposerState({ beforeCount = 0, afterCount = 0, composerText = '' } = {}) {
  return Number(afterCount) > Number(beforeCount) && String(composerText).trim() === '';
}

// Same-target Messenger UI can be optimistic. A send is final only when the
// exact message survives a newly created browser target for the same recipient.
export function deliveryConfirmedAfterFreshReopen({ expectedRecipient = '', observedRecipient = '', exactMessageCount = 0, composerText = '' } = {}) {
  return normalize(expectedRecipient) !== '' &&
    normalize(observedRecipient) === normalize(expectedRecipient) &&
    Number(exactMessageCount) > 0 &&
    String(composerText).trim() === '';
}

export function selectSendButtonLabel(labels = []) {
  return (labels || []).map(label => String(label).trim()).find(label => label === 'Send' || label === 'Press enter to send') || '';
}

export function outreachDate(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Edmonton', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date(value));
  const get = type => parts.find(part => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function isConfirmedSend(prospect) {
  return prospect?.status === 'sent' &&
    Boolean(prospect.sentAt) &&
    ['messenger_confirmed', 'messenger_ui_confirmed'].includes(prospect.delivery);
}

export function pickNextProspect(data, now = new Date()) {
  const prospects = Array.isArray(data?.prospects) ? data.prospects : [];
  const today = outreachDate(now);
  const baseline = today === MANUAL_BASELINE_DATE ? MANUAL_BASELINE_COUNT : 0;
  const attemptedToday = baseline + prospects.filter(p => {
    if (p.senderAccount !== REQUIRED_SENDER_IDENTITY) return false;
    const time = p.attemptStartedAt || (isConfirmedSend(p) ? p.sentAt : '');
    return time && outreachDate(time) === today;
  }).length;
  if (attemptedToday >= DAILY_CAP) return { reason: 'daily_cap' };
  const latest = prospects
    .filter(p => p.status === 'sent' && p.senderAccount === REQUIRED_SENDER_IDENTITY && (p.sendInitiatedAt || p.sentAt))
    .sort((a, b) => String(b.sendInitiatedAt || b.sentAt).localeCompare(String(a.sendInitiatedAt || a.sentAt)))[0];
  const latestPacingAt = latest?.sendInitiatedAt || latest?.sentAt;
  if (latestPacingAt && now.getTime() - Date.parse(latestPacingAt) < SEND_GAP_MS) {
    return { reason: 'send_gap', waitMs: SEND_GAP_MS - (now.getTime() - Date.parse(latestPacingAt)) };
  }
  const prospect = prospects.find(p => (p.status === 'queued' || (BATCH_MODE && p.status === 'needs_review')) && p.businessName && /^https:\/\/m\.me\/\d+\/?$/i.test(p.messengerUrl || '') && p.qualifiedBy === 'promotion-evidence-and-exact-page-route' && p.routeVerifiedAt && p.sourceEvidence && hasExactApproval(p));
  return prospect ? { prospect } : { reason: 'queue_empty' };
}

function saveQueue(data) {
  const temporary = `${QUEUE_PATH}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`);
  fs.renameSync(temporary, QUEUE_PATH);
}

async function connect(wsUrl) {
  const socket = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let nextId = 0;
  const waiting = new Map();
  const rejectPending = error => {
    for (const pending of waiting.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    waiting.clear();
  };
  socket.addEventListener('close', () => rejectPending(new Error('CDP socket closed before the command completed.')));
  socket.addEventListener('error', () => rejectPending(new Error('CDP socket failed before the command completed.')));
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    const pending = waiting.get(message.id);
    if (pending) {
      waiting.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(message.error.message || 'CDP command failed.'));
      else pending.resolve(message);
    }
  });
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => {
      waiting.delete(id);
      reject(new Error(`CDP command timed out: ${method}`));
    }, CDP_CALL_TIMEOUT_MS);
    waiting.set(id, { resolve, reject, timer });
    try {
      socket.send(JSON.stringify({ id, method, params }));
    } catch (error) {
      clearTimeout(timer);
      waiting.delete(id);
      reject(error);
    }
  });
  return { socket, call };
}

export async function dispatchTrustedComposerText(call, text) {
  await call('Input.insertText', { text: String(text) });
}

export async function dispatchVerifiedSendControl(call) {
  const response = await call('Runtime.evaluate', {
    expression: `(() => {const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';};const control=[...document.querySelectorAll('[role="button"]')].find(e=>visible(e)&&/^(?:send|press enter to send)$/i.test(e.getAttribute('aria-label')||''));if(!control)return false;control.click();return true;})()`,
    returnByValue: true
  });
  if (response.result?.result?.value !== true) throw new Error('Verified Messenger send control disappeared before activation.');
}

export async function sendViaMessenger(prospect) {
  const pageId = new URL(prospect.messengerUrl).pathname.match(/^\/(\d+)\/?$/)?.[1];
  if (!pageId) throw new Error('Jordan sender requires a numeric verified Page route.');
  const chatUrl = `https://www.facebook.com/messages/t/${pageId}/`;
  const tabs = await getJson(DEBUG_ENDPOINT);
  const seed = tabs.find(tab => tab.type === 'page');
  const controllerUrl = seed?.webSocketDebuggerUrl || (await getJson(DEBUG_ENDPOINT.replace(/\/json\/list$/, '/json/version'))).webSocketDebuggerUrl;
  if (!controllerUrl) throw new Error('Managed Chrome controller is unavailable.');
  const seedConnection = await connect(controllerUrl);
  const created = await seedConnection.call('Target.createTarget', { url: 'https://www.facebook.com/me', background: true });
  let targetId = created.result?.targetId;
  await new Promise(resolve => setTimeout(resolve, 4000));
  const refreshed = await getJson(DEBUG_ENDPOINT);
  const tab = refreshed.find(item => item.id === targetId);
  if (!tab) {
    if(targetId) try { await seedConnection.call('Target.closeTarget',{targetId}); } catch {}
    seedConnection.socket.close();
    throw new Error('Messenger conversation tab did not open.');
  }
  const { socket, call } = await connect(tab.webSocketDebuggerUrl);
  try {
    // A fresh /me navigation proves the currently authenticated account. Old tabs
    // can retain another account's messages after Facebook switches profiles.
    await call('Page.bringToFront');
    const profile = await call('Runtime.evaluate', { expression: 'location.pathname', returnByValue: true });
    if (profile.result?.result?.value !== REQUIRED_PROFILE_PATH) {
      throw new Error(`Jordan sender identity preflight failed: fresh /me resolved to ${profile.result?.result?.value || 'unknown'}.`);
    }
    await call('Page.navigate', { url: chatUrl });
    await new Promise(resolve => setTimeout(resolve, 4000));
    const resolvedRoute = await call('Runtime.evaluate', { expression: 'location.href', returnByValue: true });
    const routeEvidence = getPageMessageRouteEvidence(resolvedRoute.result?.result?.value || tab.url);
    if (!routeEvidence.allowed) {
      throw new Error(`Facebook Chats route verification failed: expected the queued Page conversation, got "${routeEvidence.url}".`);
    }
    const blockingDialogResult = await call('Runtime.evaluate', {
      expression: `(() => {
        const visible = el => { const style = getComputedStyle(el), rect = el.getBoundingClientRect(); return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'; };
        const dialogText = [...document.querySelectorAll('[role="dialog"]')]
          .filter(visible)
          .map(el => el.innerText || el.textContent || '')
          .join(' ');
        return [dialogText, document.body?.innerText || document.body?.textContent || ''].join(' ');
      })()`,
      returnByValue: true
    });
    const visibleBlockingText = blockingDialogResult.result?.result?.value || '';
    const blockingDialog = classifyMessengerBlockingDialog({ visibleDialogText: visibleBlockingText });
    if (blockingDialog === 'messenger_feature_blocked') {
      throw messengerFeatureBlockedError(visibleBlockingText);
    }
    if (blockingDialog === 'chat_restore_pin_required') {
      throw new Error('Messenger is blocked by the visible chat-restore PIN dialog. Restore the Messenger chats manually before outbound sending can resume.');
    }
    let identity;
    for (let attempt = 0; attempt < 30; attempt++) {
      identity = await call('Runtime.evaluate', { expression: `(() => ({ title: document.title, label: [...document.querySelectorAll('[contenteditable="true"]')].map(e => e.getAttribute('aria-label') || '').find(label => /^Write to\\s+\\S/i.test(label)) || '' }))()`, returnByValue: true });
      if (identity.result?.result?.value?.label) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    const actual = normalize(identity?.result?.result?.value?.label?.replace(/^Write to\s*/i, ''));
    const expectedRecipient = prospect.recipientName || prospect.businessName;
    const expected = normalize(expectedRecipient);
    if (!actual || actual !== expected) throw new Error(`Recipient verification failed: expected "${expectedRecipient}", got "${identity?.result?.result?.value?.label || 'no composer'}".`);
    const senderProof = verifyComposerActorEvidence({ actorLabel: REQUIRED_SENDER_IDENTITY, actorSource: 'facebook_me_profile' });
    if (!senderProof.verified) throw new Error('Jordan sender identity verification failed.');
    const actualSender = senderProof.actor;
    const senderIdentityVerification = 'facebook_me_profile_verified';
    if (process.env.REACHR_DRY_RUN === '1') {
      return {
        dryRun: true,
        messengerUrl: routeEvidence.url,
        senderIdentity: actualSender,
        senderIdentityVerification,
        senderAccount: REQUIRED_SENDER_IDENTITY,
        routeType: routeEvidence.routeType,
        messagingSource: routeEvidence.messagingSource,
        sourceId: routeEvidence.sourceId
      };
    }
    const text = composeMessage(prospect);
    const safeLabel = JSON.stringify(identity.result.result.value.label);
    const safeText = JSON.stringify(text);
    const countExactMessage = async () => {
      const result = await call('Runtime.evaluate', {
        expression: `(() => {
          const clone = document.body.cloneNode(true);
          clone.querySelectorAll('[contenteditable="true"]').forEach(node => node.remove());
          const text = clone.innerText || '';
          const needle = ${safeText};
          return text.split(needle).length - 1;
        })()`,
        returnByValue: true
      });
      return Number(result.result?.result?.value || 0);
    };
    const beforeCount = await countExactMessage();
    if (beforeCount > 0) throw new Error('Exact outreach message is already present in the Messenger thread.');
    await call('Runtime.evaluate', { expression: `(() => { const el = [...document.querySelectorAll('[contenteditable="true"]')].find(e => e.getAttribute('aria-label') === ${safeLabel}); el?.focus(); })()` });
    await dispatchTrustedComposerText(call, text);
    const draft = await call('Runtime.evaluate', { expression: `(() => { const visible = e => { const s=getComputedStyle(e),r=e.getBoundingClientRect(); return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'; }; const e=[...document.querySelectorAll('[contenteditable="true"]')].find(visible); return e ? { innerText:e.innerText||'', textContent:e.textContent||'' } : null; })()`, returnByValue: true });
    if (!composerDraftMatches(draft.result?.result?.value || {}, text)) throw new Error('Messenger draft verification failed.');
    const sendControl = await call('Runtime.evaluate', {
      expression: `(() => {
        const visible = el => { const style = getComputedStyle(el), rect = el.getBoundingClientRect(); return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'; };
        const button = [...document.querySelectorAll('button,[role="button"]')].filter(visible).find(el => ['Send', 'Press enter to send'].includes((el.getAttribute('aria-label') || el.getAttribute('title') || el.innerText || '').trim()));
        if (!button) return null;
        const rect = button.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, label: (button.getAttribute('aria-label') || button.getAttribute('title') || button.innerText || '').trim() };
      })()`,
      returnByValue: true
    });
    const sendPoint = sendControl.result?.result?.value;
    if (!sendPoint || !Number.isFinite(sendPoint.x) || !Number.isFinite(sendPoint.y)) {
      throw new Error('Messenger send control was not available for the verified draft.');
    }
    await call('Runtime.evaluate', { expression: `(() => { const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';}; const el=[...document.querySelectorAll('[contenteditable="true"]')].find(visible); el?.focus(); return document.activeElement === el; })()`, returnByValue: true });
    await dispatchVerifiedSendControl(call);
    const sendInitiatedAt = new Date().toISOString();
    try {
      await waitForNewMessageOccurrence(beforeCount, countExactMessage, { attempts: 30, intervalMs: 1000, stableChecks: 20 });
    } catch (error) {
      const diagnostic = await call('Runtime.evaluate', {
        expression: `(() => {const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';};const composer=[...document.querySelectorAll('[contenteditable="true"]')].find(visible);const statuses=[...document.querySelectorAll('[aria-label],[title]')].filter(visible).map(e=>e.getAttribute('aria-label')||e.getAttribute('title')||'').filter(x=>/couldn(?:'|’)t send|failed|retry|send/i.test(x)).slice(0,10);return {composerLength:(composer?.innerText||'').length,statuses};})()`,
        returnByValue: true
      });
      const state = diagnostic.result?.result?.value || {};
      throw new Error(`Messenger did not confirm exact outgoing message (composerLength=${state.composerLength ?? -1}, statuses=${JSON.stringify(state.statuses || [])}).`, { cause: error });
    }
    const afterCount = await countExactMessage();
    const composerAfterSend = await call('Runtime.evaluate', {
      expression: `(() => {const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';};return [...document.querySelectorAll('[contenteditable="true"]')].find(visible)?.innerText||''})()`,
      returnByValue: true
    });
    if (!deliveryConfirmedByComposerState({
      beforeCount,
      afterCount,
      composerText: composerAfterSend.result?.result?.value || ''
    })) throw new Error('Messenger delivery verification failed: no new rendered message with a cleared composer.');
    const sameTargetStatusResult = await call('Runtime.evaluate', {
      expression: `(() => {
        const needle = ${safeText};
        return [...document.querySelectorAll('[aria-label],[title]')]
          .map(el => ({ aria: el.getAttribute('aria-label') || '', title: el.getAttribute('title') || '', text: el.innerText || el.textContent || '' }))
          .filter(item => [item.aria, item.title, item.text].some(value => String(value).includes(needle)) || /message (?:sent|sending|failed)|couldn(?:'|’)t send|retry/i.test([item.aria, item.title].join(' ')))
          .slice(0, 20);
      })()`,
      returnByValue: true
    });
    const sameTargetStatus = sameTargetStatusResult.result?.result?.value || [];
    if (messengerExplicitFailure(sameTargetStatus) === 'couldnt_send') {
      throw new Error(`Messenger explicitly rejected the outgoing message for "${expectedRecipient}": Couldn't send.`);
    }

    // The current React tree may show an optimistic outgoing bubble even when the
    // server never persisted it. Destroy that target, reopen the exact route in a
    // fresh target, and re-read the recipient, composer, and message from scratch.
    socket.close();
    await seedConnection.call('Target.closeTarget', { targetId });
    targetId = undefined;
    await new Promise(resolve => setTimeout(resolve, 1000));

    const reopened = await seedConnection.call('Target.createTarget', { url: routeEvidence.url, background: true });
    targetId = reopened.result?.targetId;
    if (!targetId) throw new Error('Messenger fresh-readback target did not open.');
    await new Promise(resolve => setTimeout(resolve, 4000));
    const reopenedTargets = await getJson(DEBUG_ENDPOINT);
    const reopenedTab = reopenedTargets.find(item => item.id === targetId);
    if (!reopenedTab) throw new Error('Messenger fresh-readback target disappeared before verification.');
    const freshConnection = await connect(reopenedTab.webSocketDebuggerUrl);
    let freshReadback;
    try {
      await freshConnection.call('Page.bringToFront');
      for (let attempt = 0; attempt < 30; attempt++) {
        const result = await freshConnection.call('Runtime.evaluate', {
          expression: `(() => {
            const norm = value => String(value || '').replace(/\\s+/g, ' ').trim();
            const composer = [...document.querySelectorAll('[contenteditable="true"]')]
              .find(el => /^Write to\\s+\\S/i.test(el.getAttribute('aria-label') || ''));
            if (!composer) return { ready: false };
            const clone = document.body.cloneNode(true);
            clone.querySelectorAll('[contenteditable="true"]').forEach(node => node.remove());
            const expected = norm(${safeText});
            const threadText = norm(clone.innerText || clone.textContent || '');
            const label = composer.getAttribute('aria-label') || '';
            return {
              ready: true,
              observedRecipient: label.replace(/^Write to\\s*/i, ''),
              exactMessageCount: expected ? threadText.split(expected).length - 1 : 0,
              composerText: composer.innerText || composer.textContent || '',
              url: location.href
            };
          })()`,
          returnByValue: true
        });
        freshReadback = result.result?.result?.value;
        if (freshReadback?.ready && freshReadback?.exactMessageCount > 0) break;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } finally {
      freshConnection.socket.close();
    }
    if (!freshReadback?.ready || !deliveryConfirmedAfterFreshReopen({
      expectedRecipient,
      observedRecipient: freshReadback.observedRecipient,
      exactMessageCount: freshReadback.exactMessageCount,
      composerText: freshReadback.composerText
    })) {
      const statusSummary = JSON.stringify(sameTargetStatus).slice(0, 2000);
      throw new Error(`Messenger fresh-readback verification failed: the exact outgoing message did not persist for "${expectedRecipient}" after reopening the conversation. Same-target status: ${statusSummary}`);
    }
    return {
      messengerUrl: routeEvidence.url,
      message: text,
      senderIdentity: actualSender,
      senderIdentityVerification,
      senderAccount: REQUIRED_SENDER_IDENTITY,
      routeType: routeEvidence.routeType,
      messagingSource: routeEvidence.messagingSource,
      sourceId: routeEvidence.sourceId,
      sendInitiatedAt,
      deliveryEvidence: 'exact_message_confirmed_after_fresh_target_reopen'
    };
  } finally {
    socket.close();
    if(targetId) try { await seedConnection.call('Target.closeTarget',{targetId}); } catch {}
    seedConnection.socket.close();
  }
}

async function main() {
  const dryRun = process.env.REACHR_DRY_RUN === '1';
  if (!dryRun && process.env.REACHR_JORDAN_LIVE !== '1') { console.log('NO_SEND:jordan_live_disabled'); return; }
  if (!dryRun && fs.existsSync(OUTBOUND_PAUSE_PATH)) { console.log('NO_SEND:outbound_paused_for_delivery_review'); return; }
  let ownsLock = false;
  try {
    ownsLock = acquirePidFileLock(LOCK_PATH);
    if (!ownsLock) { console.log('NO_SEND:locked'); return; }
    let data = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'));
    let selected = pickNextProspect(data);
    if (selected.reason === 'send_gap' && selected.waitMs > 0 && selected.waitMs <= 90_000) {
      console.log(`WAITING_FOR_SEND_GAP:${Math.ceil(selected.waitMs / 1000)}s`);
      await new Promise(resolve => setTimeout(resolve, selected.waitMs + 250));
      data = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'));
      selected = pickNextProspect(data);
    }
    if (!selected.prospect) { console.log(`NO_SEND:${selected.reason}`); return; }
    const prospect = selected.prospect;
    const cdp = tryAcquireCdpLock(CDP_LOCK_PATH);
    if (!cdp.acquired) { console.log('NO_SEND:cdp_busy'); return; }
    try {
      if (!await waitForCdp({ endpoint: DEBUG_ENDPOINT })) { console.log('NO_SEND:cdp_unavailable'); return; }
      if (!dryRun && fs.existsSync(OUTBOUND_PAUSE_PATH)) { console.log('NO_SEND:outbound_paused_for_delivery_review'); return; }
      if (!dryRun) {
        prospect.status = 'attempting';
        prospect.senderAccount = REQUIRED_SENDER_IDENTITY;
        prospect.attemptStartedAt = new Date().toISOString();
        saveQueue(data);
      }
      const result = await sendViaMessenger(prospect);
      if (result.dryRun) {
        console.log(`READY:${prospect.businessName}:${result.routeType}:${result.senderIdentity}`);
        return;
      }
      prospect.status = 'sent';
      prospect.sendInitiatedAt = result.sendInitiatedAt;
      prospect.sentAt = new Date().toISOString();
      prospect.delivery = 'messenger_confirmed';
      prospect.deliveryEvidence = result.deliveryEvidence;
      prospect.sentMessage = result.message;
      prospect.senderIdentity = result.senderIdentity;
      prospect.senderIdentityVerification = result.senderIdentityVerification;
      prospect.senderAccount = result.senderAccount;
      prospect.routeType = result.routeType;
      prospect.messengerUrl = result.messengerUrl;
      prospect.messagingSource = result.messagingSource;
      prospect.sourceId = result.sourceId;
      saveQueue(data);
      console.log(`SENT:${prospect.businessName}`);
    } catch (error) {
      const failure = classifySendFailure(error);
      if (failure.globalPause) {
        persistMessengerFeatureBlock(error.message);
        console.error(`NO_SEND:${failure.code}:${error.message}`);
      } else {
        prospect.status = 'needs_review'; prospect.lastError = error.message; prospect.lastAttemptAt = new Date().toISOString();
        saveQueue(data);
        console.error(`NOT_SENT:${prospect.businessName}:${error.message}`);
      }
      process.exitCode = 1;
    } finally {
      releaseCdpLock(CDP_LOCK_PATH);
    }
  } finally {
    if (ownsLock) releasePidFileLock(LOCK_PATH);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
