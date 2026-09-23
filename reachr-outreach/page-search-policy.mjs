export function normalizePageIdentity(value = '') {
  return String(value).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

export function selectOfficialPageSearchResult(results = [], businessName = '') {
  const expected = normalizePageIdentity(businessName);
  if (!expected) return null;
  return (results || []).find(result => {
    try {
      const url = new URL(result.href);
      if (!/(^|\.)facebook\.com$/i.test(url.hostname)) return false;
      if (/\/(groups|search|posts|marketplace|events|watch)(\/|$)/i.test(url.pathname)) return false;
      if (/\/user\/\d+/i.test(url.pathname)) return false;
      const evidence = normalizePageIdentity(`${result.text || ''} ${result.context || ''}`);
      return evidence.includes(expected);
    } catch {
      return false;
    }
  }) || null;
}
