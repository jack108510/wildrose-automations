import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { acquirePidFileLock, releasePidFileLock } from './send-lock.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reachr-send-lock-'));
const lockPath = path.join(dir, 'send.lock');
fs.writeFileSync(lockPath, `999999\n${new Date().toISOString()}\n`);

const acquired = acquirePidFileLock(lockPath);
assert.equal(acquired, true, 'a live run must recover a freshly-created sender lock if the owning PID is dead');
assert.equal(Number(fs.readFileSync(lockPath, 'utf8').split('\n')[0]), process.pid);
assert.equal(releasePidFileLock(lockPath), true);

console.log('sender dead-owner lock recovery test passed');
