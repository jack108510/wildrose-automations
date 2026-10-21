#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { tryAcquireCdpLock, releaseCdpLock } from './cdp-lock.mjs';
import { waitForCdp } from './cdp-readiness.mjs';
import { planOneProspectCycle, DEFAULT_SOURCE_ADDITIONS, DEFAULT_SOURCE_MAX_GROUPS, DEFAULT_VERIFY_LIMIT } from './one-prospect-cycle-policy.mjs';
import { advanceSourceCursor } from './continuous-search-policy.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROSPECTING = path.join(ROOT, '../reachr-prospecting');
const DISCOVERY_PATH = path.join(PROSPECTING, 'discovery-50-results.json');
const QUEUE_PATH = path.join(ROOT, 'prospects.json');
const STATE_PATH = path.join(ROOT, 'route-resolution-state.json');
const SOURCE_CURSOR_PATH = path.join(ROOT, 'continuous-source-cursor.json');
const CYCLE_LOCK_PATH = path.join(ROOT, '.one-prospect-cycle.lock');
const CDP_LOCK_PATH = path.join(ROOT, '.reachr-cdp.lock');
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const NO_SEND = args.includes('--no-send');
const QUEUE_ONLY = args.includes('--queue-only');
const LIVE_CONFIRM = args.includes('--confirm-live');
const numberArg = (name, fallback) => {
  const value = args.find(arg => arg.startsWith(`${name}=`))?.split('=')[1];
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};
const sourceMaxGroups = numberArg('--source-groups', DEFAULT_SOURCE_MAX_GROUPS);
const sourceAdditions = numberArg('--source-additions', DEFAULT_SOURCE_ADDITIONS);
const verifyLimit = numberArg('--verify-limit', DEFAULT_VERIFY_LIMIT);
const sourceGroupCeiling = numberArg('--source-group-ceiling', 55);
const cycleDeadlineMs = numberArg('--cycle-deadline-ms', 420000);
const maxBatches = numberArg('--max-batches', Number.MAX_SAFE_INTEGER);
const sourceOrderSeedArg = args.find(arg => arg.startsWith('--source-order-seed='))?.split('=')[1] || null;
const childTimeoutMs = numberArg('--child-timeout-ms', 240000);

