#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tryAcquireCdpLock, releaseCdpLock } from './cdp-lock.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const ROSE_BACKEND = path.join(ROOT, '../rose-prospecting-backend');
const QUEUE_PATH = path.join(ROOT, 'prospects.json');
const STATE_PATH = path.join(ROOT, 'rose-enrichment-state.json');
const DB_PATH = path.join(ROSE_BACKEND, 'data/rose-prospects.sqlite3');
const LOCK_PATH = path.join(ROOT, '.rose-enrichment-persistence.lock');
const args = process.argv.slice(2);

function runWorker() {
  return new Promise(resolve => {
    const child = spawn('python3', [
      path.join(ROSE_BACKEND, 'reachr_fullstack_enrichment.py'),
      '--input', QUEUE_PATH,
      '--state', STATE_PATH,
      '--db', DB_PATH,
    ], { cwd: ROSE_BACKEND, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.on('data', data => { stderr += data; });
    child.on('error', error => { stderr += `${error.message}\n`; });
    child.on('close', code => resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() }));
  });
}

function lastJson(stdout = '') {
  const lines = stdout.split('\n').map(line => line.trim()).filter(Boolean).reverse();
  for (const line of lines) {
    try { return JSON.parse(line); } catch {}
  }
  return {};
}

async function main() {
  if (process.env.ROSE_ENABLE_PERSISTENCE !== '1' || !args.includes('--confirm-persistence')) {
    throw Error('Rose persistence is disabled. Use ROSE_ENABLE_PERSISTENCE=1 and --confirm-persistence.');
  }
  const lock = tryAcquireCdpLock(LOCK_PATH, { staleMs: 10 * 60 * 1000 });
  if (!lock.acquired) {
    console.log(JSON.stringify({ automation: 'rose-enrichment-persistence', status: 'skipped_locked', owner: lock.owner }));
    return;
  }
  try {
    const worker = await runWorker();
    const result = lastJson(worker.stdout);
    if (worker.code !== 0) throw Error(worker.stderr || `enrichment worker exited ${worker.code}`);
    if (Number(result.outbound_messages || 0) !== 0) throw Error('Safety violation: enrichment attempted outbound messaging');
    console.log(JSON.stringify({
      automation: 'rose-enrichment-persistence',
      status: result.status || 'unknown',
      businessName: result.businessName || null,
      remote_persistence: result.remote_persistence || null,
      route_channels: result.route_channels || [],
      outbound_messages: 0,
    }));
  } finally {
    releaseCdpLock(LOCK_PATH);
  }
}

main().catch(error => { console.error(error.stack || error); process.exit(1); });