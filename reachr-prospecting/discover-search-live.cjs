const fs = require('fs');
const http = require('http');
const path = require('path');
const { collectDiscoveryGroups, evaluateWithRetry } = require('./discovery-runtime.cjs');
const { deterministicShuffle } = require('./discovery-order.cjs');
const { selectDiscoveryController } = require('./discovery-controller.cjs');
const { buildRecentFeedJobs, mergeCandidates } = require('./discovery-plan.cjs');
const { inferBusinessName } = require('./business-name-inference.cjs');
const { composeReachrMessage } = require('./content.js');
const { loadCandidates: loadRoseCandidates, addCandidate: addRoseCandidate, saveCandidates: saveRoseCandidates } = require('./rose-website-candidates.cjs');

const CDP = 'http://127.0.0.1:9223';
const args = process.argv.slice(2);
const numberArg = (name, fallback) => {
  const value = args.find(arg => arg.startsWith(`${name}=`))?.split('=')[1];
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};
const BASE_TARGET = 120;
const TARGET_ADDITIONS = numberArg('--target-additions', 20);
const BATCH = numberArg('--batch', 4);
const LOAD_MS = numberArg('--load-ms', 8000);
const SCROLL_ROUNDS = numberArg('--scroll-rounds', 4);
const SCROLL_WAIT_MS = numberArg('--scroll-wait-ms', 1500);
const MAX_GROUPS = numberArg('--max-groups', 55);
const groupOffsetValue = args.find(arg => arg.startsWith('--group-offset='))?.split('=')[1];
const GROUP_OFFSET = Number.isInteger(Number(groupOffsetValue)) && Number(groupOffsetValue) >= 0 ? Number(groupOffsetValue) : 0;
const sourceOrderSeed = args.find(arg => arg.startsWith('--source-order-seed='))?.split('=')[1] || null;
const resultPath = path.join(__dirname, 'discovery-50-results.json');
const roseResultPath = path.join(__dirname, 'rose-website-candidates.json');
const source = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const norm = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const draftFor = composeReachrMessage;

function get(url) {
  return new Promise((resolve, reject) => http.get(url, response => {
    let body = '';
    response.on('data', chunk => body += chunk);
    response.on('end', () => {
      try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
    });
  }).on('error', reject));
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.onopen = () => {
      let id = 0;
      const pending = new Map();
      socket.onmessage = event => {
        const message = JSON.parse(event.data);
        const item = pending.get(message.id);
        if (!item) return;
        pending.delete(message.id);
        clearTimeout(item.timer);
        message.error ? item.reject(Error(message.error.message)) : item.resolve(message.result);
      };
      resolve({
        w: socket,
        c: (method, params = {}) => new Promise((res, rej) => {
          const requestId = ++id;
          const timer = setTimeout(() => {
            pending.delete(requestId);
            rej(Error(`${method} timeout`));
          }, 20000);
          pending.set(requestId, { resolve: res, reject: rej, timer });
          socket.send(JSON.stringify({ id: requestId, method, params }));
        }),
      });
    };
    socket.onerror = reject;
  });
}