function readJson(filePath, fallback) {
  return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : fallback;
}
function atomicJson(filePath, value) {
  const temporary = `${filePath}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporary, filePath);
}
function lastJson(stdout = '') {
  const starts = [...stdout.matchAll(/(?:^|\n)(\{[\s\S]*?\})\s*$/g)];
  if (!starts.length) return {};
  try { return JSON.parse(starts.at(-1)[1]); } catch { return {}; }
}

function runChild(command, childArgs, timeoutMs) {
  return new Promise(resolve => {
    const child = spawn(command, childArgs, { cwd: ROOT, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.on('data', data => { stderr += data; });
    child.on('error', error => { stderr += `${error.message}\n`; });
    child.on('close', code => {
      clearTimeout(timer);
      resolve({ command: [command, ...childArgs], code, timedOut, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

function dryPlan() {
  const plan = planOneProspectCycle({
    queue: readJson(QUEUE_PATH, { prospects: [] }),
    discovered: readJson(DISCOVERY_PATH, { prospects: [] }).prospects,
    state: readJson(STATE_PATH, { records: {} }),
    sourceMaxGroups,
    sourceAdditions,
    verifyLimit,
  });
  return {
    mode: 'dry_run',
    source: plan.source,
    routeCandidates: plan.routeCandidates.slice(0, verifyLimit).map(candidate => candidate.businessName),
    outbound: plan.send.prospect ? { businessName: plan.send.prospect.businessName, maxOutboundMessages: 1 } : { reason: plan.send.reason, maxOutboundMessages: 1 },
  };
}

async function main() {
  if (DRY_RUN) {
    console.log(JSON.stringify(dryPlan(), null, 2));
    return;
  }
  if (process.env.REACHR_ENABLE_MESSENGER !== '1' || !LIVE_CONFIRM) {
    throw Error('Live Messenger execution is disabled. Use REACHR_ENABLE_MESSENGER=1 and --confirm-live only after deployment approval. Use --dry-run for a non-sending plan.');
  }

  const cycle = tryAcquireCdpLock(CYCLE_LOCK_PATH, { staleMs: 15 * 60 * 1000 });
  if (!cycle.acquired) {
    console.log(JSON.stringify({ status: 'NO_CYCLE:locked', owner: cycle.owner, ageMs: cycle.ageMs }, null, 2));
    return;
  }

  const output = { automation: 'reachr-messenger-outreach', status: 'completed', source: [], verify: [], send: null };
  if (QUEUE_ONLY) output.automation = 'reachr-queue-producer';
  let startedAt = Date.now();
  let cursor = readJson(SOURCE_CURSOR_PATH, { sourceOffset: 0, pass: 0 });
  cursor.sourceOrderSeed = sourceOrderSeedArg || cursor.sourceOrderSeed || randomUUID();
  try {
    startedAt = Date.now();
    let foundEligible = false;
    let qualifiedProspect = null;
    let batchCount = 0;
    while (!foundEligible && batchCount < maxBatches && Date.now() - startedAt < cycleDeadlineMs) {
      batchCount += 1;
      const cdp = tryAcquireCdpLock(CDP_LOCK_PATH);
      if (!cdp.acquired) {
        output.status = 'NO_CYCLE:cdp_busy';
        output.cdpOwner = cdp.owner;
        break;
      }
      let sourceResult, verifyResult;
      try {
        if (!await waitForCdp()) {
          output.status = 'NO_CYCLE:cdp_unavailable';
          break;
        }
        sourceResult = await runChild('node', [path.join(PROSPECTING, 'discover-search-live.cjs'), `--max-groups=${sourceMaxGroups}`, `--group-offset=${cursor.sourceOffset}`, `--source-order-seed=${cursor.sourceOrderSeed}`, `--target-additions=${sourceAdditions}`], childTimeoutMs);
        // Direct dispatch keeps the verified lead out of the queue. Queue-only
        // producer mode omits --no-queue-write so the sender can consume it later.
        const verifyArgs = [path.join(ROOT, 'refresh-verified-queue.mjs'), `--limit=${verifyLimit}`, '--until-verified'];
        if (!QUEUE_ONLY) verifyArgs.push('--no-queue-write');
        verifyResult = await runChild('node', verifyArgs, childTimeoutMs);
      } finally {
        releaseCdpLock(CDP_LOCK_PATH);
      }
      output.source.push(sourceResult);
      output.verify.push(verifyResult);
      const sourceMeta = lastJson(sourceResult.stdout);
      const verifyMeta = lastJson(verifyResult.stdout);
      qualifiedProspect = Array.isArray(verifyMeta.additions) ? verifyMeta.additions[0] || null : null;
      foundEligible = Boolean(qualifiedProspect);
      const discoveredSourceCount = Number(sourceMeta.eligibleGroupCount || sourceGroupCeiling);
      const totalSources = Math.min(sourceGroupCeiling, discoveredSourceCount);
      const previousPass = cursor.pass;
      cursor = advanceSourceCursor(cursor, { totalSources, batchSize: sourceMaxGroups, foundEligible });
      if (cursor.pass !== previousPass) cursor.sourceOrderSeed = sourceOrderSeedArg || randomUUID();
      cursor.updatedAt = new Date().toISOString();
      atomicJson(SOURCE_CURSOR_PATH, cursor);
      if (cursor.outcome === 'source_exhausted') {
        output.status = 'SOURCE_EXHAUSTED';
        break;
      }
    }
    output.batchCount = batchCount;
    if (!foundEligible && output.status === 'completed' && batchCount >= maxBatches) output.status = 'BATCH_LIMIT_REACHED';
    if (!foundEligible && output.status === 'completed' && Date.now() - startedAt >= cycleDeadlineMs) output.status = 'DEADLINE_REACHED';
    if (QUEUE_ONLY) {
      output.send = { skipped: true, reason: 'queue_producer', queued: Boolean(qualifiedProspect), maxOutboundMessages: 0 };
    } else if (NO_SEND) {
      output.send = { skipped: true, reason: 'test_no_send', maxOutboundMessages: 0 };
    } else if (!qualifiedProspect) {
      output.send = { skipped: true, reason: 'no_fresh_qualified_lead', maxOutboundMessages: 0 };
    } else {
      const encodedProspect = Buffer.from(JSON.stringify(qualifiedProspect)).toString('base64url');
      output.send = await runChild('node', [path.join(ROOT, 'send-qualified-prospect.mjs'), `--prospect=${encodedProspect}`], childTimeoutMs);
      if (output.send.code !== 0 || !/^SENT:|^NO_SEND:/.test(output.send.stdout)) output.status = 'ERROR:send_worker';
    }
    console.log(JSON.stringify(output, null, 2));
  } finally {
    releaseCdpLock(CYCLE_LOCK_PATH);
  }
}

main().catch(error => { console.error(error.stack || error); process.exit(1); });
