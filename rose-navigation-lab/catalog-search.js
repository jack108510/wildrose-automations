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
  window.RoseCommerce = {
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
    addItem: async () => { throw new Error('Demo checkout is disabled'); },
  };
})();
