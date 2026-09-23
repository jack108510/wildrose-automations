(() => {
  function recordKey(record) { return String(record?.postUrl || record?.businessUrl || `${record?.businessName || ''}::${record?.sourceGroupUrl || ''}`).toLowerCase(); }
  function mergeReachrRecords(previous = [], incoming = []) {
    const prior = new Map(previous.map(record => [recordKey(record), record]));
    const merged = [...previous];
    const indexes = new Map(merged.map((record, index) => [recordKey(record), index]));
    for (const record of incoming) {
      const key = recordKey(record); if (!key) continue;
      const old = prior.get(key);
      const next = old ? { ...old, ...record, status: old.status || record.status, decisionAt: old.decisionAt, firstObservedAt: old.firstObservedAt || old.observedAt || record.observedAt } : { ...record, firstObservedAt: record.firstObservedAt || record.observedAt };
      if (indexes.has(key)) merged[indexes.get(key)] = next;
      else { indexes.set(key, merged.length); merged.push(next); }
    }
    return merged;
  }
  if (typeof globalThis !== 'undefined') { globalThis.reachrRecordKey = recordKey; globalThis.mergeReachrRecords = mergeReachrRecords; }
  if (typeof module !== 'undefined' && module.exports) module.exports = { recordKey, mergeReachrRecords };
})();
