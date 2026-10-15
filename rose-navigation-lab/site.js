const siteBasePath = new URL(".", document.currentScript.src).pathname;
const catalog = window.TRAIL_PRODUCTS || [];
const pages = [
  { title: "Shipping and delivery", url: `${siteBasePath}shipping.html`, description: "Delivery times, shipping costs, and tracking." },
  { title: "Returns and exchanges", url: `${siteBasePath}returns.html`, description: "Return policy, exchanges, and refunds." },
  { title: "Shop all products", url: `${siteBasePath}shop.html`, description: "Browse all ten outdoor products, sizes, colors and models." },
  { title: "Size guide", url: `${siteBasePath}size-guide.html`, description: "Measurements and jacket sizing." },
  ...catalog.map(product => ({ title: product.name, url: `${siteBasePath}products/${product.slug}.html`, description: `${product.description} ${product.category} ${product.colors.join(' ')} ${product.sizes.join(' ')} ${product.models.join(' ')}`, product })),
];
function findPages(message) {
  const q = message.toLowerCase();
  if (/polic|help pages/.test(q)) return pages.slice(0, 2);
  if (/ship|deliver|track/.test(q)) return pages.filter(p=>p.url.endsWith('shipping.html'));
  if (/return|refund|exchange/.test(q)) return pages.filter(p=>p.url.endsWith('returns.html'));
  if (/size guide|fit guide|measurement/.test(q)) return pages.filter(p=>p.url.endsWith('size-guide.html'));
  const exact = catalog.filter(p=>q.includes(p.name.toLowerCase()) || q.includes(p.slug.replaceAll('-',' ')));
  if (exact.length) return pages.filter(p=>exact.includes(p.product));
  const tokens=q.replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>3 && !['show','take','open','what','have','with','about','tell','want','looking','products','product','different','options'].includes(w));
  const ranked=pages.filter(p=>p.product).map(p=>({p,score:tokens.reduce((n,w)=>n+(p.title+' '+p.description).toLowerCase().includes(w),0)})).filter(x=>x.score).sort((a,b)=>b.score-a.score);
  if (ranked.length) return ranked.slice(0,4).map(x=>x.p);
  if (/shop|catalog|gear|browse|all/.test(q)) return pages.filter(p=>p.url.endsWith('shop.html'));
  return [];
}
if (new URLSearchParams(location.search).has("test") && !new URLSearchParams(location.search).has("arrived")) sessionStorage.clear();
const originalFetch = window.fetch.bind(window);
window.fetch = async (input, options = {}) => {
  const url = new URL(input, location.href);
  const json = value => new Response(JSON.stringify(value), { status: 200, headers: { "Content-Type": "application/json" } });
  const automatedTest = new URLSearchParams(location.search).has("test");
  if (automatedTest && url.pathname === "/api/chat/start") return json({ chatId: "rose-navigation-lab" });
  if (automatedTest && url.pathname === "/api/chat/message") {
    const message = String(JSON.parse(options.body || "{}").content || "").toLowerCase();
    const matches = findPages(message);
    const test = new URLSearchParams(location.search).get("test");
    return json({ reply: matches.length ? matches.length===1 ? `I found ${matches[0].title}. I can take you there.` : `I found ${matches.length} good places to start.` : "Ask me about a product, color, size, shipping, returns, or the size guide.", sitePages: matches.map(page => ({ title:page.title,description:page.description, url: new URL(`${page.url}${test ? `?test=${encodeURIComponent(test)}&arrived=1` : ""}`, location.origin).href })) });
  }
  if (url.pathname === "/api/rose-site-navigation") {
    const query = String(JSON.parse(options.body || "{}").query || "").toLowerCase();
    return json({ ok: true, pages: findPages(query).map(page => ({ title:page.title,description:page.description, url: new URL(page.url, location.origin).href })) });
  }
  if (url.pathname === "/api/rose-site-capabilities") return json({ ok: true });
  return originalFetch(input, options);
};

