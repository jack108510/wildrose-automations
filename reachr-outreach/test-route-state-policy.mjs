import assert from 'node:assert/strict';
import {
  isRetryableRouteOutcome,
  messengerRouteFromProfileUrl,
  mergeVerifiedAddition,
  qualifiesForRouteCheck,
  selectRouteCandidates,
} from './route-state-policy.mjs';

const now = new Date('2026-09-15T15:00:00.000Z');
const transientOld = {
  status: 'not_queued',
  reason: 'recipient verification failed: no composer',
  checkedAt: '2026-09-15T13:00:00.000Z',
  attempts: 1,
};
const transientRecent = { ...transientOld, checkedAt: '2026-09-15T14:50:00.000Z' };
const permanent = {
  status: 'not_queued',
  reason: 'identity is not a public business Page',
  checkedAt: '2026-09-14T13:00:00.000Z',
  attempts: 1,
  pageSearchAttempted: true,
};
const legacyDirectOnlyRejection = { ...permanent, pageSearchAttempted: undefined };
const exhausted = { ...transientOld, attempts: 3 };
const exhaustedAfterCooldown = { ...exhausted, checkedAt: '2026-09-14T13:00:00.000Z' };
const unexpectedRuntimeFailure = { ...transientOld, reason: 'norm is not defined' };

assert.equal(isRetryableRouteOutcome(transientOld, now), true);
assert.equal(isRetryableRouteOutcome(transientRecent, now), false);
assert.equal(isRetryableRouteOutcome(permanent, now), false);
assert.equal(isRetryableRouteOutcome(legacyDirectOnlyRejection, now), true, 'pre-fallback direct-profile rejection gets one Page-search migration retry');
assert.equal(isRetryableRouteOutcome(exhausted, now), false);
assert.equal(isRetryableRouteOutcome(exhaustedAfterCooldown, now), true, 'capped transient failure should receive one bounded daily retry');
assert.equal(isRetryableRouteOutcome({ ...permanent, attempts: 99 }, now), false, 'permanent identity failures must never reopen');
assert.equal(isRetryableRouteOutcome(unexpectedRuntimeFailure, now), true);
assert.equal(
  isRetryableRouteOutcome({ ...permanent, reason: 'Page has no stable public route; refusing to synthesize a Messenger thread from a profile ID' }, now),
  true,
  'old profile-ID route rejections must be retried after numeric m.me support is enabled',
);
assert.equal(messengerRouteFromProfileUrl('https://www.facebook.com/real.business/'), 'https://m.me/real.business');
assert.equal(messengerRouteFromProfileUrl('https://www.facebook.com/profile.php?id=123456'), 'https://m.me/123456');

const source = (id) => ({
  businessName: `Business ${id}`,
  businessUrl: `https://facebook.com/business-${id}`,
  sources: [{
    postUrl: `https://facebook.com/post-${id}`,
    observedText: 'Book now and contact us for a free estimate. '.repeat(3),
    promotionSignals: ['book now'],
  }],
});
const candidates = [source(1), source(2), source(3)];
assert.equal(qualifiesForRouteCheck({ ...source(9), sources: [{ ...source(9).sources[0], promotionSignals: [false, false, false] }] }), false);
const state = {
  records: {
    'https://facebook.com/post-1': transientOld,
    'https://facebook.com/post-2': permanent,
  },
};
const selected = selectRouteCandidates(candidates, [], state, now, 60);
assert.deepEqual(selected.map(x => x.businessName), ['Business 1', 'Business 3']);

const failedExistingRoute = [{ businessName: 'Business 3', status: 'needs_review' }];
const selectedForRecovery = selectRouteCandidates(candidates, failedExistingRoute, state, now, 60);
assert.deepEqual(selectedForRecovery.map(x => x.businessName), ['Business 1', 'Business 3']);

