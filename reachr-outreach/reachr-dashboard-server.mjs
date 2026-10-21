#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { summarizeOutreach } from './dashboard-data.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.REACHR_DASHBOARD_PORT || 4188);
const LEDGER = path.join(ROOT, 'prospects.json');
const REPLY_STATE = path.join(ROOT, 'reply-monitor-state.json');
const PAGE = path.join(ROOT, 'reachr-dashboard.html');

function json(response, value) {
  response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(value));
}

http.createServer((request, response) => {
  if (request.url === '/api/summary') {
    try {
      const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
      return json(response, summarizeOutreach(ledger.prospects || []));
    } catch (error) {
      response.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
      return response.end(JSON.stringify({ error: error.message }));
    }
  }
  if (request.url === '/api/replies') {
    try {
      const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
      const allowed = new Map((ledger.prospects || [])
        .filter(record => ['messenger_confirmed', 'messenger_ui_confirmed'].includes(record.delivery))
        .filter(record => !JSON.stringify(record).toLowerCase().includes('marketplace'))
        .map(record => [String(record.businessName || record.recipientName || '').toLowerCase(), record]));
      const state = fs.existsSync(REPLY_STATE) ? JSON.parse(fs.readFileSync(REPLY_STATE, 'utf8')) : { seen: {} };
      const replies = Object.values(state.seen || {})
        .filter(reply => allowed.has(String(reply.businessName || '').toLowerCase()))
        .filter(reply => reply.classification?.reason !== 'outbound_or_empty')
        .sort((a, b) => Date.parse(b.observedAt || 0) - Date.parse(a.observedAt || 0))
        .map(reply => { const record = allowed.get(String(reply.businessName || '').toLowerCase()); return ({ businessName: reply.businessName, preview: reply.preview, classification: reply.classification?.reason || 'unclear', observedAt: reply.observedAt, messengerUrl: record?.messengerUrl || '', recipientName: record?.recipientName || reply.businessName, lastOutboundMessage: record?.lastReplySentMessage || '', lastOutboundAt: record?.lastReplySentAt || '' }); });
      return json(response, { replies, updatedAt: new Date().toISOString() });
    } catch (error) {
      response.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
      return response.end(JSON.stringify({ error: error.message }));
    }
  }
  if (request.url === '/' || request.url === '/index.html') {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    return response.end(fs.readFileSync(PAGE));
  }
  response.writeHead(404); response.end('Not found');
}).listen(PORT, '127.0.0.1', () => console.log(`Reachr dashboard: http://127.0.0.1:${PORT}`));
