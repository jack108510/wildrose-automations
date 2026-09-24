import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('.', import.meta.url);
const runner = fs.readFileSync(new URL('./run-daily-refresh.sh', root), 'utf8');
const sender = fs.readFileSync(new URL('./send-next-prospect.mjs', root), 'utf8');
const workflow = JSON.parse(fs.readFileSync(new URL('./n8n-daily-discovery-refresh.json', root), 'utf8'));

assert.match(runner, /refresh-verified-queue\.mjs" --limit=60/);
const trigger = workflow.nodes.find(node => node.type === 'n8n-nodes-base.scheduleTrigger');
assert.equal(trigger.parameters.rule.interval[0].expression, '*/9 * * * *');
const worker = workflow.nodes.find(node => node.name === 'Discover and verify routes');
assert.match(worker.parameters.jsCode, /timeout:\s*3600000/);
assert.match(runner, /\.daily-refresh\.lock/);
assert.match(runner, /\.reachr-cdp\.lock/);
assert.match(runner, /NO_REFRESH:cdp_busy/);
assert.match(sender, /tryAcquireCdpLock\(CDP_LOCK_PATH\)/);
assert.match(sender, /NO_SEND:cdp_busy/);
assert.match(sender, /releaseCdpLock\(CDP_LOCK_PATH\)/);
assert.match(runner, /NO_REFRESH:already_running/);
console.log('full-stack pipeline config tests passed: continuous producer cadence, 60-route backlog fill, non-overlap lock, one-hour worker budget');
