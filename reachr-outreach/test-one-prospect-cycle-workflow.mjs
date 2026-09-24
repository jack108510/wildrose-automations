import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('.', import.meta.url);
const workflow = JSON.parse(fs.readFileSync(new URL('./n8n-one-prospect-cycle.json', root), 'utf8'));
const trigger = workflow.nodes.find(node => node.type === 'n8n-nodes-base.scheduleTrigger');
const worker = workflow.nodes.find(node => node.name === 'Run one full prospect cycle');
assert.equal(workflow.active, false);
assert.equal(trigger.parameters.rule.interval[0].expression, '*/9 * * * *');
assert.equal(worker.type, 'n8n-nodes-base.executeCommand');
assert.match(worker.parameters.command, /one-prospect-cycle\.mjs/);
assert.match(worker.parameters.command, /REACHR_ENABLE_FULL_CYCLE/);
assert.match(worker.parameters.command, /--confirm-live/);
console.log('one-prospect cycle workflow config tests passed');
