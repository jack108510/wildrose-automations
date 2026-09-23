function buildRecentFeedJobs(groups = []) {
  return groups.map(group => ({
    group,
    mode: 'recent_feed',
    url: `${String(group.url || '').replace(/\/$/, '')}?sorting_setting=CHRONOLOGICAL`,
  }));
}

function mergeCandidates(existing = new Map(), candidates = []) {
  for (const candidate of candidates) {
    const postUrl = String(candidate.postUrl || '').split('?')[0].replace(/\/$/, '');
    const businessUrl = String(candidate.businessUrl || '').split('?')[0].replace(/\/$/, '');
    const key = postUrl || `${businessUrl}|${String(candidate.observedText || '').slice(0, 160)}`;
    if (key && !existing.has(key)) existing.set(key, candidate);
  }
  return existing;
}

module.exports = { buildRecentFeedJobs, mergeCandidates };
