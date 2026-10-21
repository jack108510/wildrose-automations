import fs from 'node:fs';

export const DEFAULT_STALE_MS = 75 * 60 * 1000;

function metadataPath(lockPath) {
  return `${lockPath}/owner.json`;
}

function processIsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; }
  catch (error) { return error.code === 'EPERM'; }
}

export function tryAcquireCdpLock(lockPath, { staleMs = DEFAULT_STALE_MS, now = Date.now() } = {}) {
  const owner = { pid: process.pid, acquiredAt: new Date(now).toISOString() };
  try {
    fs.mkdirSync(lockPath);
    fs.writeFileSync(metadataPath(lockPath), `${JSON.stringify(owner)}\n`);
    return { acquired: true, owner };
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  let existing = {}, age = 0;
  try {
    existing = JSON.parse(fs.readFileSync(metadataPath(lockPath), 'utf8'));
    age = now - Date.parse(existing.acquiredAt || '');
  } catch {
    age = now - fs.statSync(lockPath).mtimeMs;
  }
  if (!processIsAlive(Number(existing.pid)) && Number.isFinite(age) && age >= 0) {
    fs.rmSync(lockPath, { recursive: true, force: true });
    return tryAcquireCdpLock(lockPath, { staleMs, now });
  }
  return { acquired: false, owner: existing, ageMs: age };
}

export function releaseCdpLock(lockPath, ownerPid = process.pid) {
  try {
    const owner = JSON.parse(fs.readFileSync(metadataPath(lockPath), 'utf8'));
    if (Number(owner.pid) !== Number(ownerPid)) return false;
    fs.rmSync(lockPath, { recursive: true, force: false });
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}
