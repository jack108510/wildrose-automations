#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const queuePath = path.join(ROOT, 'prospects.json');
const catalogPath = path.join(ROOT, 'verified-route-catalog.json');
const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const normalize = value => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
const now = new Date().toISOString();
let added = 0;
for (const route of catalog.routes) {
  const duplicate = queue.prospects.some(p => normalize(p.businessName) === normalize(route.businessName) || normalize(p.messengerUrl) === normalize(route.messengerUrl));
  if (duplicate) continue;
  const sent = route.initialStatus === 'sent_today';
  queue.prospects.push({
    businessName: route.businessName,
    recipientName: route.recipientName,
    messengerUrl: route.messengerUrl,
    sourceGroup: route.sourceGroup,
    promotionContext: route.promotionContext,
    status: sent ? 'sent' : 'queued',
    routeVerifiedAt: now,
    reviewedAt: now,
    ...(sent ? { sentAt: now, delivery: 'messenger_ui_confirmed' } : {})
  });
  added++;
}
const tmp = `${queuePath}.tmp`;
fs.writeFileSync(tmp, `${JSON.stringify(queue, null, 2)}\n`);
fs.renameSync(tmp, queuePath);
console.log(JSON.stringify({ added, total: queue.prospects.length, queued: queue.prospects.filter(p => p.status === 'queued').length }));
