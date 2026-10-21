#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('./', import.meta.url);
const sender = JSON.parse(fs.readFileSync(new URL('./n8n-buffered-messenger-sender.json', import.meta.url), 'utf8'));
const producer = JSON.parse(fs.readFileSync(new URL('./n8n-verified-queue-producer.json', import.meta.url), 'utf8'));
const replyMonitor = JSON.parse(fs.readFileSync(new URL('./n8n-reply-monitor.json', import.meta.url), 'utf8'));
const [smsApproval] = JSON.parse(fs.readFileSync(new URL('./n8n-twilio-inbound-approval.json', import.meta.url), 'utf8'));
const senderCommand = sender.nodes.find(node => node.type === 'n8n-nodes-base.executeCommand')?.parameters?.command || '';
const producerCommand = producer.nodes.find(node => node.type === 'n8n-nodes-base.executeCommand')?.parameters?.command || '';
const senderCron = sender.nodes.find(node => node.type === 'n8n-nodes-base.scheduleTrigger')?.parameters?.rule?.interval?.map(rule => rule.expression);
const producerCron = producer.nodes.find(node => node.type === 'n8n-nodes-base.scheduleTrigger')?.parameters?.rule?.interval?.map(rule => rule.expression);

assert.equal(sender.id, 'fmidrVO3YD0OiXqo');
assert.equal(producer.id, 'f55ee65c-9e4b-4007-8250-b5086f580ea9');
assert.equal(sender.active, false);
assert.equal(producer.active, false);
assert.equal(replyMonitor.active, false);
assert.equal(smsApproval.active, false);
assert.equal(replyMonitor.nodes.find(node => node.name === 'Create tasks for positive replies').type, 'n8n-nodes-base.executeCommand');
for (const workflow of [sender, producer, replyMonitor, smsApproval]) {
  assert.equal(workflow.nodes.some(node => node.credentials || node.webhookId), false);
}
assert.deepEqual(senderCron, [
  '0,9,18,27,36,45,54 0-23/3 * * *',
  '3,12,21,30,39,48,57 1-23/3 * * *',
  '6,15,24,33,42,51 2-23/3 * * *'
]);
assert.deepEqual(producerCron, [
  '2,11,20,29,38,47,56 0-23/3 * * *',
  '5,14,23,32,41,50,59 1-23/3 * * *',
  '8,17,26,35,44,53 2-23/3 * * *'
]);
assert.match(senderCommand, /node send-next-prospect\.mjs$/);
assert.doesNotMatch(senderCommand, /one-prospect-cycle|discover|refresh-verified/);
assert.match(producerCommand, /one-prospect-cycle\.mjs/);
assert.match(producerCommand, /--queue-only/);
assert.match(producerCommand, /--cycle-deadline-ms=150000/);
assert.match(producerCommand, /--child-timeout-ms=70000/);
assert.match(producerCommand, /--max-batches=1/);
assert.doesNotMatch(producerCommand, /sleep\s+120/);
assert.doesNotMatch(producerCommand, /send-next-prospect|send-qualified-prospect/);

console.log('n8n buffered workflow schedule tests passed');
