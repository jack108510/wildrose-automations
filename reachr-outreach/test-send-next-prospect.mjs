import assert from 'node:assert/strict';
import fs from 'node:fs';
import { allowUnverifiedComposerActor, classifyMessengerBlockingDialog, composeMessage, deliveryConfirmedAfterFreshReopen, deliveryConfirmedByComposerState, getPageMessageRouteEvidence, isConfirmedSend, messengerExplicitFailure, normalize, outreachDate, pickNextProspect, selectSendButtonLabel, senderIdentityAllowed, verifyComposerActorEvidence } from './send-next-prospect.mjs';

assert.equal(normalize('  Example   Martial Arts '), 'example martial arts');
assert.equal(composeMessage('Example Martial Arts'), `Hey, I’m Jack. I’m a student at SMU and I’ve been creating a software called Reachr that helps businesses post across Facebook groups without having to do it all manually.\n\nI’m looking for real business experience and feedback as we build it out. Would Example Martial Arts be interested in testing the tool for free and letting us know what you think?`);

const queuedProspect = { businessName: 'Example Martial Arts', messengerUrl: 'https://m.me/examplemartialarts', status: 'queued' };
const queued = { prospects: [queuedProspect] };
assert.equal(pickNextProspect(queued, new Date('2026-09-14T18:00:00Z')).prospect.businessName, 'Example Martial Arts');
assert.equal(pickNextProspect({ prospects: [] }).reason, 'queue_empty');

const confirmed = sentAt => ({ status: 'sent', sentAt, delivery: 'messenger_confirmed' });
const now = new Date('2026-09-14T18:00:00.000Z');
const dataAt = count => ({ prospects: [...Array.from({ length: count }, () => confirmed('2026-09-14T12:00:00.000Z')), queuedProspect] });
assert.equal(pickNextProspect(dataAt(0), now).prospect.businessName, 'Example Martial Arts');
assert.equal(pickNextProspect(dataAt(149), now).prospect.businessName, 'Example Martial Arts');
assert.equal(pickNextProspect(dataAt(150), now).reason, 'daily_cap');
assert.equal(pickNextProspect(dataAt(151), now).reason, 'daily_cap');

const previousLocalDay = { prospects: [...Array.from({ length: 150 }, () => confirmed('2026-09-14T05:50:00.000Z')), queuedProspect] };
assert.equal(pickNextProspect(previousLocalDay, new Date('2026-09-14T06:10:00.000Z')).prospect.businessName, 'Example Martial Arts');
assert.equal(outreachDate('2026-09-14T05:59:59.000Z'), '2026-09-13');
assert.equal(outreachDate('2026-09-14T06:00:00.000Z'), '2026-09-14');

assert.equal(isConfirmedSend({ status: 'sent', sentAt: '2026-09-14T12:00:00Z' }), false);
assert.equal(isConfirmedSend(confirmed('2026-09-14T12:00:00Z')), true);
assert.equal(senderIdentityAllowed('Jack Sereda', 'Jack Sereda'), true);
assert.equal(senderIdentityAllowed('Jack @jack.sereda.2025', 'Jack Sereda'), true);
assert.equal(senderIdentityAllowed('Wildrose Automations', 'Jack Sereda'), false);
assert.equal(senderIdentityAllowed('', 'Wildrose Automations'), false);
// This bypass stays opt-in and is recorded as unverified in the send ledger.
assert.equal(allowUnverifiedComposerActor(undefined), false);
assert.equal(allowUnverifiedComposerActor('0'), false);
assert.equal(allowUnverifiedComposerActor('1'), true);
// The live message composer itself must expose Jack's personal actor.
assert.deepEqual(
  verifyComposerActorEvidence({ actorLabel: 'Reply as Jack @jack.sereda.2025', actorSource: 'composer_ancestor' }),
  { verified: true, actor: 'Jack Sereda', source: 'composer_ancestor' }
);
assert.equal(verifyComposerActorEvidence({ actorLabel: 'Wildrose Automations', actorSource: 'composer_ancestor' }).verified, false);
assert.equal(verifyComposerActorEvidence({ actorLabel: 'Jack Sereda', actorSource: 'page_timeline' }).verified, false);
assert.equal(verifyComposerActorEvidence({ actorLabel: '', actorSource: 'composer_ancestor' }).verified, false);
assert.equal(classifyMessengerBlockingDialog({ visibleDialogText: 'Enter your PIN to restore your chats Some messages are missing.' }), 'chat_restore_pin_required');
assert.equal(classifyMessengerBlockingDialog({ visibleDialogText: 'Use a one-time code instead' }), 'chat_restore_pin_required');
assert.equal(classifyMessengerBlockingDialog({ visibleDialogText: '' }), '');
assert.equal(messengerExplicitFailure([{ text: "Couldn't send" }]), 'couldnt_send');
assert.equal(messengerExplicitFailure([{ aria: 'Enter, Message sent by You' }]), '');
const pageRoute = getPageMessageRouteEvidence('https://www.messenger.com/t/123456789012345/?messaging_source=source%3Apages%3Amessage_shortlink&source_id=9999999&recurring_notification=0');
assert.deepEqual(pageRoute, {
  url: 'https://www.messenger.com/t/123456789012345/?messaging_source=source%3Apages%3Amessage_shortlink&source_id=9999999&recurring_notification=0',
  routeType: 'messenger_personal_conversation',
  messagingSource: 'source:pages:message_shortlink',
  sourceId: '9999999',
  allowed: true
});
assert.equal(getPageMessageRouteEvidence('https://www.messenger.com/t/123456789012346/?handler=m.me').allowed, true);
assert.equal(getPageMessageRouteEvidence('https://m.me/ExampleBusinessPage').allowed, false);
const unconfirmedFifty = { prospects: [...Array.from({ length: 50 }, () => ({ status: 'sent', sentAt: '2026-09-14T12:00:00.000Z' })), queuedProspect] };
assert.equal(pickNextProspect(unconfirmedFifty, now).prospect.businessName, 'Example Martial Arts');

