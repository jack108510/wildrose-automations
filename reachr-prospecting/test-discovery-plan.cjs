const fs = require('node:fs');
const assert = require('node:assert/strict');
const { buildRecentFeedJobs, mergeCandidates } = require('./discovery-plan.cjs');

const groups = [
  { name: 'Local Business', url: 'https://www.facebook.com/groups/localbiz/' },
  { name: 'Trades', url: 'https://www.facebook.com/groups/trades' },
];
const jobs = buildRecentFeedJobs(groups);
assert.equal(jobs.length, 2, 'one fresh-feed scan per group, not five stale keyword searches');
assert.ok(jobs.every(job => !job.url.includes('/search/')));
assert.ok(jobs.every(job => job.url.includes('sorting_setting=CHRONOLOGICAL')));

const merged = mergeCandidates(new Map(), [
  { businessName: 'Alpha', postUrl: 'https://facebook.com/groups/1/posts/10?ref=share', observedText: 'first' },
  { businessName: 'Alpha', postUrl: 'https://facebook.com/groups/1/posts/10', observedText: 'same post' },
  { businessName: 'Alpha', postUrl: 'https://facebook.com/groups/1/posts/11', observedText: 'new post' },
]);
assert.equal(merged.size, 2, 'dedupe exact posts while retaining distinct fresh posts from the same business');

const liveSource = fs.readFileSync('./discover-search-live.cjs', 'utf8');
assert.match(liveSource, /buildRecentFeedJobs/, 'live discovery must use the recent-feed plan');
assert.doesNotMatch(liveSource, /\/search\/\?q=/, 'live discovery must not depend on stale fixed search-result pages');
assert.match(liveSource, /scrollBy/, 'live discovery must load additional fresh feed posts');
assert.match(liveSource, /about:blank/, 'live discovery must attach before Facebook navigation can replace or close a target');
assert.match(liveSource, /Page\.navigate/, 'live discovery must navigate through the attached CDP target');
console.log('recent-feed discovery plan tests passed');