window.addEventListener("DOMContentLoaded", () => {
  const filterForm=document.querySelector('[data-shop-filters]');
  if(filterForm){
    const cards=[...document.querySelectorAll('[data-shop-grid] [data-product-card]')];
    const render=()=>{
      const values=Object.fromEntries(new FormData(filterForm));
      const matches=cards.filter(card=>(!values.category||card.dataset.category===values.category)&&(!values.max||Number(card.dataset.price)<Number(values.max))&&(!values.color||card.dataset.colors.split('|').includes(values.color))&&(!values.size||card.dataset.sizes.split('|').includes(values.size)));
      cards.forEach(card=>card.hidden=!matches.includes(card));
      document.querySelector('[data-shop-results]').textContent=`${matches.length} ${matches.length===1?'product':'products'}`;
      document.querySelector('[data-shop-empty]').hidden=matches.length>0;
    };
    filterForm.addEventListener('input',render);
    filterForm.addEventListener('change',render);
    filterForm.addEventListener('reset',()=>setTimeout(render,0));
    render();
  }
  const status = document.querySelector("#lab-status");
  const commerce = window.RoseCommerce;
  const money = value => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
  const updateBag = async () => {
    const items = (await commerce.getCart()).items;
    document.querySelectorAll('[data-bag-count]').forEach(count => count.textContent = items.reduce((sum,item)=>sum+item.quantity,0));
    const content = document.querySelector('[data-bag-content]');
    if (!content) return;
    content.replaceChildren();
    if (!items.length) {
      const empty = document.createElement('p'); empty.className='bag-empty'; empty.textContent='Your bag is waiting for its first find.'; content.append(empty); return;
    }
    const list = document.createElement('div'); list.className='bag-items';
    for (const item of items) {
      const row=document.createElement('article'); row.className='bag-item';
      const img=document.createElement('img'); img.src=item.image; img.alt='';
      const detail=document.createElement('div');
      const title=document.createElement('a'); title.href=`${siteBasePath}products/${item.id}.html`; title.textContent=item.title; title.className='bag-item-title';
      const options=document.createElement('p'); options.textContent=[item.selection.color,item.selection.size,item.selection.model].join(' · ');
      const quantity=document.createElement('p'); quantity.textContent=`Quantity ${item.quantity} · ${money(item.price*item.quantity)}`;
      const remove=document.createElement('button'); remove.type='button'; remove.className='bag-remove'; remove.textContent='Remove'; remove.addEventListener('click',()=>commerce.removeItem(item.key));
      detail.append(title,options,quantity,remove); row.append(img,detail); list.append(row);
    }
    const total=document.createElement('p'); total.className='bag-total'; total.textContent=`Demo total ${money(items.reduce((sum,item)=>sum+item.price*item.quantity,0))}`;
    content.append(list,total);
  };
  window.addEventListener('rose:bag-change', updateBag);
  updateBag();
  document.querySelector('[data-add-bag]')?.addEventListener('click',async event=>{
    const button=event.currentTarget;
    const product=commerce.currentProduct();
    if (!product) return;
    try {
      await commerce.addItem({product,quantity:1});
      button.textContent='Added to demo bag ✓';
      if(status) status.textContent=`Added ${product.title} · ${Object.values(commerce.currentSelection()).join(' · ')} to your demo bag.`;
      setTimeout(()=>button.textContent='Add to demo bag ↗',2400);
    } catch(error) { if(status) status.textContent=error.message; }
  });
  document.querySelectorAll("[data-open-rose]").forEach(button => button.addEventListener("click", () => {
    document.querySelector(".wr-fab")?.click();
    document.querySelector('[data-view="chat"].wr-tab')?.click();
    document.querySelector(".wr-input")?.focus();
  }));
  document.querySelectorAll("[data-open-voice]").forEach(button=>button.addEventListener("click",()=>{
    document.querySelector('.wr-fab')?.click();
    document.querySelector('[data-view="voice"].wr-tab')?.click();
  }));
  document.querySelectorAll('[data-option-group]').forEach(group=>group.addEventListener('click',event=>{
    const choice=event.target.closest('[data-option]');if(!choice)return;
    group.querySelectorAll('[data-option]').forEach(button=>{button.classList.toggle('is-selected',button===choice);button.setAttribute('aria-pressed',button===choice?'true':'false')});
    if(group.dataset.optionGroup==='color'){
      const art=document.querySelector('[data-product-art]');
      if(art) art.src=art.src.replace(/-\d+\.svg$/,`-${choice.dataset.optionIndex}.svg`);
    }
    const summary=document.querySelector('[data-selection]');if(summary) summary.textContent=[...document.querySelectorAll('.option-button.is-selected')].map(button=>button.dataset.option).join(' · ');
  }));
  const summary=document.querySelector('[data-selection]');if(summary) summary.textContent=[...document.querySelectorAll('.option-button.is-selected')].map(button=>button.dataset.option).join(' · ');
  document.querySelectorAll("[data-rose-prompt]").forEach(button => button.addEventListener("click", () => {
    document.querySelector(".wr-fab")?.click();
    document.querySelector('[data-view="chat"].wr-tab')?.click();
    const input = document.querySelector(".wr-input");
    if (!input) return;
    input.value = button.dataset.rosePrompt;
    document.querySelector(".wr-send")?.click();
    if (status) status.textContent = `Sent: ${input.value || button.dataset.rosePrompt}`;
  }));
  const test = new URLSearchParams(location.search).get("test");
  if (!test) return;
  if (new URLSearchParams(location.search).has("arrived")) {
    const restored = document.querySelector(".wr-panel.open") && document.querySelector(".wr-chat-log")?.textContent.includes("You're on");
    document.body.dataset.testResult = restored ? "pass" : "fail";
    if (status) status.textContent = restored ? `PASS: ${test} navigation and chat restoration` : `FAIL: ${test} chat did not restore`;
    sessionStorage.clear();
    return;
  }
  const prompts = { unique: "take me to shipping", ordinal: "show the policies" };
  const input = document.querySelector(".wr-input");
  document.querySelector(".wr-fab")?.click();
  document.querySelector('[data-view="chat"].wr-tab')?.click();
  input.value = prompts[test] || prompts.unique;
  document.querySelector(".wr-send")?.click();
  if (test === "ordinal") {
    const choose = async () => {
      for (let i = 0; i < 50 && document.querySelectorAll('[data-rose-page-results="true"] a').length < 2; i++) await new Promise(resolve => setTimeout(resolve, 50));
      if (document.querySelectorAll('[data-rose-page-results="true"] a').length < 2) return;
      input.value = "open the second one";
      document.querySelector(".wr-send")?.click();
    };
    choose();
  }
  setTimeout(() => {
    if (!new URLSearchParams(location.search).has("arrived")) {
      document.body.dataset.testResult = "fail";
      if (status) status.textContent = `FAIL: ${test} did not navigate`;
    }
  }, 5000);
});
