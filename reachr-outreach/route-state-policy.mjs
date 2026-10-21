const RETRY_DELAY_MS = 30 * 60 * 1000;
const MAX_TRANSIENT_ATTEMPTS = 3;
const EXHAUSTED_RETRY_DELAY_MS = 24 * 60 * 60 * 1000;
const SENDER_FAILURE_RETRY_DELAY_MS = 24 * 60 * 60 * 1000;

export function normalizeBusinessName(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\b(inc|ltd|limited|services|service|company|co)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sourceKey(prospect, selectedSource = prospect.selectedSource || prospect.sources?.[0] || {}) {
  return selectedSource.postUrl || `${selectedSource.businessUrl || prospect.businessUrl}|${selectedSource.sourceGroupUrl}|${(selectedSource.observedText || '').slice(0, 120)}`;
}

export function qualifiesForRouteCheck(prospect) {
  return prospect.sources?.some(source =>
    Boolean(source.businessUrl || prospect.businessUrl) &&
    (source.observedText || '').length >= 80 &&
    (source.promotionSignals || []).some(Boolean)
  );
}

export function messengerRouteFromProfileUrl(profileUrl) {
  try {
    const parsed = new URL(profileUrl);
    const profileId = parsed.pathname === '/profile.php' ? parsed.searchParams.get('id') || '' : '';
    if (/^\d+$/.test(profileId)) return `https://m.me/${profileId}`;
    const handle = parsed.pathname.split('/').filter(Boolean)[0] || '';
    if (!handle || ['profile.php', 'groups', 'pages', 'people'].includes(handle)) return '';
    return `https://m.me/${handle}`;
  } catch { return ''; }
}

function isPermanentRouteOutcome(outcome) {
  const reason = String(outcome?.reason || '');
  return /no matching public business Page found|business identity not present on resolved profile|Page has no stable public route/i.test(reason) ||
    (/identity is not a public business Page/i.test(reason) && outcome?.pageSearchAttempted === true) ||
    /recipient verification failed:\s*Write to\s+\S/i.test(reason);
}

function businessIdentityPriority(prospect) {
  const name = String(prospect?.businessName || '').trim();
  let score = 0;
  if (/\b(?:accounting|academy|auto|automotive|bookkeeping|business|care|clean(?:ing|ers)?|consulting|contracting|construction|detailing|electrical|excavation|grooming|heating|home|landscap(?:e|ing)|lawn|massage|moving|painting|payroll|pet|plumbing|property|renovations?|repair|roofing|services?|solutions?|staffing|tax|transportation|wellness)\b/i.test(name)) score += 10;
  if (/[&]|\b(?:inc|ltd|limited|company|co\.?|corp(?:oration)?)\b/i.test(name)) score += 3;
  if (/\b(?:anonymous participant|unlabeled visible post|is feeling|follow)\b/i.test(name)) score -= 20;
  if (/^[A-Z][\p{L}'-]+(?:\s+[A-Z][\p{L}'-]+){1,2}$/u.test(name) && score === 0) score -= 2;
  return score;
}

export function isRetryableRouteOutcome(outcome, now = new Date()) {
  if (!outcome) return false;
  if (outcome.status === 'queued') return true;
  const reason = String(outcome.reason || '');
  // Numeric Facebook IDs are valid m.me targets now. Retry the legacy refusal
  // through the normal recipient-verification gate, even after old attempts.
  if (/Page has no stable public route; refusing to synthesize a Messenger thread from a profile ID/i.test(reason)) return true;
  // Outcomes written before the official-Page search fallback existed get one
  // immediate migration retry. New outcomes record pageSearchAttempted.
  if (/identity is not a public business Page/i.test(reason) && outcome.pageSearchAttempted !== true) return true;
  if (isPermanentRouteOutcome(outcome)) return false;
  const checked = Date.parse(outcome.checkedAt || '');
  if (!Number.isFinite(checked)) return false;
  const delay = Number(outcome.attempts || 1) >= MAX_TRANSIENT_ATTEMPTS
    ? EXHAUSTED_RETRY_DELAY_MS
    : RETRY_DELAY_MS;
  return now.getTime() - checked >= delay;
}

export function mergeVerifiedAddition(queue, addition) {
  const sameName = queue.find(item => normalizeBusinessName(item.businessName) === normalizeBusinessName(addition.businessName));
  if (sameName) {
    if (sameName.status === 'sent' || sameName.status === 'queued') return { added: 0, recovered: 0 };
    Object.assign(sameName, addition);
    delete sameName.lastError;
    delete sameName.lastAttemptAt;
    return { added: 0, recovered: 1 };
  }
  const duplicateUrl = queue.some(item => String(item.messengerUrl || '').toLowerCase() === String(addition.messengerUrl || '').toLowerCase());
  if (duplicateUrl) return { added: 0, recovered: 0 };
  queue.push(addition);
  return { added: 1, recovered: 0 };
}

export function selectRouteCandidates(discovered, queuedProspects, state, now = new Date(), limit = 60) {
  const knownNames = new Set((queuedProspects || [])
    .filter(p => p.status === 'sent' || p.status === 'queued')
    .map(p => normalizeBusinessName(p.businessName)));
  const coolingSenderFailures = new Set((queuedProspects || [])
    .filter(p => p.status === 'needs_review' && Number.isFinite(Date.parse(p.lastAttemptAt || '')) && now.getTime() - Date.parse(p.lastAttemptAt) < SENDER_FAILURE_RETRY_DELAY_MS)
    .map(p => normalizeBusinessName(p.businessName)));
  const selected = [];
  const prioritized = [...(discovered || [])].sort((a, b) => businessIdentityPriority(b) - businessIdentityPriority(a));
  for (const prospect of prioritized) {
    if (selected.length >= limit) break;
    const prospectName = normalizeBusinessName(prospect.businessName);
    if (!qualifiesForRouteCheck(prospect) || knownNames.has(prospectName) || coolingSenderFailures.has(prospectName)) continue;
    const hasCoolingTransientFailure = Object.values(state?.records || {}).some(outcome =>
      normalizeBusinessName(outcome?.businessName) === prospectName &&
      outcome?.status !== 'queued' &&
      !isPermanentRouteOutcome(outcome) &&
      !isRetryableRouteOutcome(outcome, now)
    );
    if (hasCoolingTransientFailure) continue;
    const source = (prospect.sources || []).find(item => {
      if (!Boolean(item.businessUrl || prospect.businessUrl)) return false;
      if ((item.observedText || '').length < 80 || !(item.promotionSignals || []).some(Boolean)) return false;
      const outcome = state?.records?.[sourceKey(prospect, item)];
      return !outcome || isRetryableRouteOutcome(outcome, now);
    });
    if (source) selected.push({ ...prospect, businessUrl: source.businessUrl || prospect.businessUrl, selectedSource: source });
  }
  return selected;
}