(async () => {
  const data = JSON.parse(fs.readFileSync(resultPath));
  const existingCount = data.prospects?.length || 0;
  const target = Math.max(BASE_TARGET, existingCount + TARGET_ADDITIONS);
  const prospects = new Map((data.prospects || []).map(prospect => [norm(prospect.businessName), prospect]));
  const roseCandidates = loadRoseCandidates(roseResultPath);
  const tabs = await get(`${CDP}/json/list`);
  const controllerTarget = selectDiscoveryController(tabs);
  if (!controllerTarget) throw Error('No CDP page is available for discovery.');

  const controller = await connect(controllerTarget.webSocketDebuggerUrl);
  const attempts = [];
  let eligibleGroupCount = 0, scannedGroupCount = 0;
  try {
    let allGroups = [];
    try {
      const groupResult = await evaluateWithRetry(
        controller,
        `JSON.stringify((cachedData?.groups||[]).map(g=>({name:g.name||'',url:g.url||''})))`,
        { attempts: 3, delayMs: 1500 },
      );
      allGroups = JSON.parse(groupResult.result?.value || '[]');
    } catch (error) {
      console.error(`dashboard group lookup failed; using historical groups: ${error.message}`);
    }
    const eligibleGroups = collectDiscoveryGroups(allGroups, data, 10000);
    const orderedGroups = sourceOrderSeed ? deterministicShuffle(eligibleGroups, sourceOrderSeed) : eligibleGroups;
    eligibleGroupCount = orderedGroups.length;
    const groups = orderedGroups.slice(GROUP_OFFSET, GROUP_OFFSET + MAX_GROUPS);
    scannedGroupCount = groups.length;
    if (!groups.length) throw Error(`No eligible source groups remain at offset ${GROUP_OFFSET}`);
    const jobs = buildRecentFeedJobs(groups);

    for (let offset = 0; offset < jobs.length && prospects.size < target; offset += BATCH) {
      const batch = jobs.slice(offset, offset + BATCH);
      const opened = [];
      for (const job of batch) {
        try {
          console.error(`feed phase=create group=${job.group.name}`);
          const created = await controller.c('Target.createTarget', { url: 'about:blank', background: true });
          const blankTabs = await get(`${CDP}/json/list`);
          const blankTab = blankTabs.find(item => item.id === created.targetId);
          if (!blankTab) throw Error('new blank target missing before navigation');
          console.error(`feed phase=attach group=${job.group.name} target=${created.targetId}`);
          const connection = await connect(blankTab.webSocketDebuggerUrl);
          await connection.c('Page.enable');
          console.error(`feed phase=navigate group=${job.group.name}`);
          await connection.c('Page.navigate', { url: job.url });
          opened.push({ ...job, id: created.targetId, connection });
        } catch (error) {
          attempts.push({ ...job, error: error.message });
        }
      }

      console.error(`feed phase=load_wait opened=${opened.length}`);
      await sleep(LOAD_MS);
      for (const openedJob of opened) {
        const connection = openedJob.connection;
        try {
          console.error(`feed phase=inject group=${openedJob.group.name}`);
          await evaluateWithRetry(connection, `${source};true`, { attempts: 2, delayMs: 750 });
          const pageCandidates = new Map();
          let scanOk = false;
          const diagnostics = [];
          for (let round = 0; round < SCROLL_ROUNDS; round += 1) {
            console.error(`feed phase=scan group=${openedJob.group.name} round=${round + 1}/${SCROLL_ROUNDS}`);
            const scan = await evaluateWithRetry(
              connection,
              'JSON.stringify(globalThis.__reachrScanVisibleGroupPromotions())',
              { attempts: 2, delayMs: 750 },
            );
            const result = JSON.parse(scan.result?.value || '{}');
            console.error(`feed phase=scan_result group=${openedJob.group.name} round=${round + 1} ok=${Boolean(result.ok)} count=${Number(result.count || 0)}`);
            scanOk ||= Boolean(result.ok);
            diagnostics.push(result.diagnostics || {});
            mergeCandidates(pageCandidates, result.candidates || []);
            if (round + 1 < SCROLL_ROUNDS) {
              await evaluateWithRetry(connection, 'window.scrollBy(0, Math.max(window.innerHeight * 2, 1600)); true', { attempts: 2, delayMs: 500 });
              await sleep(SCROLL_WAIT_MS);
            }
          }
          attempts.push({ group: openedJob.group, mode: openedJob.mode, count: pageCandidates.size, ok: scanOk, diagnostics });
          for (const candidate of pageCandidates.values()) {
            addRoseCandidate(roseCandidates, candidate, openedJob.group);
            const businessUrl = String(candidate.businessUrl || '').trim();
            const postUrl = String(candidate.postUrl || '').trim();
            if (!businessUrl || !postUrl) continue;
            const businessName = inferBusinessName(candidate.businessName, candidate.observedText);
            const key = norm(businessName);
            if (!key || key.length < 3) continue;
            const discoveredSource = {
              sourceGroupName: openedJob.group.name,
              sourceGroupUrl: openedJob.group.url,
              searchQuery: 'recent_feed',
              postUrl,
              businessUrl,
              observedText: candidate.observedText,
              websiteUrls: candidate.websiteUrls || [],
              observedAt: candidate.observedAt,
              promotionSignals: candidate.promotionSignals,
            };
            if (prospects.has(key)) {
              const existing = prospects.get(key);
              existing.businessUrl = businessUrl;
              if (!existing.sources.some(item =>
                (item.postUrl && item.postUrl === discoveredSource.postUrl) ||
                (!item.postUrl && item.sourceGroupUrl === discoveredSource.sourceGroupUrl && item.observedText === discoveredSource.observedText)
              )) existing.sources.push(discoveredSource);
            } else {
              prospects.set(key, {
                businessName,
                businessUrl,
                draft: draftFor(businessName),
                status: 'discovered_pending_review',
                sources: [discoveredSource],
              });
            }
          }
        } catch (error) {
          attempts.push({ group: openedJob.group, mode: openedJob.mode, error: error.message });
        } finally {
          connection.w.close();
        }
      }

      for (const openedJob of opened) {
        try { await controller.c('Target.closeTarget', { targetId: openedJob.id }); } catch {}
      }
      console.error(`search progress ${Math.min(offset + BATCH, jobs.length)}/${jobs.length} prospects=${prospects.size}/${target}`);
    }
  } finally {
    controller.w.close();
  }

  const successfulSearches = attempts.filter(item => item.ok).length;
  if (!successfulSearches) throw Error(`discovery produced zero successful searches (${attempts.length} attempted)`);

  const found = [...prospects.values()];
  data.createdAt = new Date().toISOString();
  data.prospects = found;
  data.count = found.length;
  data.searchAttempts = attempts;
  fs.writeFileSync(resultPath, `${JSON.stringify(data, null, 2)}\n`);
  const roseWebsiteCandidates = saveRoseCandidates(roseResultPath, roseCandidates);
  console.log(JSON.stringify({
    count: found.length,
    addedThisRun: Math.max(0, found.length - existingCount),
    groupOffset: GROUP_OFFSET,
    sourceOrderSeed,
    scannedGroupCount,
    scannedSources: attempts.length ? [...new Map(attempts.map(attempt => [attempt.group.url, { name: attempt.group.name, url: attempt.group.url }])).values()] : [],
    eligibleGroupCount,
    searches: successfulSearches,
    attemptedSearches: attempts.length,
    newTotal: found.length,
    roseWebsiteCandidates,
    names: found.map(item => item.businessName),
  }, null, 2));
})().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
