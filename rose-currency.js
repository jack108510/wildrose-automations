/* Rose currency display only. Square and lead payloads remain in CAD. */
(function (global) {
  'use strict';
  const FX_URL = 'https://open.er-api.com/v6/latest/CAD';
  let selected = 'CAD';
  let quote = null;
  let inflight = null;
  let intent = 0;
  const roots = new Set();
  const boundButtons = new WeakSet();

  function formatRosePrice(cad, currency, rate) {
    const amount = Number(cad);
    if (!Number.isFinite(amount) || amount < 0) throw new Error('Invalid CAD price');
    if (currency === 'CAD') return 'CA$' + amount.toFixed(Number.isInteger(amount) ? 0 : 2);
    if (currency !== 'USD') throw new Error('Unsupported currency');
    if (!Number.isFinite(rate) || rate <= 0) throw new Error('Valid exchange rate required');
    return '≈ US$' + (amount * rate).toFixed(2);
  }

  function parseRoseRate(data, now = new Date()) {
    if (data?.result !== 'success' || data.base_code !== 'CAD') throw new Error('CAD exchange rate unavailable');
    const rate = Number(data.rates?.USD);
    if (!Number.isFinite(rate) || rate <= 0 || rate >= 2) throw new Error('Invalid USD exchange rate');
    const timestamp = Number(data.time_last_update_unix) * 1000;
    const age = now.getTime() - timestamp;
    if (!Number.isFinite(timestamp) || age < -3600000 || age > 72 * 3600000) throw new Error('Stale exchange rate');
    return { rate, updated: new Date(timestamp).toISOString().slice(0, 10) };
  }

  async function loadRate() {
    if (quote && Date.now() - Date.parse(quote.updated + 'T00:00:00Z') < 72 * 3600000) return quote;
    if (!inflight) inflight = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(FX_URL, { signal: controller.signal });
        if (!response.ok) throw new Error('Exchange service unavailable');
        return parseRoseRate(await response.json());
      } finally { clearTimeout(timeout); }
    })();
    try { quote = await inflight; return quote; }
    finally { inflight = null; }
  }

  function refresh(root) {
    if (!root?.querySelectorAll) return;
    for (const node of root.querySelectorAll('[data-rose-cad]')) {
      node.textContent = formatRosePrice(node.getAttribute('data-rose-cad'), selected, quote?.rate);
    }
    for (const button of root.querySelectorAll('[data-rose-currency]')) {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-rose-currency') === selected));
      button.disabled = false;
    }
    for (const note of root.querySelectorAll('[data-rose-currency-note]')) {
      note.textContent = selected === 'USD'
        ? `Estimated USD at the ${quote.updated} CAD to USD rate. Square checkout is charged in CAD; your card issuer sets the final USD amount. Rates by `
        : 'Square checkout is charged in CAD.';
      if (selected === 'USD') {
        const source = note.ownerDocument.createElement('a');
        source.href = 'https://www.exchangerate-api.com';
        source.textContent = 'ExchangeRate-API';
        source.target = '_blank';
        source.rel = 'noopener noreferrer';
        note.append(source, note.ownerDocument.createTextNode('.'));
      }
    }
  }

  function mount(root) {
    if (!root?.querySelectorAll) return;
    roots.add(root);
    for (const button of root.querySelectorAll('[data-rose-currency]')) {
      if (boundButtons.has(button)) continue;
      boundButtons.add(button);
      button.addEventListener('click', async () => {
        const currentIntent = ++intent;
        if (button.getAttribute('data-rose-currency') === 'USD') {
          for (const note of root.querySelectorAll('[data-rose-currency-note]')) note.textContent = 'Loading the current CAD to USD rate… Square checkout remains CAD.';
          button.disabled = true;
          try { await loadRate(); if (currentIntent !== intent) return; selected = 'USD'; }
          catch {
            if (currentIntent !== intent) return;
            selected = 'CAD';
            for (const region of roots) refresh(region);
            for (const note of root.querySelectorAll('[data-rose-currency-note]')) note.textContent = 'USD estimate unavailable right now. Prices and checkout remain in CAD.';
            return;
          }
        } else selected = 'CAD';
        for (const region of roots) refresh(region);
      });
    }
    refresh(root);
  }
  const api = { formatRosePrice, parseRoseRate, mount, refresh };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (global) global.RoseCurrency = api;
})(typeof window === 'undefined' ? null : window);
