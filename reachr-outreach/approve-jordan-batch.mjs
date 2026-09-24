import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { composeMessage } from './send-next-jordan.mjs';
import { acquirePidFileLock, releasePidFileLock } from './send-lock.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const queuePath = path.join(root, 'prospects.json');
const manifestPath = path.join(root, 'jordan-outreach-approved-manifest-2026-09-23.json');
const lockPath = path.join(root, '.send-next-prospect.lock');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.approvedByUser !== 'activate it please' || manifest.items?.length !== 52) {
  throw new Error('Approved review manifest is incomplete.');
}
if (!acquirePidFileLock(lockPath)) throw new Error('Queue is busy; no approvals were applied.');
try {
  const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
  const matches = [];
  const routes = new Set();
  for (const item of manifest.items) {
    if (routes.has(item.messengerUrl)) throw new Error(`Duplicate approved route: ${item.messengerUrl}`);
    routes.add(item.messengerUrl);
    const found = queue.prospects.filter(prospect => prospect.messengerUrl === item.messengerUrl);
    if (found.length !== 1) throw new Error(`Expected one queued record for ${item.messengerUrl}, found ${found.length}.`);
    const prospect = found[0];
    if (prospect.status !== 'queued') throw new Error(`Prospect is no longer queued: ${item.businessName}`);
    for (const key of ['businessName', 'recipientName', 'sourceEvidence', 'sourceUrl', 'routeVerifiedAt']) {
      if (prospect[key] !== item[key]) throw new Error(`Reviewed ${key} changed for ${item.businessName}.`);
    }
    if (composeMessage(prospect) !== item.message) throw new Error(`Reviewed message changed for ${item.businessName}.`);
    matches.push({ prospect, item });
  }
  const approvedAt = new Date().toISOString();
  for (const { prospect, item } of matches) {
    prospect.jordanApproval = {
      senderAccount: 'Jordan Slone',
      recipientName: item.recipientName || item.businessName,
      message: item.message,
      approvedAt,
      approvalSource: manifest.reviewFile
    };
  }
  const temporary = `${queuePath}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(queue, null, 2)}\n`);
  fs.renameSync(temporary, queuePath);
  console.log(JSON.stringify({ approved: matches.length, approvedAt }));
} finally {
  releasePidFileLock(lockPath);
}
