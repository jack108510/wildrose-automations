#!/usr/bin/env node
/** Send the single lead qualified by this cycle; never consume a pending queue. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sendViaMessenger, pickNextProspect } from './send-next-prospect.mjs';
import { releaseCdpLock, tryAcquireCdpLock } from './cdp-lock.mjs';
import { acquirePidFileLock, releasePidFileLock } from './send-lock.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const LEDGER_PATH = path.join(ROOT, 'prospects.json');
const LOCK_PATH = path.join(ROOT, '.send-next-prospect.lock');
const CDP_LOCK_PATH = path.join(ROOT, '.reachr-cdp.lock');
const encoded = process.argv.find(arg => arg.startsWith('--prospect='))?.slice('--prospect='.length);

function save(data) {
  const temp = `${LEDGER_PATH}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(data, null, 2)}\n`);
  fs.renameSync(temp, LEDGER_PATH);
}

function record(prospect, result) {
  prospect.status = 'sent';
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
}

async function main() {
  if (!encoded) throw Error('A qualified prospect is required.');
  const prospect = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  let ownsLock = false;
  try {
    ownsLock = acquirePidFileLock(LOCK_PATH);
    if (!ownsLock) { console.log('NO_SEND:locked'); return; }
    const ledger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
    const eligibility = pickNextProspect({ prospects: [...ledger.prospects, { ...prospect, status: 'queued' }] });
    if (!eligibility.prospect) { console.log(`NO_SEND:${eligibility.reason}`); return; }
    const cdp = tryAcquireCdpLock(CDP_LOCK_PATH);
    if (!cdp.acquired) { console.log('NO_SEND:cdp_busy'); return; }
    try {
      const result = await sendViaMessenger(prospect);
      if (result.dryRun) { console.log(`READY:${prospect.businessName}:${result.routeType}:${result.senderIdentity}`); return; }
      record(prospect, result);
      ledger.prospects.push(prospect);
      save(ledger);
      console.log(`SENT:${prospect.businessName}`);
    } catch (error) {
      prospect.status = 'needs_review';
      prospect.lastError = error.message;
      prospect.lastAttemptAt = new Date().toISOString();
      ledger.prospects.push(prospect);
      save(ledger);
      console.error(`NOT_SENT:${prospect.businessName}:${error.message}`);
      process.exitCode = 1;
    } finally { releaseCdpLock(CDP_LOCK_PATH); }
  } finally { if (ownsLock) releasePidFileLock(LOCK_PATH); }
}

main().catch(error => { console.error(error.stack || error); process.exit(1); });
