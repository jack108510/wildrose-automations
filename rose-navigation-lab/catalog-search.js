(() => {
  const products = window.TRAIL_PRODUCTS || [];
  const base = new URL('.', document.currentScript.src);
  const aliases = {
    'ridge-shell': 'rain rainy wet waterproof shell jacket lightweight hiking breathable',
    'summit-parka': 'winter snow freezing cold jacket coat insulated warm parka',
    'switchback-vest': 'vest sleeveless packable light warmth layer',
    'cloudline-fleece': 'fleece sweater pullover cozy soft warm layer',
    'trailhead-tee': 'shirt tee tshirt base layer summer cotton',
    'roamer-pant': 'pant pants trousers hiking stretch bottoms',
    'canyon-short': 'short shorts warm weather summer hiking',
    'daybreak-pack': 'pack backpack bag daypack carry',
    'wayfinder-cap': 'cap hat sun shade headwear',
    'wildflower-bottle': 'bottle water hydration drink flask',
  };
  const common = new Set(['help','getting','need','some','with','that','this','something','want','show','find','looking','like','have','what','your']);
  const card = p => ({
    id: p.slug,
    title: p.name,
    url: new URL(`products/${p.slug}.html`, base).href,
    image: new URL(`products/images/${p.slug}.svg`, base).href,
    price: p.price,
    currency: 'USD',
    available: true,
    needsOptions: true,
  });
  const bagKey = 'trail-pine-demo-bag-v1';
  const readBag = () => {
    try { return JSON.parse(sessionStorage.getItem(bagKey) || '[]'); }
    catch { return []; }
  };
  const writeBag = items => {
    sessionStorage.setItem(bagKey, JSON.stringify(items));
    window.dispatchEvent(new Event('rose:bag-change'));
  };
  const currentProduct = () => {
    const slug = location.pathname.match(/\/products\/([a-z0-9-]+)\.html$/)?.[1];
    const found = products.find(p => p.slug === slug);
    return found ? card(found) : null;
  };
  const currentSelection = () => {
    if (!currentProduct()) return null;
    const selected = kind => document.querySelector(`[data-option-group="${kind}"] .is-selected`)?.dataset.option;
    const color = selected('color'), size = selected('size'), model = selected('model');
    return color && size && model ? { color, size, model } : null;
  };
  window.RoseCommerce = {
    currentProduct,
    currentSelection,
    getCart: async () => ({ items: readBag() }),
    removeItem: key => writeBag(readBag().filter(item => item.key !== key)),
    clearCart: () => writeBag([]),
    searchProducts: async query => {
      const q = String(query).toLowerCase();
      const words = q.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !common.has(w));
      if (!words.length) return [];
      if (/\b(rain|rainy|wet|waterproof)\b/.test(q)) return products.filter(p => p.slug === 'ridge-shell').map(card);
      if (/\b(jacket|coat)\b/.test(q)) return products.filter(p => ['ridge-shell','summit-parka'].includes(p.slug)).map(card);
      const ranked = products.map(p => {
        const name = p.name.toLowerCase();
        const haystack = `${name} ${p.category} ${p.description} ${p.colors.join(' ')} ${p.detail} ${aliases[p.slug]}`.toLowerCase();
        const score = words.reduce((total, word) => total + (name.includes(word) ? 5 : 0) + (haystack.includes(word) ? 2 : 0), 0);
        return { p, score };
      }).filter(result => result.score > 0).sort((a, b) => b.score - a.score);
      const top = ranked[0]?.score || 0;
      return ranked.filter(result => result.score >= Math.max(2, top * .55)).slice(0, 3).map(result => card(result.p));
    },
    addItem: async ({ product, quantity = 1 }) => {
      const here = currentProduct();
      const selection = currentSelection();
      if (!here || here.id !== product?.id || !selection) throw new Error(`Open ${product?.title || 'the product'} and choose its options first.`);
      const key = [here.id, selection.color, selection.size, selection.model].join('|');
      const items = readBag();
      const existing = items.find(item => item.key === key);
      if (existing) existing.quantity += quantity;
      else {
        const source = products.find(p => p.slug === here.id);
        const colorIndex = source.colors.indexOf(selection.color);
        items.push({ key, id: here.id, title: here.title, image: new URL(`products/images/${here.id}-${colorIndex}.svg`, base).href, price: here.price, currency: here.currency, selection, quantity });
      }
      writeBag(items);
      return { ok: true, cartUrl: new URL('bag.html', base).href, selection };
    },
  };
})();
