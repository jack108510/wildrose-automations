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
const OUTBOUND_PAUSE_PATH = '/Users/jackserver/jsw/keys/reachr-outbound.paused';
const LOCK_PATH = path.join(ROOT, '.send-next-prospect.lock');
const CDP_LOCK_PATH = path.join(ROOT, '.reachr-cdp.lock');
const DEBUG_ENDPOINT = process.env.REACHR_CDP_ENDPOINT || 'http://127.0.0.1:9223/json/list';
const CDP_CALL_TIMEOUT_MS = 15_000;
const SEND_GAP_MS = 9 * 60 * 1000;
const DAILY_CAP = 150;
const BATCH_MODE = false;
// Personal-account outreach must be sent from Jack's verified personal actor,
// never silently from the managed Wildrose Page.
const REQUIRED_SENDER_IDENTITY = 'Jack Sereda';
const JACK_COMPOSER_LABELS = new Set(['jack sereda', 'jack @jack.sereda.2025']);

const getJson = url => new Promise((resolve, reject) => http.get(url, res => {
  let body = ''; res.on('data', chunk => body += chunk); res.on('end', () => {
    try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
  });
}).on('error', reject));

export function normalize(value = '') {
  return String(value).replace(/\s+/g, ' ').trim().toLowerCase();
}

export function senderIdentityAllowed(actualIdentity, requiredIdentity = REQUIRED_SENDER_IDENTITY) {
  const actual = normalize(actualIdentity);
  if (normalize(requiredIdentity) === normalize(REQUIRED_SENDER_IDENTITY)) return JACK_COMPOSER_LABELS.has(actual);
  return actual === normalize(requiredIdentity);
}

// The operator may explicitly allow sending when Messenger hides the actor label.
// The delivery ledger must preserve that this was not independently verified.
export function allowUnverifiedComposerActor(value = process.env.REACHR_ALLOW_UNVERIFIED_COMPOSER_ACTOR) {
  return value === '1';
}

export function classifyMessengerBlockingDialog({ visibleDialogText = '' } = {}) {
  const text = normalize(visibleDialogText);
  if (/enter your pin to restore your chats|use a one-time code instead/.test(text)) {
    return 'chat_restore_pin_required';
  }
  return '';
}

