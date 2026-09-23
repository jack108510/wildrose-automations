// Read-only, user-started scan for already-rendered posts in open Facebook groups.
(() => {
  const PROMO_PATTERNS = [
    /\b(dm|message|call|text|email|contact|book|booking|quote|estimate|order|shop)\b/i,
    /\b(available|opening|offer|special|discount|free consultation|now accepting|taking bookings|sale|vendor)\b/i,
    /\b(service|services|business|company|licensed|insured|repair|installation|consulting|coaching|cleaning|contractor|restaurant|boutique|bookkeeping|accounting|landscaping|roofing|massage|design|marketing|catering|academy|training|moving|detailing|grooming|pet sitting|dog walking|janitorial|concrete|automotive|virtual assistant|lawn care)\b/i,
  ];
  const clean = (value, max = 1400) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
  const stripQuery = value => { try { const u = new URL(value); u.search = ''; u.hash = ''; return u.href.replace(/\/$/, ''); } catch { return ''; } };
  const visible = el => { if (!el?.isConnected) return false; const style = getComputedStyle(el), rect = el.getBoundingClientRect(); return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'; };
  function promotionSignals(text) { const value = clean(text).toLowerCase(); return PROMO_PATTERNS.map(pattern => pattern.test(value)); }
  function isLikelyPromotion(text) { return promotionSignals(text).filter(Boolean).length >= 2; }
  function normalizeBusinessName(value) { return clean(value, 120).replace(/\s*[·|]\s*(admin|moderator|group expert).*$/i, '').trim(); }
  function composeReachrMessage(businessName) {
    const name = normalizeBusinessName(businessName); if (!name) return '';
    return `Hey, I’m Jack. I’m a student at SMU and I’ve been creating software called Reachr that helps businesses post across Facebook groups without having to do it all manually.\n\nI noticed ${name} is already promoting through Facebook groups. I’m looking for real business experience and feedback as we build it out. Would ${name} be interested in testing the tool for free and letting us know what you think?`;
  }
  function dedupeKey(record = {}) { const post = stripQuery(record.postUrl); if (post) return `post:${post}`; const business = stripQuery(record.businessUrl); if (business) return `business:${business}`; return `name:${clean(record.businessName).toLowerCase()}|group:${clean(record.sourceGroupUrl).toLowerCase()}`; }
  function canonicalPostUrl(article) { const link = [...article.querySelectorAll('a[href]')].find(a => /\/groups\/[^/]+\/(posts|permalink)\//i.test(a.href)); return link ? stripQuery(link.href) : ''; }
  function author(article) {
    const anchors = [...article.querySelectorAll('h2 a[href], h3 a[href], strong a[href], a[role="link"][href]')].filter(visible);
    const match = anchors.find(a => { const label = normalizeBusinessName(a.textContent), href = a.href || ''; return label && label.length <= 120 && !/\/groups\/[^/]+\/(posts|permalink)\//i.test(href) && !/facebook\.com\/(groups|share|photo|watch)\//i.test(href); });
    return { businessName: normalizeBusinessName(match?.textContent) || 'Unlabeled visible post', businessUrl: stripQuery(match?.href) };
  }
  function cleanObservedText(value) { return clean(value).replace(/(?:Facebook\s*){3,}/gi, ' ').replace(/^\s*[·|]\s*/, '').trim(); }
  function fallbackPostContainers() {
    return [...document.querySelectorAll('h2, h3')].filter(visible).map(heading => {
      const name = normalizeBusinessName(heading.innerText || heading.textContent);
      if (!name || name.length > 120 || /facebook|featured|recent activity|about|upcoming events|date night/i.test(name)) return null;
      let node = heading;
      while (node?.parentElement) {
        node = node.parentElement;
        const text = cleanObservedText(node.innerText || '');
        if (text.length >= 100 && text.length <= 5000 && text.toLowerCase().startsWith(name.toLowerCase())) return { node, businessName: name, businessUrl: stripQuery(heading.querySelector('a[href]')?.href || heading.closest('a[href]')?.href) };
      }
      return null;
    }).filter(Boolean);
  }
  function scanVisibleGroupPromotions() {
    if (!/facebook\.com\/groups\/[^/]+/i.test(location.href) || /\/search\//i.test(location.pathname)) return { ok: false, error: 'This tab is not an open Facebook group feed.' };
    const sourceGroupUrl = `${location.origin}${location.pathname}`.replace(/\/$/, '');
    const sourceGroupName = clean(document.title.replace(/^\(\d+\+?\)\s*/, '').replace(/\s*\|\s*Facebook.*$/i, ''), 180);
    const seen = new Set();
    const articles = [...document.querySelectorAll('[role="article"]')].filter(visible).filter(article => cleanObservedText(article.innerText || article.textContent || '').length >= 80);
    const containers = articles.length ? articles.map(node => ({ node })) : fallbackPostContainers();
    const rawRecords = containers.map(item => { const article = item.node; const identity = item.businessName ? { businessName: item.businessName, businessUrl: item.businessUrl } : author(article), observedText = cleanObservedText(article.innerText || article.textContent || ''); return { ...identity, sourceGroupName, sourceGroupUrl, postUrl: canonicalPostUrl(article), observedText, promotionSignals: promotionSignals(observedText) }; });
    const candidates = rawRecords
      .filter(record => record.observedText.length >= 80 && isLikelyPromotion(record.observedText))
      .filter(record => { const key = dedupeKey(record); if (seen.has(key)) return false; seen.add(key); return true; })
      .slice(0, 25).map(record => ({ ...record, status: 'pending_review', draft: composeReachrMessage(record.businessName), observedAt: new Date().toISOString() }));
    return { ok: true, mode: 'visible_posts_only', sourceGroupName, sourceGroupUrl, scannedAt: new Date().toISOString(), diagnostics: { articles: articles.length, containers: containers.length, promotional: rawRecords.filter(record => record.observedText.length >= 80 && isLikelyPromotion(record.observedText)).length, samples: rawRecords.map(record => ({ name: record.businessName, chars: record.observedText.length, signals: record.promotionSignals, text: record.observedText.slice(0, 240) })) }, candidates, count: candidates.length };
  }
  if (typeof globalThis !== 'undefined') globalThis.__reachrScanVisibleGroupPromotions = scanVisibleGroupPromotions;
  if (typeof module !== 'undefined' && module.exports) module.exports = { promotionSignals, isLikelyPromotion, normalizeBusinessName, composeReachrMessage, dedupeKey };
  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) chrome.runtime.onMessage.addListener((msg, _sender, respond) => { if (msg?.type !== 'SCAN_VISIBLE_GROUP_PROMOTIONS') return; try { respond(scanVisibleGroupPromotions()); } catch (error) { respond({ ok: false, error: error?.message || 'Visible-post scan failed.' }); } });
})();
