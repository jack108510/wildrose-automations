import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { tryAcquireCdpLock, releaseCdpLock } from './cdp-lock.mjs';

const lockPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'reachr-cdp-lock-')), 'lock');
fs.mkdirSync(lockPath);
fs.writeFileSync(path.join(lockPath, 'owner.json'), JSON.stringify({ pid: 999999, acquiredAt: new Date().toISOString() }));

const result = tryAcquireCdpLock(lockPath, { now: Date.now() });
assert.equal(result.acquired, true, 'a freshly-created lock owned by a dead process must be recovered immediately');
assert.equal(result.owner.pid, process.pid);
assert.equal(releaseCdpLock(lockPath), true);

console.log('CDP dead-owner lock recovery test passed');
