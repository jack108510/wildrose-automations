import assert from 'node:assert/strict';
import fs from 'node:fs';
import { allowUnverifiedComposerActor, classifyMessengerBlockingDialog, classifySendFailure, composeMessage, composerDraftMatches, deliveryConfirmedAfterFreshReopen, deliveryConfirmedByComposerState, dispatchTrustedComposerText, dispatchVerifiedSendControl, getPageMessageRouteEvidence, isConfirmedSend, messengerExplicitFailure, normalize, outreachDate, pickNextProspect, selectSendButtonLabel, senderIdentityAllowed, verifyComposerActorEvidence } from './send-next-prospect.mjs';

assert.equal(normalize('  Impact   Martial Arts '), 'impact martial arts');
assert.equal(composeMessage('Impact Martial Arts'), `Hey, I’m Jack. I’m a student at SMU and I’ve been creating a software called Reachr that helps businesses post across Facebook groups without having to do it all manually.\n\nI’m looking for real business experience and feedback as we build it out. Would Impact Martial Arts be interested in testing the tool for free and letting us know what you think?`);
assert.equal(composerDraftMatches({ innerText: '', textContent: 'draft body' }, 'draft body'), true);
assert.equal(composerDraftMatches({ innerText: 'wrong', textContent: 'draft body' }, 'draft body'), false);
const inputCalls = [];
await dispatchTrustedComposerText(async (method, params) => inputCalls.push({ method, params }), 'line one\nline two');
assert.deepEqual(inputCalls, [{ method: 'Input.insertText', params: { text: 'line one\nline two' } }]);
const sendCalls = [];
await dispatchVerifiedSendControl(async (method, params) => { sendCalls.push({ method, params }); return { result: { result: { value: true } } }; });
assert.equal(sendCalls[0].method, 'Runtime.evaluate');
assert.match(sendCalls[0].params.expression, /press enter to send/);

const queuedProspect = { businessName: 'Impact Martial Arts', messengerUrl: 'https://m.me/teamimpactma', status: 'queued' };
const queued = { prospects: [queuedProspect] };
assert.equal(pickNextProspect(queued, new Date('2026-09-14T18:00:00Z')).prospect.businessName, 'Impact Martial Arts');
assert.equal(pickNextProspect({ prospects: [] }).reason, 'queue_empty');

const confirmed = sentAt => ({ status: 'sent', sentAt, delivery: 'messenger_confirmed' });
const now = new Date('2026-09-14T18:00:00.000Z');
const dataAt = count => ({ prospects: [...Array.from({ length: count }, () => confirmed('2026-09-14T12:00:00.000Z')), queuedProspect] });
assert.equal(pickNextProspect(dataAt(0), now).prospect.businessName, 'Impact Martial Arts');
assert.equal(pickNextProspect(dataAt(149), now).prospect.businessName, 'Impact Martial Arts');
assert.equal(pickNextProspect(dataAt(150), now).reason, 'daily_cap');
assert.equal(pickNextProspect(dataAt(151), now).reason, 'daily_cap');

const previousLocalDay = { prospects: [...Array.from({ length: 150 }, () => confirmed('2026-09-14T05:50:00.000Z')), queuedProspect] };
assert.equal(pickNextProspect(previousLocalDay, new Date('2026-09-14T06:10:00.000Z')).prospect.businessName, 'Impact Martial Arts');
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
assert.deepEqual(
  verifyComposerActorEvidence({ actorLabel: 'Jack @jack.sereda.2025 Settings, help and more', actorSource: 'messenger_account_menu' }),
  { verified: true, actor: 'Jack Sereda', source: 'messenger_account_menu' }
);
assert.equal(verifyComposerActorEvidence({ actorLabel: '', actorSource: 'composer_ancestor' }).verified, false);
assert.equal(classifyMessengerBlockingDialog({ visibleDialogText: 'Enter your PIN to restore your chats Some messages are missing.' }), 'chat_restore_pin_required');
assert.equal(classifyMessengerBlockingDialog({ visibleDialogText: 'Use a one-time code instead' }), 'chat_restore_pin_required');
assert.equal(classifyMessengerBlockingDialog({ visibleDialogText: 'You’re Temporarily Blocked It looks like you were misusing this feature by going too fast.' }), 'messenger_feature_blocked');
assert.equal(classifyMessengerBlockingDialog({ visibleDialogText: '' }), '');
assert.deepEqual(classifySendFailure(new Error('You’re Temporarily Blocked')), {
  code: 'MESSENGER_FEATURE_BLOCKED', globalPause: true, preserveQueuedProspect: true
});
assert.deepEqual(classifySendFailure(new Error('Recipient verification failed')), {
  code: 'PROSPECT_SEND_FAILED', globalPause: false, preserveQueuedProspect: false
});
assert.equal(messengerExplicitFailure([{ text: "Couldn't send" }]), 'couldnt_send');
assert.equal(messengerExplicitFailure([{ aria: 'Enter, Message sent by You' }]), '');
const pageRoute = getPageMessageRouteEvidence('https://www.messenger.com/t/771154309406993/?messaging_source=source%3Apages%3Amessage_shortlink&source_id=1441792&recurring_notification=0');
assert.deepEqual(pageRoute, {
  url: 'https://www.messenger.com/t/771154309406993/?messaging_source=source%3Apages%3Amessage_shortlink&source_id=1441792&recurring_notification=0',
  routeType: 'messenger_personal_conversation',
  messagingSource: 'source:pages:message_shortlink',
  sourceId: '1441792',
  allowed: true
});
assert.equal(getPageMessageRouteEvidence('https://www.messenger.com/t/100000459735170/?handler=m.me').allowed, true);
assert.equal(getPageMessageRouteEvidence('https://m.me/TheVAEffectNet').allowed, false);
const unconfirmedFifty = { prospects: [...Array.from({ length: 50 }, () => ({ status: 'sent', sentAt: '2026-09-14T12:00:00.000Z' })), queuedProspect] };
assert.equal(pickNextProspect(unconfirmedFifty, now).prospect.businessName, 'Impact Martial Arts');

