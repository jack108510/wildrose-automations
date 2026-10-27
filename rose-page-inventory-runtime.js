// Generated from Rose's canonical page inspector.
globalThis.__roseInspect = function inspectRenderedPage({ maxControls = 1200 } = {}) {
  const short = value => String(value || '').replace(/\s+/g, ' ').trim().slice(0, 160);
  const roots = [document];
  for (let i = 0; i < roots.length; i++) for (const el of roots[i].querySelectorAll('*')) if (el.shadowRoot) roots.push(el.shadowRoot);
  const all = selector => roots.flatMap(root => [...root.querySelectorAll(selector)]);
  const uniqueSelector = el => {
    if (el.getRootNode() !== document) return null; // Inventory open shadow roots; do not invent an executable CSS path.
    if (el.id && document.querySelectorAll(`#${CSS.escape(el.id)}`).length === 1) return `#${CSS.escape(el.id)}`;
    const parts = []; let node = el;
    while (node && node !== document.documentElement) {
      const peers = node.parentElement ? [...node.parentElement.children].filter(x => x.tagName === node.tagName) : [];
      parts.unshift(`${node.tagName.toLowerCase()}:nth-of-type(${peers.indexOf(node) + 1})`); node = node.parentElement;
    }
    return parts.length ? 'html > ' + parts.join(' > ') : 'html';
  };
  const safeText = el => {const copy=el.cloneNode(true);copy.querySelectorAll('input,select,textarea,[contenteditable]').forEach(node=>node.remove());return copy.textContent;};
  const label = el => short(el.getAttribute('aria-label') || (el.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean).map(id => document.getElementById(id)?.textContent || '').join(' ') || [...(el.labels || [])].map(x => {const copy=x.cloneNode(true);copy.querySelectorAll('input,select,textarea,button').forEach(control=>control.remove());return copy.textContent;}).join(' ') || (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.matches('[contenteditable]') ? el.getAttribute('placeholder') || el.getAttribute('name') : /^(FORM|DIALOG)$/.test(el.tagName) || el.getAttribute('role')==='dialog' ? el.querySelector('legend,h1,h2,h3')?.textContent : safeText(el)) || el.getAttribute('title'));
  const visible = el => {
    for (let parent = el.parentElement; parent; parent = parent.parentElement) {
      if (parent.matches('details:not([open])') && ![...parent.children].find(child => child.tagName === 'SUMMARY')?.contains(el)) return false;
    }
    return !!el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && !el.closest('[hidden],[inert]');
  };
  const cleanUrl = raw => { try { const u = new URL(raw, location.href); if (!/^https?:$/.test(u.protocol)) return ''; u.username = ''; u.password = ''; u.search = ''; return u.href; } catch { return ''; } };
  const nodes = all('a[href],button,input:not([type="hidden"]),select,textarea,summary,dialog,form,[role="button"],[role="tab"],[role="menuitem"],[role="dialog"],[role="combobox"],[role="searchbox"],[role="radio"],[role="checkbox"],[role="switch"],[contenteditable="true"]');
  const controls = nodes.slice(0, maxControls).map(el => ({
    selector: uniqueSelector(el), tag: el.tagName.toLowerCase(), role: el.getAttribute('role') || '', type: el.getAttribute('type') || '', label: label(el), visible: visible(el), disabled: !!el.disabled || el.matches(':disabled,[aria-disabled="true"]'), required: !!el.required,
    target: el.getAttribute('aria-controls') ? `#${CSS.escape(el.getAttribute('aria-controls'))}` : null,
    href: el.matches('a[href]') ? cleanUrl(el.getAttribute('href')) : '',
    checked: el.matches('input[type="radio"],input[type="checkbox"]') ? !!el.checked : el.hasAttribute('aria-checked') ? el.getAttribute('aria-checked') === 'true' : null,
    expanded: el.getAttribute('aria-expanded'), selected: el.getAttribute('aria-selected'), selectedIndex: el.matches('select') ? el.selectedIndex : null,
    validation: { minLength: el.getAttribute('minlength'), maxLength: el.getAttribute('maxlength'), pattern: el.hasAttribute('pattern'), inputMode: el.getAttribute('inputmode') },
    form: el.form ? uniqueSelector(el.form) : null,
    options: el.matches('select') ? [...el.options].slice(0, 80).map(option => short(option.label)) : [],
    inspection: 'observed', actionVerified: false,
  }));
  const workflows = [];
  for (const form of all('form').slice(0, 100)) {
    const formSelector = uniqueSelector(form);
    const scope = uniqueSelector(form.closest('dialog,[role="dialog"]') || form); if (!scope || !formSelector) continue;
    const fields = controls.filter(control => control.form === formSelector && ['input','textarea','select'].includes(control.tag) && !['submit','button','reset'].includes(control.type) && control.selector && control.label && !control.disabled);
    const submit = controls.find(control => control.form === formSelector && (control.type === 'submit' || control.tag === 'button' && !control.type));
    if (!fields.length || !submit?.selector) continue;
    const opener = controls.find(control => control.target === scope);
    const steps = [...(opener ? [{kind:'open',selector:opener.selector,label:opener.label}] : []), ...fields.map(field => ({kind:'field',selector:field.selector,label:field.label,required:field.required})), {kind:'submit',selector:submit.selector,label:submit.label || 'Submit'}];
    workflows.push({id:location.pathname+'#'+scope,url:cleanUrl(location.href),scope,target:opener?.selector || fields[0].selector,title:opener?.label || label(form) || submit.label,steps,source:'browser-scan',verified:false});
  }
  const gaps = [];
  if (nodes.length > maxControls) gaps.push({reason:'control_limit',count:nodes.length-maxControls});
  if (roots.length > 1) gaps.push({reason:'shadow_controls_require_adapter',count:roots.length-1});
  for (const frame of all('iframe')) gaps.push({reason:'embedded_frame',url:cleanUrl(frame.getAttribute('src')),label:short(frame.title)});
  if (all('canvas').length) gaps.push({reason:'canvas_requires_adapter',count:all('canvas').length});
  const guarded = controls.filter(c => ['button','select','input','textarea'].includes(c.tag) || ['button','tab','menuitem','combobox','radio','checkbox','switch'].includes(c.role));
  for (const control of guarded) gaps.push({reason:'action_not_executed',selector:control.selector,label:control.label});
  const explorable = [];
  const dangerous = /\b(delete|remove|buy|pay|payment|checkout|submit|logout|sign out|unsubscribe|confirm|save|send|purchase|cancel order|agree|consent|subscribe|accept terms)\b/i;
  const modal = all('dialog[open],[role="dialog"][aria-modal="true"]').find(visible);
  for (const el of nodes) {
    if (!visible(el) || el.disabled || el.matches(':disabled,[aria-disabled="true"]') || (modal && !modal.contains(el)) || dangerous.test(label(el))) continue;
    const selector = uniqueSelector(el); if (!selector) continue;
    if (el.matches('select') && !el.multiple) {
      [...el.options].slice(0, 12).forEach((option,index) => {
        if (!option.disabled && index !== el.selectedIndex) explorable.push({selector,kind:'select',index,label:short(option.label)});
      });
      if (el.options.length > 12) gaps.push({reason:'option_limit',selector,count:el.options.length-12});
      continue;
    }
    if (el.matches('input[type="search"],[role="searchbox"]')) {
      // Use only a site's explicit public example; never copy existing field values.
      const hint = short(el.getAttribute('placeholder'));
      const example = hint.match(/^(?:try|e\.g\.|example:|search for)\s+[“"']?(.+?)[”"']?[.!?]?$/i)?.[1]?.trim();
      if (example && example.length <= 60 && !/[@\d]|https?:/i.test(example)) explorable.push({selector,kind:'search',text:example,label:label(el)});
      else gaps.push({reason:'search_example_required',selector});
      continue;
    }
    if (el.matches('input[type="checkbox"]')) {
      explorable.push({selector,kind:'check',checked:!el.checked,label:label(el)});
      continue;
    }
    if (el.matches('[role="radio"],[role="checkbox"],[role="switch"]')) {
      if (el.getAttribute('role') !== 'radio' || el.getAttribute('aria-checked') !== 'true') explorable.push({selector,kind:'click',label:label(el)});
      continue;
    }
    if (el.matches('input[type="radio"]')) {
      if (!el.checked) explorable.push({selector,kind:'check',label:label(el)});
      continue;
    }
    if (el.matches('button,input') && el.form && el.type !== 'button') continue;
    const controlled = el.getAttribute('aria-controls') && document.getElementById(el.getAttribute('aria-controls'));
    const semantic = el.matches('summary,[role="tab"],[data-rose-map-safe="true"]') || (controlled && (el.hasAttribute('aria-expanded') || controlled.matches('dialog,[role="dialog"]')));
    const readButton = el.matches('button,[role="button"]') && /^(view|show|see|browse|load|open|more|check availability|continue|next|back|previous)\b/i.test(label(el));
    if (semantic || readButton) explorable.push({selector,kind:'click',label:label(el),...(/^(load more|show more|more results|next page)\b/i.test(label(el)) ? {repeatable:true} : {})});
  }
  // Live offers only. Never infer checkout totals, currencies, or a price from a crossed-out offer.
  const productCards = all('[data-component-type="s-search-result"], [data-asin]:not([data-asin=""]), .product-card, .product-item, .product_pod, [data-product-id], [itemtype$="/Product"], .plp-mastercard')
    .filter(el => visible(el) && !el.closest('.wr-ai'));
  const products = [];
  let unreadableProducts = 0;
  for (const card of productCards.filter(el => !productCards.some(parent => parent !== el && parent.contains(el))).slice(0, 300)) {
    const heading = card.querySelector('h2,h3,[itemprop="name"],.product-title,.product_title');
    const link = heading?.closest('a[href]') || heading?.querySelector('a[href]') || card.querySelector('a.a-link-normal[href*="/dp/"],a[href*="/dp/"],a[href*="/product"],a[href*="/products/"],h2 a,h3 a');
    const title = short(heading?.textContent || link?.getAttribute('title') || link?.textContent);
    // IKEA renders the same price twice for sighted and screen-reader visitors.
    // Read its single accessible current-price string, not the containing module.
    const priceNode = card.querySelector('.a-price:not(.a-text-price) .a-offscreen, [itemprop="price"], .price_color, [data-price], .price, .plp-price-module__current-price .plp-price__sr-text');
    const displayPrice = short(priceNode?.getAttribute('content') || priceNode?.getAttribute('data-price') || priceNode?.textContent);
    const currency = short(card.querySelector('[itemprop="priceCurrency"]')?.getAttribute('content') || displayPrice.match(/(?:USD|CAD|AUD|EUR|GBP|JPY|CA\$|US\$|A\$|[$€£¥])/i)?.[0]);
    const numbers = displayPrice.match(/\d[\d.,\s]*\d|\d/g) || [];
    let numeric = (numbers[0] || '').replace(/\s/g, '');
    if (/^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(numeric)) numeric = numeric.replace(/,/g, '');
    else if (/^\d{1,3}(?:\.\d{3})+,\d{2}$/.test(numeric)) numeric = numeric.replace(/\./g, '').replace(',', '.');
    else if (/^\d+,\d{2}$/.test(numeric)) numeric = numeric.replace(',', '.');
    const price = Number(numeric);
    let url; try { url = new URL(link?.href); } catch {}
    if (!title || !url || url.origin !== location.origin || !/^https?:$/.test(url.protocol) || !uniqueSelector(link) || !currency || !numeric || !Number.isFinite(price) || price < 0 || numbers.length !== 1 || priceNode?.closest('del,s,strike,.a-text-price') || /(?:from|starting|per |\/|subscribe|subscription|monthly|used)/i.test(displayPrice)) { unreadableProducts++; continue; }
    const ratingText = short(card.querySelector('.a-icon-alt,[itemprop="ratingValue"],[data-rating]')?.getAttribute('content') || card.querySelector('[data-rating]')?.getAttribute('data-rating') || card.querySelector('.a-icon-alt,[itemprop="ratingValue"]')?.textContent);
    const rating = Number(ratingText.match(/\d(?:[.,]\d+)?/)?.[0]?.replace(',', '.'));
    url.username = ''; url.password = ''; url.search = ''; url.hash = '';
    products.push({title,url:url.href,selector:uniqueSelector(link),price,currency:currency.toUpperCase(),displayPrice,rating:Number.isFinite(rating)&&rating<=5?rating:null});
  }
  return {products,unreadableProducts,explorable,url:cleanUrl(location.href),title:short(document.title),headings:all('h1,h2,h3').slice(0,80).map(el=>short(el.textContent)),controls,workflows,links:controls.filter(c=>c.href).map(c=>({to:c.href,label:c.label})),gaps,loginDetected:controls.some(c=>c.type==='password'),robots:document.querySelector('meta[name="robots"]')?.content || '',totalControls:nodes.length};
};
