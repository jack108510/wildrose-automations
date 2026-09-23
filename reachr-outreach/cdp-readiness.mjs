const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function defaultProbe(endpoint) {
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(2000) });
  if (!response.ok) return false;
  const value = await response.json();
  return Array.isArray(value) ? value.some(item => item?.type === 'page') : Boolean(value?.webSocketDebuggerUrl);
}

export async function waitForCdp({
  endpoint = process.env.REACHR_CDP_ENDPOINT || 'http://127.0.0.1:9223/json/list',
  timeoutMs = 30000,
  intervalMs = 1000,
  probe = defaultProbe,
} = {}) {
  const deadline = Date.now() + timeoutMs;
  do {
    try {
      if (await probe(endpoint)) return true;
    } catch {}
    if (Date.now() >= deadline) break;
    await sleep(intervalMs);
  } while (Date.now() < deadline);
  return false;
}
