(() => {
  const MESSENGER_KEY = 'reachr_messenger_reply_queue';
  const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();
  const threadKey = row => normalize(row.threadUrl || row.threadId || `${row.name || ''}::${row.lastMessage || ''}`).toLowerCase();
  function mergeMessengerRows(previous = [], incoming = []) {
    const byKey = new Map(previous.map(row => [threadKey(row), row]));
    for (const next of incoming) {
      const key = threadKey(next);
      if (!key) continue;
      const old = byKey.get(key);
      // Preserve decisions and user-authored drafts; never reopen a closed thread on a scan.
      byKey.set(key, old ? {
        ...old, ...next,
        status: old.status || next.status,
        draft: old.draft || next.draft,
        reviewedAt: old.reviewedAt,
        approvedAt: old.approvedAt,
        sentAt: old.sentAt,
        createdAt: old.createdAt || next.createdAt,
      } : next);
    }
    return [...byKey.values()].sort((a, b) => String(b.lastActivityAt || '').localeCompare(String(a.lastActivityAt || '')));
  }
  function makeDraft(row) {
    const name = normalize(row.name).split(' ')[0] || 'there';
    return `Hi ${name} — thanks for getting back to me. I want to make sure I answer properly: what would be most useful for you to know about the AI receptionist idea?`;
  }
  if (typeof globalThis !== 'undefined') Object.assign(globalThis, { MESSENGER_KEY, normalizeMessengerText: normalize, mergeMessengerRows, makeMessengerDraft: makeDraft });
  if (typeof module !== 'undefined' && module.exports) module.exports = { MESSENGER_KEY, normalize, threadKey, mergeMessengerRows, makeDraft };
})();
