const harbourBase=new URL('.',document.currentScript.src);
const harbourHomes=window.HARBOURLINE_PROPERTIES||[];
const saveKey='harbourline-saved-homes-v1';
const saved=()=>{try{return JSON.parse(localStorage.getItem(saveKey)||'[]')}catch{return []}};
const setSaved=ids=>{localStorage.setItem(saveKey,JSON.stringify(ids));window.dispatchEvent(new Event('harbourline:saved'))};
const money=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(n);
const propertyUrl=p=>new URL(`properties/${p.slug}.html`,harbourBase).href;
function findPages(message){
 const q=String(message).toLowerCase();
 const pages=[{title:'Browse all 50 homes',url:new URL('listings.html',harbourBase).href,description:'Filter by area, beds, type and budget.'},{title:'Explore neighbourhoods',url:new URL('neighbourhoods.html',harbourBase).href,description:'Ten Halifax-area neighbourhood guides.'},{title:'Saved homes',url:new URL('favourites.html',harbourBase).href,description:'Your shortlist.'}];
 if(/saved|favo?urite|shortlist/.test(q))return [pages[2]];
 if(/neighbou?rhood|areas/.test(q)&&!/home|house|listing|property/.test(q))return [pages[1]];
 const exact=harbourHomes.filter(p=>q.includes(p.name.toLowerCase())||q.includes(p.id.toLowerCase()));
 if(exact.length)return exact.slice(0,4).map(p=>({title:p.name,url:propertyUrl(p),description:`${p.area} · ${p.beds} bedrooms · ${money(p.price)}`}));
 const areas=[...new Set(harbourHomes.map(p=>p.area))];
 const area=areas.find(a=>q.includes(a.toLowerCase()));
 if(area&&/go|open|visit|take me|show|see/.test(q))return [{title:`Homes in ${area}`,url:new URL(`listings.html?area=${encodeURIComponent(area)}`,harbourBase).href,description:`Browse five fictional homes in ${area}.`}];
 if(/browse|all homes|all listings|catalog|find homes/.test(q))return [pages[0]];
 return [];
}
const originalFetch=window.fetch.bind(window);
window.fetch=async(input,options={})=>{
 const url=new URL(input,location.href);
 const json=value=>new Response(JSON.stringify(value),{status:200,headers:{'Content-Type':'application/json'}});
 if(url.pathname==='/api/rose-site-navigation'){
  const query=String(JSON.parse(options.body||'{}').query||'');
  return json({ok:true,pages:findPages(query)});
 }
 if(url.pathname==='/api/rose-site-capabilities')return json({ok:true});
 return originalFetch(input,options);
};
window.addEventListener('DOMContentLoaded',()=>{
 const getWidget=()=>document.querySelector('.wr-ai');
 const openRose=view=>{
  const widget=getWidget();if(!widget)return;
  const panel=widget.querySelector('.wr-panel');
  if(!panel?.classList.contains('open'))widget.querySelector('.wr-fab')?.click();
  widget.querySelector(`.wr-tab[data-view="${view}"]`)?.click();
  if(view==='chat')widget.querySelector('.wr-input')?.focus();
 };
 document.querySelectorAll('[data-open-rose]').forEach(b=>b.addEventListener('click',()=>openRose('chat')));
 document.querySelectorAll('[data-open-voice]').forEach(b=>b.addEventListener('click',()=>openRose('voice')));
 document.querySelectorAll('[data-rose-prompt]').forEach(b=>b.addEventListener('click',()=>{
  openRose('chat');const input=getWidget()?.querySelector('.wr-input');if(!input)return;
  input.value=b.dataset.rosePrompt;getWidget()?.querySelector('.wr-send')?.click();
 }));
 const updateSaved=()=>{
  const ids=saved();document.querySelectorAll('[data-saved-count]').forEach(node=>node.textContent=ids.length);
  document.querySelectorAll('[data-save]').forEach(b=>{const on=ids.includes(b.dataset.save);b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',`${on?'Remove':'Save'} ${harbourHomes.find(p=>p.id===b.dataset.save)?.name||'home'}`);b.textContent=b.classList.contains('save-detail')?(on?'♥ Saved home':'♡ Save this home'):(on?'♥':'♡')});
  const grid=document.querySelector('[data-saved-grid]');if(grid){grid.replaceChildren();for(const p of harbourHomes.filter(p=>ids.includes(p.id))){const fragment=document.createElement('template');fragment.innerHTML=cardHtml(p);grid.append(fragment.content)}document.querySelector('[data-saved-empty]').hidden=ids.length>0;
   const compare=document.querySelector('[data-compare]'),compareGrid=document.querySelector('[data-compare-grid]');
   if(compare&&compareGrid){
    const pair=ids.slice(0,2).map(id=>harbourHomes.find(p=>p.id===id)).filter(Boolean);
    compare.hidden=pair.length<2;compareGrid.replaceChildren();
    for(const p of pair){const column=document.createElement('article');column.className='compare-home';
      const name=document.createElement('h3');name.textContent=p.name;
      const image=document.createElement('img');image.src=new URL(p.image.slice(1),harbourBase).href;image.alt=`Illustrative exterior for ${p.name}`;
      const facts=document.createElement('dl');for(const [label,value] of [['Price',money(p.price)],['Area',p.area],['Bedrooms',p.beds],['Bathrooms',p.baths],['Living space',`${p.sqft.toLocaleString()} sq ft`],['Type',p.type]]){const dt=document.createElement('dt');dt.textContent=label;const dd=document.createElement('dd');dd.textContent=value;facts.append(dt,dd)}
      const link=document.createElement('a');link.href=propertyUrl(p);link.textContent='View home ↗';column.append(image,name,facts,link);compareGrid.append(column)
    }
   }}
 };
 document.addEventListener('click',event=>{const b=event.target.closest('[data-save]');if(!b)return;const ids=saved();setSaved(ids.includes(b.dataset.save)?ids.filter(x=>x!==b.dataset.save):[...ids,b.dataset.save]);});
 window.addEventListener('harbourline:saved',updateSaved);updateSaved();
 const form=document.querySelector('[data-filter-form]'),grid=document.querySelector('[data-property-grid]');
 if(form&&grid){
  const params=new URLSearchParams(location.search);for(const name of ['query','area','type','beds','max'])if(params.has(name)&&form.elements[name])form.elements[name].value=params.get(name);
  const cards=[...grid.querySelectorAll('.property-card')];let shown=12;
  const render=()=>{
   const values=Object.fromEntries(new FormData(form));const q=(values.query||'').toLowerCase().trim();
   const matches=cards.filter(c=>(!q||c.dataset.name.includes(q))&&(!values.area||c.dataset.area===values.area)&&(!values.type||c.dataset.type===values.type)&&(!values.beds||Number(c.dataset.beds)>=Number(values.beds))&&(!values.max||Number(c.dataset.price)<=Number(values.max)));
   const sort=document.querySelector('[data-sort]')?.value;
   if(sort==='price-asc')matches.sort((a,b)=>Number(a.dataset.price)-Number(b.dataset.price));
   if(sort==='price-desc')matches.sort((a,b)=>Number(b.dataset.price)-Number(a.dataset.price));
   if(sort==='beds-desc')matches.sort((a,b)=>Number(b.dataset.beds)-Number(a.dataset.beds));
   for(const c of matches)grid.append(c);
   for(const c of cards)c.hidden=!matches.includes(c)||matches.indexOf(c)>=shown;
   document.querySelector('[data-results-count]').textContent=`${matches.length} ${matches.length===1?'home':'homes'}`;
   document.querySelector('[data-empty]').hidden=matches.length>0;
   document.querySelector('[data-load-more]').hidden=matches.length<=shown;
   const next=new URLSearchParams();for(const [k,v] of Object.entries(values))if(v)next.set(k,v);history.replaceState(null,'',`${location.pathname}${next.size?'?'+next:''}`);
  };
  form.addEventListener('input',()=>{shown=12;render()});form.addEventListener('change',()=>{shown=12;render()});form.addEventListener('reset',()=>{setTimeout(()=>{shown=12;render()},0)});
  document.querySelector('[data-sort]').addEventListener('change',render);
  document.querySelector('[data-load-more]').addEventListener('click',()=>{shown+=12;render()});render();
 }
});
function cardHtml(p){
 const url=propertyUrl(p),image=new URL(p.image.slice(1),harbourBase).href;
 return `<article class="property-card" data-id="${p.id}"><a class="card-image" href="${url}"><img src="${image}" alt="Illustrative exterior for ${p.name}" loading="lazy"><span class="card-tag">${p.type}</span></a><button class="save-button" type="button" data-save="${p.id}" aria-pressed="true" aria-label="Remove ${p.name}">♥</button><div class="card-body"><div class="card-location">${p.area} <span>·</span> ${p.id}</div><h3><a href="${url}">${p.name}</a></h3><p>${p.address}</p><div class="card-meta"><span>${p.beds} ${p.beds===1?'bed':'beds'}</span><span>${p.baths} ${p.baths===1?'bath':'baths'}</span><span>${p.sqft.toLocaleString()} sq ft</span></div><div class="card-bottom"><strong>${money(p.price)}</strong><a href="${url}">Explore ↗</a></div></div></article>`;
}