export function messengerExplicitFailure(statusItems = []) {
  const statusText = (statusItems || [])
    .flatMap(item => [item?.aria, item?.title, item?.text])
    .filter(Boolean)
    .join(' ');
  return /couldn(?:'|’)t send/i.test(statusText) ? 'couldnt_send' : '';
}

// Identity is valid only when it comes from the actual message-composer region.
// Page timelines, account menus, and URL context can prove Page access but cannot
// prove which actor Messenger will use for this specific outgoing message.
export function verifyComposerActorEvidence(evidence = {}, requiredIdentity = REQUIRED_SENDER_IDENTITY) {
  if (evidence.actorSource !== 'composer_ancestor') {
    return { verified: false, actor: '', source: evidence.actorSource || '' };
  }
  const label = String(evidence.actorLabel || '').replace(/^(?:reply|message|send)\s+as\s+/i, '').trim();
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
    const isMessenger = /(^|\.)messenger\.com$/i.test(route.hostname);
    const conversationRoute = /^\/t\/[^/?#]+\/?$/i.test(route.pathname);
    return {
      url: route.toString(),
      routeType: conversationRoute ? 'messenger_personal_conversation' : 'unverified_messenger_route',
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
  return `Hey, I’m Jack. I’m a student at SMU and I’ve been creating a software called Reachr that helps businesses post across Facebook groups without having to do it all manually.\n\nI’m looking for real business experience and feedback as we build it out. Would ${businessName} be interested in testing the tool for free and letting us know what you think?`;
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
  const sentToday = prospects.filter(p => isConfirmedSend(p) && outreachDate(p.sentAt) === today).length;
  if (sentToday >= DAILY_CAP) return { reason: 'daily_cap' };
  const latest = prospects
    .filter(p => p.status === 'sent' && (p.sendInitiatedAt || p.sentAt))
    .sort((a, b) => String(b.sendInitiatedAt || b.sentAt).localeCompare(String(a.sendInitiatedAt || a.sentAt)))[0];
  const latestPacingAt = latest?.sendInitiatedAt || latest?.sentAt;
  if (latestPacingAt && now.getTime() - Date.parse(latestPacingAt) < SEND_GAP_MS) {
    return { reason: 'send_gap', waitMs: SEND_GAP_MS - (now.getTime() - Date.parse(latestPacingAt)) };
  }
  const prospect = prospects.find(p => (p.status === 'queued' || (BATCH_MODE && p.status === 'needs_review')) && p.businessName && /^https:\/\/(m\.me|www\.messenger\.com)\//i.test(p.messengerUrl || ''));
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

async function dispatchTrustedComposerText(call, text) {
  for (const character of String(text)) {
    if (character === '\n') {
      await call('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Enter', code: 'Enter', modifiers: 8, windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
      await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', modifiers: 8, windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
      continue;
    }
    await call('Input.dispatchKeyEvent', { type: 'char', text: character, unmodifiedText: character });
  }
}

export async function sendViaMessenger(prospect) {
  // Do not switch into the managed Page. The conversation-specific composer actor
  // gate below must prove the personal Jack Sereda sender before any typing.
  const tabs = await getJson(DEBUG_ENDPOINT);
  const seed = tabs.find(tab => tab.type === 'page');
  const controllerUrl = seed?.webSocketDebuggerUrl || (await getJson(DEBUG_ENDPOINT.replace(/\/json\/list$/, '/json/version'))).webSocketDebuggerUrl;
  if (!controllerUrl) throw new Error('Managed Chrome controller is unavailable.');
  const seedConnection = await connect(controllerUrl);
  const created = await seedConnection.call('Target.createTarget', { url: prospect.messengerUrl, background: true });
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
    // CDP input sent to a background Messenger target can update the local DOM without
    // committing the action to Messenger. Foreground this tab inside managed Chrome;
    // this does not raise the Chrome window or steal the operator's macOS focus.
    await call('Page.bringToFront');
    const resolvedRoute = await call('Runtime.evaluate', { expression: 'location.href', returnByValue: true });
    const routeEvidence = getPageMessageRouteEvidence(resolvedRoute.result?.result?.value || tab.url);
    if (!routeEvidence.allowed) {
      throw new Error(`Personal Messenger route verification failed: expected a resolved Messenger conversation, got "${routeEvidence.url}".`);
    }
    const blockingDialogResult = await call('Runtime.evaluate', {
      expression: `(() => {
        const visible = el => { const style = getComputedStyle(el), rect = el.getBoundingClientRect(); return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'; };
        return [...document.querySelectorAll('[role="dialog"]')]
          .filter(visible)
          .map(el => el.innerText || el.textContent || '')
          .join(' ');
      })()`,
      returnByValue: true
    });
    const blockingDialog = classifyMessengerBlockingDialog({ visibleDialogText: blockingDialogResult.result?.result?.value || '' });
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
    const composerActorResult = await call('Runtime.evaluate', {
      expression: `(() => {
        const composer = [...document.querySelectorAll('[contenteditable="true"]')].find(e => e.getAttribute('aria-label') === ${JSON.stringify(identity.result.result.value.label)});
        if (!composer) return { actorLabel: '', actorSource: '' };
        const root = composer.closest('[role="dialog"], [role="main"]') || composer.parentElement;
        const visible = el => { const style = getComputedStyle(el), rect = el.getBoundingClientRect(); return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'; };
        const actorLabel = [...root.querySelectorAll('[aria-label],[title]')]
          .filter(visible)
          .map(el => el.getAttribute('aria-label') || el.getAttribute('title') || '')
          .find(label => /^(?:reply|message|send)\\s+as\\s+.+/i.test(label)) || '';
        return { actorLabel, actorSource: actorLabel ? 'composer_ancestor' : '' };
      })()`,
      returnByValue: true
    });
    const composerActor = composerActorResult.result?.result?.value || {};
    const senderProof = verifyComposerActorEvidence(composerActor);
    const senderIdentityVerified = senderProof.verified;
    if (!senderIdentityVerified && !allowUnverifiedComposerActor()) {
      throw new Error(`Sender identity verification failed at the live Messenger composer: expected "${REQUIRED_SENDER_IDENTITY}", got "${senderProof.actor || 'no composer actor label'}".`);
    }
    const actualSender = senderIdentityVerified ? senderProof.actor : 'unverified_composer_actor';
    const senderIdentityVerification = senderIdentityVerified ? 'composer_actor_verified' : 'user_approved_unverified_composer_actor';
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
    const draft = await call('Runtime.evaluate', { expression: `(() => [...document.querySelectorAll('[contenteditable="true"]')].find(e => e.getAttribute('aria-label') === ${safeLabel})?.innerText || '')()`, returnByValue: true });
    if (draft.result?.result?.value?.trim() !== text.trim()) throw new Error('Messenger draft verification failed.');
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
    await call('Runtime.evaluate', { expression: `(() => { const el = [...document.querySelectorAll('[contenteditable="true"]')].find(e => e.getAttribute('aria-label') === ${safeLabel}); el?.focus(); return document.activeElement === el; })()`, returnByValue: true });
    await call('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    const sendInitiatedAt = new Date().toISOString();
    await waitForNewMessageOccurrence(beforeCount, countExactMessage, { attempts: 30, intervalMs: 1000, stableChecks: 20 });
    const afterCount = await countExactMessage();
    const composerAfterSend = await call('Runtime.evaluate', {
      expression: `(() => [...document.querySelectorAll('[contenteditable="true"]')].find(e => e.getAttribute('aria-label') === ${safeLabel})?.innerText || '')()`,
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
  if (fs.existsSync(OUTBOUND_PAUSE_PATH)) { console.log('NO_SEND:outbound_paused_for_delivery_review'); return; }
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
      if (fs.existsSync(OUTBOUND_PAUSE_PATH)) { console.log('NO_SEND:outbound_paused_for_delivery_review'); return; }
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
      prospect.status = 'needs_review'; prospect.lastError = error.message; prospect.lastAttemptAt = new Date().toISOString();
      saveQueue(data);
      console.error(`NOT_SENT:${prospect.businessName}:${error.message}`);
      process.exitCode = 1;
    } finally {
      releaseCdpLock(CDP_LOCK_PATH);
    }
  } finally {
    if (ownsLock) releasePidFileLock(LOCK_PATH);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