const tooSoon = { prospects: [{ status: 'sent', sentAt: '2026-09-14T17:52:00.000Z', delivery: 'messenger_confirmed' }, queuedProspect] };
assert.equal(pickNextProspect(tooSoon, now).reason, 'send_gap');
assert.equal(pickNextProspect(tooSoon, now).waitMs, 60_000);
const nineMinutesElapsed = { prospects: [{ status: 'sent', sentAt: '2026-09-14T17:51:00.000Z', delivery: 'messenger_confirmed' }, queuedProspect] };
assert.equal(pickNextProspect(nineMinutesElapsed, now).prospect.businessName, 'Example Martial Arts');
// Pacing is anchored to the Messenger send action, not the later completion of
// the 20-second persistence verification. Verification latency must not drift
// the fixed nine-minute cron cadence.
const verificationFinishedLater = { prospects: [{
  status: 'sent',
  sendInitiatedAt: '2026-09-14T17:51:00.000Z',
  sentAt: '2026-09-14T17:51:25.000Z',
  delivery: 'messenger_confirmed'
}, queuedProspect] };
assert.equal(pickNextProspect(verificationFinishedLater, now).prospect.businessName, 'Example Martial Arts');
// A draft still present in the composer is not delivery, even if the full page text contains it.
assert.equal(deliveryConfirmedByComposerState({ beforeCount: 0, afterCount: 1, composerText: '' }), true);
assert.equal(deliveryConfirmedByComposerState({ beforeCount: 0, afterCount: 1, composerText: 'Hi Example Martial Arts' }), false);
assert.equal(deliveryConfirmedByComposerState({ beforeCount: 1, afterCount: 1, composerText: '' }), false);
// Same-tab optimistic UI is provisional. Final confirmation requires the exact
// recipient and exact message to survive reopening in a newly created target.
assert.equal(deliveryConfirmedAfterFreshReopen({ expectedRecipient: 'Example Martial Arts', observedRecipient: 'Example Martial Arts', exactMessageCount: 1, composerText: '' }), true);
assert.equal(deliveryConfirmedAfterFreshReopen({ expectedRecipient: 'Example Martial Arts', observedRecipient: 'Other Business', exactMessageCount: 1, composerText: '' }), false);
assert.equal(deliveryConfirmedAfterFreshReopen({ expectedRecipient: 'Example Martial Arts', observedRecipient: 'Example Martial Arts', exactMessageCount: 0, composerText: '' }), false);
assert.equal(deliveryConfirmedAfterFreshReopen({ expectedRecipient: 'Example Martial Arts', observedRecipient: 'Example Martial Arts', exactMessageCount: 1, composerText: 'draft' }), false);
assert.equal(selectSendButtonLabel(['Send a voice clip', 'Send a like', 'Send']), 'Send');
assert.equal(selectSendButtonLabel(['Send a voice clip', 'Press enter to send', 'Send a like']), 'Press enter to send');
assert.equal(selectSendButtonLabel(['Send a voice clip', 'Send a like']), '');
const workflow = JSON.parse(fs.readFileSync(new URL('./n8n-buffered-messenger-sender.json', import.meta.url), 'utf8'));
assert.equal(workflow.active, false, 'published n8n sender must remain fail-closed/inactive');
const senderSchedule = workflow.nodes.find(node => node.name === 'Sender every nine minutes').parameters.rule.interval;
assert.deepEqual(senderSchedule.map(rule => rule.expression), [
  '0,9,18,27,36,45,54 0-23/3 * * *',
  '3,12,21,30,39,48,57 1-23/3 * * *',
  '6,15,24,33,42,51 2-23/3 * * *'
]);
const senderSource = fs.readFileSync(new URL('./send-next-prospect.mjs', import.meta.url), 'utf8');
assert.match(senderSource, /CDP_CALL_TIMEOUT_MS/, 'CDP calls must have a hard timeout');
assert.match(senderSource, /addEventListener\('close',[\s\S]*rejectPending/, 'socket close must reject pending CDP calls instead of allowing a silent exit');
assert.match(senderSource, /Input\.dispatchKeyEvent/, 'Messenger submit must use trusted CDP key events');
assert.doesNotMatch(senderSource, /Input\.insertText/, 'Messenger drafting must not bypass trusted keyboard/input events');
assert.match(senderSource, /Page\.bringToFront/, 'Messenger target must be foregrounded inside managed Chrome before dispatch');
assert.match(senderSource, /freshConnection\.call\('Page\.bringToFront'\)/, 'Fresh-readback target must be foregrounded so Messenger loads the thread');
assert.match(senderSource, /freshReadback\?\.ready\s*&&\s*freshReadback\?\.exactMessageCount\s*>\s*0/, 'Fresh-readback polling must wait for the exact message, not merely the composer');
assert.doesNotMatch(senderSource, /button\.click\(\)/, 'untrusted DOM button.click must never be used for Messenger submit');
console.log('reachr outreach queue tests passed: cap=150; 149 allows; 150/151 block; 9-minute pacing; Edmonton rollover verified');
