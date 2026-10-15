(() => {
  const base=new URL('.',document.currentScript.src), key='harbourline-rose-action-v1';
  const homes=window.HARBOURLINE_PROPERTIES||[], wait=ms=>new Promise(r=>setTimeout(r,ms));
  const url=p=>new URL(p,base).href, on=p=>location.pathname===new URL(p,base).pathname;
  const load=()=>{try{return JSON.parse(sessionStorage.getItem(key)||'null')}catch{return null}};
  const save=p=>p?sessionStorage.setItem(key,JSON.stringify(p)):sessionStorage.removeItem(key);
  async function touch(el,act){if(!el)throw Error('I could not find that page control.');el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('rose-action-target');await wait(450);act();await wait(250);el.classList.remove('rose-action-target');}
  function trail(plan){let box=document.querySelector('.rose-action-trail');if(!box){box=document.createElement('aside');box.className='rose-action-trail';box.setAttribute('aria-live','polite');document.body.append(box)}box.replaceChildren();const h=document.createElement('strong');h.textContent='ROSE IS NAVIGATING';box.append(h);const ol=document.createElement('ol');plan.steps.forEach((s,i)=>{const li=document.createElement('li');li.textContent=s.label;li.className=i<plan.index?'done':i===plan.index?'active':'';ol.append(li)});box.append(ol);if(plan.index>=plan.steps.length){box.classList.add('finished');setTimeout(()=>box.remove(),8500)}}
  function parse(message){const q=String(message).toLowerCase();const area=[...new Set(homes.map(h=>h.area))].find(a=>q.includes(a.toLowerCase()))||'';const named=homes.find(h=>q.includes(h.name.toLowerCase()))||null;
    const beds=Number(q.match(/\b([2-5])\s*(?:-|\s)?(?:bed|bedroom)/)?.[1]||({two:2,three:3,four:4,five:5}[q.match(/\b(two|three|four|five)[ -]bed/)?.[1]]||0));
    const amount=q.match(/(?:under|below|up to|less than)\s*\$?\s*([\d,.]+)\s*(k|m|million)?/);let budget=amount?Number(amount[1].replace(/,/g,'')):0;if(amount?.[2]==='k')budget*=1000;if(amount?.[2]==='m'||amount?.[2]==='million')budget*=1000000;
    const type=[...new Set(homes.map(h=>h.type))].find(t=>new RegExp(`\\b${t.toLowerCase()}s?\\b`).test(named?q.replace(named.name.toLowerCase(),''):q))||'';
    const saveOne=/\b(save|shortlist|heart|favo?urite)\b/.test(q), compare=/\bcompare|comparison\b/.test(q), similar=/\bsimilar|like this\b/.test(q);
    const find=/\b(find|show|filter|browse|looking for|want|search)\b/.test(q);
    if(!find&&!saveOne&&!compare&&!similar)return null;
    if(!area&&!named&&!beds&&!budget&&!type&&!saveOne&&!compare&&!similar)return null;
    const matches=homes.filter(h=>(!area||h.area===area)&&(!beds||h.beds>=beds)&&(!budget||h.price<=budget)&&(!type||h.type===type));
    return {area,named:named?.id,beds,budget,type,saveOne,compare,similar,matches};
  }
  function planFor(r,view){const steps=[];if(r.area||r.beds||r.budget||r.type||!r.named&&r.matches.length){steps.push({type:'listings',label:'Open all homes'});if(r.area)steps.push({type:'filter',field:'area',value:r.area,label:`Filter to ${r.area}`});if(r.type)steps.push({type:'filter',field:'type',value:r.type,label:`Filter to ${r.type} homes`});if(r.beds)steps.push({type:'filter',field:'beds',value:String(r.beds),label:`Set ${r.beds}+ bedrooms`});if(r.budget)steps.push({type:'filter',field:'max',value:String(r.budget),label:`Set maximum price to $${r.budget.toLocaleString()}`});}
    if(r.saveOne){const picks=r.named?[r.matches.find(h=>h.id===r.named)]:r.matches.slice(0,r.compare?2:1);for(const h of picks.filter(Boolean))steps.push({type:'save',id:h.id,label:`Save ${h.name}`});}
    if(r.similar){const h=homes.find(p=>p.id===r.named)||r.matches[0];if(h)steps.push({type:'similar',slug:h.slug,label:`Show homes similar to ${h.name}`});}
    if(r.compare)steps.push({type:'compare',label:'Open the saved home comparison'});
    return {steps,index:0,started:Date.now(),view,request:{matches:r.matches.length,compare:r.compare,similar:r.similar,named:r.named,saveOne:r.saveOne}};
  }
  async function run(ctx){const p=load();if(!p||Date.now()-p.started>120000){save(null);return}
    while(p.index<p.steps.length){trail(p);const s=p.steps[p.index];try{
      if(['listings','filter'].includes(s.type)&&!on('listings.html')){ctx.announce('Opening Browse homes so I can use the listing controls.');ctx.navigate(url('listings.html'),'Browse homes');return}
      if(s.type==='listings'){await touch(document.querySelector('[data-filter-form]'),()=>{});ctx.announce('The listing filters are ready.');}
      if(s.type==='filter'){const control=document.querySelector(`[data-filter-form] [name="${s.field}"]`);await touch(control,()=>{control.value=s.value;control.dispatchEvent(new Event('change',{bubbles:true}))});if(control.value!==s.value)throw Error(`I could not apply ${s.label.toLowerCase()}.`);ctx.announce(`${s.label}. ${document.querySelector('[data-results-count]')?.textContent||''} match.`)}
      if(s.type==='save'){const home=homes.find(h=>h.id===s.id);const card=document.querySelector(`[data-property-grid] [data-id="${s.id}"]`);if((!card||card.hidden)&&!on(`properties/${home.slug}.html`)){ctx.announce(`Opening ${home.name} so I can save it.`);ctx.navigate(url(`properties/${home.slug}.html`),home.name);return}const button=(card&&!card.hidden?card.querySelector('[data-save]'):document.querySelector('.save-detail[data-save]'));if(!button)throw Error('I could not find the save control for that home.');if(button.getAttribute('aria-pressed')!=='true')await touch(button,()=>button.click());if(button.getAttribute('aria-pressed')!=='true')throw Error('The saved homes count did not update.');ctx.announce(`${home.name} is saved to your shortlist.`)}
      if(s.type==='similar'){if(!on(`properties/${s.slug}.html`)){ctx.announce('Opening the home and its similar listings.');ctx.navigate(url(`properties/${s.slug}.html`),'Similar homes');return}const related=document.querySelector('.related');await touch(related,()=>{});ctx.announce(`Here are more homes in the same area. The related listings are now in view.`)}
      if(s.type==='compare'){if(!on('favourites.html')){ctx.announce('Opening your saved homes for a side-by-side comparison.');ctx.navigate(url('favourites.html'),'Saved homes');return}const comparison=document.querySelector('[data-compare]');if(comparison?.hidden)throw Error('Save at least two homes to compare them.');await touch(comparison,()=>{});ctx.announce('Your saved homes are compared side by side below.')}
      p.index++;save(p);
    }catch(e){ctx.announce(e.message);save(null);document.querySelector('.rose-action-trail')?.remove();return}}
    trail(p);save(null);if(!p.request.compare&&!p.request.similar&&!p.request.named&&on('listings.html'))ctx.announce(`${p.request.matches} matching ${p.request.matches===1?'home is':'homes are'} shown here.`)
  }
  let busy=false;
  window.RoseDemoActions={canHandle:q=>!!parse(q),async handle(message,ctx){const r=parse(message);if(!r)return false;if(!r.matches.length&&!(r.compare&&!r.area&&!r.beds&&!r.budget&&!r.named)){ctx.announce('No homes match all of those filters. Try a wider budget, area, or bedroom count.');return true}if(busy)return true;busy=true;save(planFor(r,ctx.view));try{await run(ctx)}finally{busy=false}return true},async resume(ctx){if(!load()||busy)return;busy=true;try{await run(ctx)}finally{busy=false}}};
})();
