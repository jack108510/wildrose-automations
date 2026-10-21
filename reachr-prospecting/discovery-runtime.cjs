const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function evaluateWithRetry(connection, expression, options = {}) {
  const attempts = Number(options.attempts || 3);
  const delayMs = Number(options.delayMs ?? 1000);
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await connection.c('Runtime.evaluate', { expression, returnByValue: true });
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts && delayMs > 0) await sleep(delayMs);
    }
  }
  throw lastError;
}

function selectDiscoveryGroups(allGroups, limit = 55) {
  const seen = new Set();
  const groups = (allGroups || []).filter(group => {
    const eligible = group.url && /business|entrepreneur|advertis|promot|vendor|marketplace|networking|small biz/i.test(group.name || '');
    if (!eligible || seen.has(group.url)) return false;
    seen.add(group.url);
    return true;
  }).slice(0, limit);
  if (!groups.length) throw new Error('No eligible business groups were loaded from the Reachr dashboard');
  return groups;
}

function collectDiscoveryGroups(liveGroups, data = {}, limit = 55) {
  const historical = ['attempts', 'deepAttempts', 'searchAttempts']
    .flatMap(key => data[key] || [])
    .map(item => item.group || item)
    .filter(item => item && typeof item === 'object');
  return selectDiscoveryGroups([...(liveGroups || []), ...historical], limit);
}

module.exports = { collectDiscoveryGroups, evaluateWithRetry, selectDiscoveryGroups };