const previouslyQueuedState = { records: { 'https://facebook.com/post-3': { status: 'queued', checkedAt: now.toISOString() } } };
assert.deepEqual(
  selectRouteCandidates(candidates, failedExistingRoute, previouslyQueuedState, now, 60).map(x => x.businessName),
  ['Business 1', 'Business 2', 'Business 3'],
);

const alreadySent = [{ businessName: 'Business 3', status: 'sent' }];
assert.deepEqual(selectRouteCandidates(candidates, alreadySent, state, now, 60).map(x => x.businessName), ['Business 1']);

const alternateSource = {
  businessName: 'Business Alternate',
  businessUrl: 'https://facebook.com/stale-profile',
  sources: [
    { postUrl: 'https://facebook.com/blocked-post', businessUrl: 'https://facebook.com/stale-profile', observedText: 'Book now. '.repeat(12), promotionSignals: ['book now'] },
    { postUrl: 'https://facebook.com/fresh-post', businessUrl: 'https://facebook.com/fresh-business', observedText: 'Contact us for a quote. '.repeat(8), promotionSignals: ['contact us'] },
  ],
};
const alternateSelected = selectRouteCandidates([alternateSource], [], { records: { 'https://facebook.com/blocked-post': permanent } }, now, 60);
assert.equal(alternateSelected.length, 1);
assert.equal(alternateSelected[0].selectedSource.postUrl, 'https://facebook.com/fresh-post');
assert.equal(alternateSelected[0].businessUrl, 'https://facebook.com/fresh-business');

const duplicateTransientSources = {
  businessName: 'Business Retry Once',
  businessUrl: 'https://facebook.com/same-business',
  sources: [
    { postUrl: 'https://facebook.com/retry-post-1', observedText: 'Book now. '.repeat(12), promotionSignals: ['book now'] },
    { postUrl: 'https://facebook.com/retry-post-2', observedText: 'Contact us. '.repeat(12), promotionSignals: ['contact us'] },
  ],
};
const recentSameBusinessState = { records: {
  'https://facebook.com/retry-post-1': { ...transientRecent, businessName: 'Business Retry Once' },
} };
assert.deepEqual(
  selectRouteCandidates([duplicateTransientSources], [], recentSameBusinessState, now, 60),
  [],
  'a recent transient failure must not retry the same business through a second post source in the same cycle',
);

const personFirst = {
  businessName: 'Jordan Smith',
  businessUrl: 'https://facebook.com/groups/1/user/111',
  sources: [{ postUrl: 'https://facebook.com/person-post', observedText: 'Book now '.repeat(20), promotionSignals: ['book now'] }],
};
const businessSecond = {
  businessName: 'Evergreen Roofing Services',
  businessUrl: 'https://facebook.com/groups/1/user/222',
  sources: [{ postUrl: 'https://facebook.com/business-post', observedText: 'Book now '.repeat(20), promotionSignals: ['book now'] }],
};
assert.equal(
  selectRouteCandidates([personFirst, businessSecond], [], { records: {} }, now, 2)[0].businessName,
  'Evergreen Roofing Services',
  'business-like identities should be verified before person-like identities without bypassing either verification gate',
);

const recentReviewQueue = [{
  businessName: 'Business Retry Once',
  status: 'needs_review',
  lastAttemptAt: '2026-09-22T14:30:00.000Z',
}];
assert.deepEqual(
  selectRouteCandidates([duplicateTransientSources], recentReviewQueue, { records: {} }, now, 60),
  [],
  'a recent sender failure must not be immediately recycled by the producer',
);

const queue = [{ businessName: 'Business 3', status: 'needs_review', lastError: 'no composer' }];
const merged = mergeVerifiedAddition(queue, {
  businessName: 'Business 3',
  recipientName: 'Business 3',
  messengerUrl: 'https://m.me/business-3',
  status: 'queued',
});
assert.equal(merged.added, 0);
assert.equal(merged.recovered, 1);
assert.equal(queue.length, 1);
assert.equal(queue[0].status, 'queued');
assert.equal(queue[0].lastError, undefined);

console.log('route-state retry policy tests passed');
