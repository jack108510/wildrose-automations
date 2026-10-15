(() => {
  const base = new URL('.', document.currentScript.src);
  const key = 'trail-pine-rose-action-v1';
  const products = window.TRAIL_PRODUCTS || [];
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const path = name => new URL(name, base).pathname;
  const on = name => location.pathname === path(name);
  const state = () => { try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch { return null; } };
  const save = plan => { if (plan) sessionStorage.setItem(key, JSON.stringify(plan)); else sessionStorage.removeItem(key); };
  const pause = async (element, action) => {
    if (!element) throw new Error('I could not find that page control.');
    element.scrollIntoView({ behavior:'smooth', block:'center' });
    element.classList.add('rose-action-target');
    await wait(470);
    action();
    await wait(260);
    element.classList.remove('rose-action-target');
  };
  function trail(plan) {
    let panel = document.querySelector('.rose-action-trail');
    if (!panel) {
      panel = document.createElement('aside'); panel.className = 'rose-action-trail';
      panel.setAttribute('aria-live','polite'); document.body.append(panel);
    }
    panel.replaceChildren();
    const title=document.createElement('strong'); title.textContent='ROSE IS NAVIGATING'; panel.append(title);
    const list=document.createElement('ol');
    plan.steps.forEach((step,i)=>{ const item=document.createElement('li'); item.textContent=step.label; item.className=i<plan.index?'done':i===plan.index?'active':''; list.append(item); });
    panel.append(list);
    if(plan.index>=plan.steps.length) { panel.classList.add('finished'); setTimeout(()=>panel.remove(),8500); }
  }
  const sizeFrom = text => /\b(?:extra small|xs)\b/i.test(text)?'XS':/\b(?:small|size s)\b/i.test(text)?'S':/\b(?:medium|size m)\b/i.test(text)?'M':/\b(?:large|size l)\b/i.test(text)?'L':/\b(?:extra large|xl)\b/i.test(text)?'XL':'';
  function parse(message) {
    const q=String(message).toLowerCase();
    const exact=products.find(p=>q.includes(p.name.toLowerCase()));
    const kind=/jacket|shell|waterproof|raincoat|rain jacket/.test(q)?'Outerwear':/parka|coat/.test(q)?'Outerwear':/pant|short|bottom/.test(q)?'Bottoms':/pack|backpack|bag/.test(q)&&!/bag|cart/.test(q.replace(/backpack/g,''))?'Packs':/tee|shirt|fleece|vest|layer/.test(q)?'Layers':'';
    const color=products.flatMap(p=>p.colors).filter(c=>c.includes(' ')&&q.includes(c.toLowerCase())).sort((a,b)=>b.length-a.length)[0] || (/\bblack\b/.test(q)?(exact?.colors.includes('Black')?'Black':'Ink Black'):/\bgreen\b/.test(q)?'Forest Pine':'') || products.flatMap(p=>p.colors).find(c=>q.includes(c.toLowerCase())) || '';
    const budget=Number(q.match(/(?:under|below|less than|up to)\s*\$?\s*(\d{2,4})/)?.[1]||0);
    const size=sizeFrom(q);
    const add=/\b(add|put)\b.*\b(bag|cart)\b/.test(q);
    const find=/\b(find|show|filter|browse|looking for|want)\b/.test(q);
    const select=/\b(set|select|choose|make it)\b/.test(q);
    if(!exact&&!kind&&!color&&!size) return null;
    if(!add&&!find&&!select) return null;
    if(!exact&&!kind&&!color) return null;
    const candidates=products.filter(p=>(!exact||p===exact)&&(!kind||p.category===kind||(/jacket|shell|waterproof/.test(q)&&p.slug==='ridge-shell'))&&(!color||p.colors.includes(color))&&(!size||p.sizes.includes(size))&&(!budget||p.price<budget)&&(!/waterproof|raincoat|rain jacket/.test(q)||/waterproof/.test(p.description+' '+p.detail)));
    return {q, exact:exact?.slug,kind,color,budget,size,add,select,candidates};
  }
  function build(request, view) {
    const p=request.candidates[0];
    const steps=[];
    if(!on('shop.html') || !request.exact) steps.push({type:'shop',label:'Open the collection'});
    if(request.kind)steps.push({type:'filter',field:'category',value:request.kind,label:`Filter to ${request.kind.toLowerCase()}`});
    if(request.budget)steps.push({type:'filter',field:'max',value:String([100,200,300].find(n=>n>=request.budget)||300),label:`Set maximum price to $${request.budget}`});
    if(request.color)steps.push({type:'filter',field:'color',value:request.color,label:`Filter to ${request.color}`});
    if(request.size)steps.push({type:'filter',field:'size',value:request.size,label:`Filter to size ${request.size}`});
    if(p && (request.add||request.select||request.exact)) {
      steps.push({type:'product',slug:p.slug,label:`Open ${p.name}`});
      if(request.color)steps.push({type:'option',field:'color',value:request.color,label:`Choose ${request.color}`});
      if(request.size)steps.push({type:'option',field:'size',value:request.size,label:`Choose size ${request.size}`});
      if(request.add)steps.push({type:'bag',slug:p.slug,label:'Add the selected item to the demo bag'});
    }
    return {steps,index:0,view,started:Date.now(),product:p?.name,request};
  }
  async function run(context) {
    const plan=state(); if(!plan||Date.now()-plan.started>120000){save(null);return;}
    while(plan.index<plan.steps.length){
      trail(plan); const step=plan.steps[plan.index];
      try {
        if(step.type==='shop' && !on('shop.html')) { context.announce('Opening the collection so I can use the product filters.'); context.navigate(new URL('shop.html',base).href,'Shop all gear'); return; }
        if(step.type==='product' && !on(`products/${step.slug}.html`)) { context.announce(`Opening ${plan.product} to set its options.`); context.navigate(new URL(`products/${step.slug}.html`,base).href,plan.product); return; }
        if(step.type==='filter') {
          if(!on('shop.html')) throw new Error('The shop filters are unavailable on this page.');
          const select=document.querySelector(`[data-shop-filters] [name="${step.field}"]`);
          await pause(select,()=>{select.value=step.value;select.dispatchEvent(new Event('change',{bubbles:true}));});
          if(select.value!==step.value) throw new Error(`I could not apply ${step.label.toLowerCase()}.`);
          context.announce(`${step.label}. ${document.querySelector('[data-shop-results]')?.textContent||''} match.`);
        }
        if(step.type==='option') {
          const button=[...document.querySelectorAll(`[data-option-group="${step.field}"] [data-option]`)].find(b=>b.dataset.option===step.value);
          await pause(button,()=>button.click());
          if(button.getAttribute('aria-pressed')!=='true') throw new Error(`I could not select ${step.value}.`);
          context.announce(`${step.label} selected.`);
        }
        if(step.type==='bag') {
          const button=document.querySelector('[data-add-bag]'); const before=Number(document.querySelector('[data-bag-count]')?.textContent||0);
          await pause(button,()=>button.click());
          for(let i=0;i<20&&Number(document.querySelector('[data-bag-count]')?.textContent||0)<=before;i++)await wait(100);
          if(Number(document.querySelector('[data-bag-count]')?.textContent||0)<=before)throw new Error('The demo bag did not confirm the item.');
          context.announce(`${plan.product} was added to your demo bag with the selected options.`);
        }
        plan.index++; save(plan);
      } catch(error){context.announce(error.message); save(null); document.querySelector('.rose-action-trail')?.remove(); return;}
    }
    trail(plan); save(null);
    if(!plan.request.add) context.announce(plan.product?`I found ${plan.product}. You can explore its options here.`:`The matching products are shown in the collection.`);
  }
  let busy=false;
  window.RoseDemoActions={
    canHandle:message=>!!parse(message),
    async handle(message,context){const request=parse(message); if(!request)return false;
      if(!request.candidates.length){context.announce('I could not find a product matching all of those options. Try changing the color, size, or budget.');return true;}
      if(busy)return true; busy=true; save(build(request,context.view)); try{await run(context)}finally{busy=false} return true;
    },
    async resume(context){if(!state()||busy)return;busy=true;try{await run(context)}finally{busy=false}}
  };
})();
