(()=>{
 const homes=window.HARBOURLINE_PROPERTIES||[];
 const base=new URL('.',document.currentScript.src);
 const areas=[...new Set(homes.map(p=>p.area))];
 const getBudget=q=>{
  const m=q.match(/(?:under|below|less than|up to|max(?:imum)?|budget(?: of)?)\s*\$?\s*([\d,]+(?:\.\d+)?)\s*(m|million|k|thousand)?/i);
  if(!m)return Infinity;const n=Number(m[1].replaceAll(',',''));return n*(m[2]?.toLowerCase().startsWith('m')?1000000:m[2]?.toLowerCase().startsWith('k')?1000:1);
 };
 const getBeds=q=>{
  const numeric=q.match(/\b([1-5])\s*[-+]?\s*(?:bed|bedroom)/i);
  if(numeric)return Number(numeric[1]);
  const words={one:1,two:2,three:3,four:4,five:5};
  return words[q.match(/\b(one|two|three|four|five)[ -]*(?:bed|bedroom)/i)?.[1]?.toLowerCase()]||0;
 };
 const relevant=q=>{
  const query=String(q).toLowerCase(),budget=getBudget(query),beds=getBeds(query);
  const area=areas.find(a=>query.includes(a.toLowerCase()));
  const type=['Condo','Cottage','Townhome','House'].find(t=>new RegExp(`\\b${t.toLowerCase()}s?\\b`).test(query));
  const coastal=/coast|ocean|waterfront|shore|sea view/.test(query);
  const name=homes.find(p=>query.includes(p.name.toLowerCase())||query.includes(p.id.toLowerCase()));
  let matches=homes.filter(p=>p.price<=budget&&p.beds>=beds&&(!area||p.area===area)&&(!type||p.type===type)&&(!coastal||p.waterfront));
  if(name)matches=/\b(similar|other|compare|alternatives?)\b/.test(query)
    ? homes.filter(p=>p.area===name.area&&p.id!==name.id&&Math.abs(p.price-name.price)<=250000)
    : matches.filter(p=>p.id===name.id);
  if(!matches.length)return [];
  if(!area&&!type&&!coastal&&!name&&budget===Infinity&&beds===0)return homes.filter(p=>p.featured).slice(0,4);
  return matches.sort((a,b)=>a.price-b.price).slice(0,4);
 };
 window.RoseCommerce={
  searchProducts:async query=>relevant(query).map(p=>({id:p.id,title:p.name,url:new URL(`properties/${p.slug}.html`,base).href,image:new URL(p.image.slice(1),base).href,price:p.price,currency:'CAD',available:true})),
  addItem:async()=>{throw new Error('Homes can be saved with the heart button on each listing.');}
 };
})();
