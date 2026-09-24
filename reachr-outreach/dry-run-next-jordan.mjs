import fs from 'node:fs';
import { hasExactApproval, sendViaMessenger } from './send-next-jordan.mjs';

const queue = JSON.parse(fs.readFileSync(new URL('./prospects.json', import.meta.url), 'utf8'));
const prospect = queue.prospects.find(item => item.status === 'queued' && hasExactApproval(item));
if (!prospect) throw new Error('No approved Jordan prospect is queued.');
const result = await sendViaMessenger(prospect);
if (!result.dryRun || result.senderAccount !== 'Jordan Slone') throw new Error('Jordan dry run did not prove account and recipient.');
console.log(JSON.stringify({businessName: prospect.businessName, recipientName: prospect.recipientName, route: result.messengerUrl, senderAccount: result.senderAccount}, null, 2));
