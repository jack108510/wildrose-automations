#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { summarizeOutreach } from './dashboard-data.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.REACHR_DASHBOARD_PORT || 4188);
const LEDGER = path.join(ROOT, 'prospects.json');
const REPLY_STATE = path.join(ROOT, 'reply-monitor-state.json');
const PAGE = path.join(ROOT, 'reachr-dashboard.html');
const PREFIX = '/reachr-command-center';
const AUTH_FILE = process.env.REACHR_DASHBOARD_AUTH_FILE || '';

function authorized(request) {
  if (!AUTH_FILE) return true; // Local-only development. Public tunnel requires the auth file.
  const saved = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
  const encoded = /^Basic (.+)$/i.exec(request.headers.authorization || '')?.[1];
  if (!encoded) return false;
  const supplied = Buffer.from(encoded, 'base64').toString('utf8');
  const split = supplied.indexOf(':');
  if (split < 0 || supplied.slice(0, split) !== saved.username) return false;
  const candidate = crypto.scryptSync(supplied.slice(split + 1), Buffer.from(saved.salt, 'hex'), 64);
  const expected = Buffer.from(saved.hash, 'hex');
  return expected.length === candidate.length && crypto.timingSafeEqual(candidate, expected);
}

function json(response, value) {
  response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(value));
}

http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (pathname === PREFIX) {
    response.writeHead(308, { location: `${PREFIX}/`, 'cache-control': 'no-store' });
    return response.end();
  }
  const route = pathname.startsWith(`${PREFIX}/`) ? pathname.slice(PREFIX.length) : pathname;
  try {
    if (!authorized(request)) {
      response.writeHead(401, { 'www-authenticate': 'Basic realm="Reachr Command Center", charset="UTF-8"', 'cache-control': 'no-store' });
      return response.end('Authentication required');
    }
  } catch {
    response.writeHead(503, { 'cache-control': 'no-store' });
    return response.end('Authentication unavailable');
  }
  if (route === '/api/summary') {
    try {
      const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
      return json(response, summarizeOutreach(ledger.prospects || []));
    } catch (error) {
      response.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
      return response.end(JSON.stringify({ error: error.message }));
    }
  }
  if (route === '/api/replies') {
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
  if (route === '/' || route === '/index.html') {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    return response.end(fs.readFileSync(PAGE));
  }
  response.writeHead(404); response.end('Not found');
}).listen(PORT, '127.0.0.1', () => console.log(`Reachr dashboard: http://127.0.0.1:${PORT}`));