const tooSoon = { prospects: [{ status: 'sent', sentAt: '2026-09-14T17:52:00.000Z', delivery: 'messenger_confirmed' }, queuedProspect] };
assert.equal(pickNextProspect(tooSoon, now).reason, 'send_gap');
assert.equal(pickNextProspect(tooSoon, now).waitMs, 60_000);
const nineMinutesElapsed = { prospects: [{ status: 'sent', sentAt: '2026-09-14T17:51:00.000Z', delivery: 'messenger_confirmed' }, queuedProspect] };
assert.equal(pickNextProspect(nineMinutesElapsed, now).prospect.businessName, 'Impact Martial Arts');
// Pacing is anchored to the Messenger send action, not the later completion of
// the 20-second persistence verification. Verification latency must not drift
// the fixed nine-minute cron cadence.
const verificationFinishedLater = { prospects: [{
  status: 'sent',
  sendInitiatedAt: '2026-09-14T17:51:00.000Z',
  sentAt: '2026-09-14T17:51:25.000Z',
  delivery: 'messenger_confirmed'
}, queuedProspect] };
assert.equal(pickNextProspect(verificationFinishedLater, now).prospect.businessName, 'Impact Martial Arts');
// A draft still present in the composer is not delivery, even if the full page text contains it.
assert.equal(deliveryConfirmedByComposerState({ beforeCount: 0, afterCount: 1, composerText: '' }), true);
assert.equal(deliveryConfirmedByComposerState({ beforeCount: 0, afterCount: 1, composerText: 'Hi Impact Martial Arts' }), false);
assert.equal(deliveryConfirmedByComposerState({ beforeCount: 1, afterCount: 1, composerText: '' }), false);
// Same-tab optimistic UI is provisional. Final confirmation requires the exact
// recipient and exact message to survive reopening in a newly created target.
assert.equal(deliveryConfirmedAfterFreshReopen({ expectedRecipient: 'Impact Martial Arts', observedRecipient: 'Impact Martial Arts', exactMessageCount: 1, composerText: '' }), true);
assert.equal(deliveryConfirmedAfterFreshReopen({ expectedRecipient: 'Impact Martial Arts', observedRecipient: 'Other Business', exactMessageCount: 1, composerText: '' }), false);
assert.equal(deliveryConfirmedAfterFreshReopen({ expectedRecipient: 'Impact Martial Arts', observedRecipient: 'Impact Martial Arts', exactMessageCount: 0, composerText: '' }), false);
assert.equal(deliveryConfirmedAfterFreshReopen({ expectedRecipient: 'Impact Martial Arts', observedRecipient: 'Impact Martial Arts', exactMessageCount: 1, composerText: 'draft' }), false);
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
assert.match(senderSource, /dispatchVerifiedSendControl/, 'Messenger submit must use the exact verified send control');
assert.match(senderSource, /Input\.insertText/, 'Messenger drafting must use CDP text input after recipient and sender verification');
assert.match(senderSource, /Page\.bringToFront/, 'Messenger target must be foregrounded inside managed Chrome before dispatch');
assert.match(senderSource, /failure\.globalPause[\s\S]*persistMessengerFeatureBlock[\s\S]*else[\s\S]*prospect\.status = 'needs_review'/, 'a global Messenger feature block must pause before prospect-level failure handling');
assert.match(senderSource, /freshConnection\.call\('Page\.bringToFront'\)/, 'Fresh-readback target must be foregrounded so Messenger loads the thread');
assert.match(senderSource, /freshReadback\?\.ready\s*&&\s*freshReadback\?\.exactMessageCount\s*>\s*0/, 'Fresh-readback polling must wait for the exact message, not merely the composer');
assert.doesNotMatch(senderSource, /button\.click\(\)/, 'untrusted DOM button.click must never be used for Messenger submit');
console.log('reachr outreach queue tests passed: cap=150; 149 allows; 150/151 block; 9-minute pacing; Edmonton rollover verified');
