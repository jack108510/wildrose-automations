const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const normalize = value => String(value || '')
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .replace(/\b(inc|ltd|limited|services|service|company|co)\b/g, '')
  .replace(/\s+/g, ' ')
  .trim();

export function namesAlign(left, right) {
  const a = normalize(left), b = normalize(right);
  return Boolean(a && b) && (a === b || a.includes(b) || b.includes(a));
}

export async function waitForNewMessageOccurrence(beforeCount, readCount, options = {}) {
  const attempts = Number(options.attempts || 20);
  const intervalMs = Number(options.intervalMs ?? 1000);
  const stableChecks = Number(options.stableChecks || 3);
  let current = Number(beforeCount || 0);
  let consecutive = 0;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    current = Number(await readCount() || 0);
    consecutive = current > beforeCount ? consecutive + 1 : 0;
    if (consecutive >= stableChecks) return current;
    if (attempt + 1 < attempts && intervalMs > 0) await sleep(intervalMs);
  }
  throw new Error('Messenger did not confirm exact outgoing message.');
}

export async function waitForVerifiedComposer(expectedName, readComposerLabel, options = {}) {
  const attempts = Number(options.attempts || 12);
  const intervalMs = Number(options.intervalMs ?? 1000);
  let lastLabel = '';
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    lastLabel = String(await readComposerLabel() || '');
    const recipient = lastLabel.replace(/^Write to\s*/i, '').trim();
    if (recipient && namesAlign(expectedName, recipient)) return { label: lastLabel, recipient };
    if (attempt + 1 < attempts && intervalMs > 0) await sleep(intervalMs);
  }
  throw new Error(`recipient verification failed: ${lastLabel || 'no composer'}`);
}
