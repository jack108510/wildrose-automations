import fs from 'node:fs';

function processIsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; }
  catch (error) { return error.code === 'EPERM'; }
}

export function acquirePidFileLock(lockPath) {
  const writeOwner = () => fs.writeFileSync(lockPath, `${process.pid}\n${new Date().toISOString()}\n`, { flag: 'wx' });
  try {
    writeOwner();
    return true;
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  const existingPid = Number(fs.readFileSync(lockPath, 'utf8').split('\n')[0]);
  if (processIsAlive(existingPid)) return false;
  fs.unlinkSync(lockPath);
  writeOwner();
  return true;
}

export function releasePidFileLock(lockPath) {
  try {
    const ownerPid = Number(fs.readFileSync(lockPath, 'utf8').split('\n')[0]);
    if (ownerPid !== process.pid) return false;
    fs.unlinkSync(lockPath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}
