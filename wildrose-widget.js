(() => {
  const script = document.currentScript;
  const cfg = {
    apiBase: script?.dataset.apiBase || "",
    title: script?.dataset.title || "Rose",
    accent: script?.dataset.accent || "#ff5722",
  };

  const css = `
    .wr-ai,.wr-ai *{box-sizing:border-box}.wr-ai{--accent:${cfg.accent};position:fixed;right:22px;bottom:22px;z-index:2147483000;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#151515}.wr-fab{height:58px;border:0;border-radius:999px;padding:0 18px 0 10px;display:flex;align-items:center;gap:12px;background:#141414;color:white;box-shadow:0 18px 48px rgba(20,20,20,.28);cursor:pointer;transition:.18s ease;font:inherit}.wr-fab:hover{transform:translateY(-2px);box-shadow:0 22px 60px rgba(20,20,20,.34)}.wr-dot{width:38px;height:38px;border-radius:999px;background:#fff;display:grid;place-items:center;overflow:hidden;border:1px solid rgba(255,255,255,.16)}.wr-dot img{width:100%;height:100%;object-fit:cover;display:block}.wr-fab strong{display:block;font-size:14px;font-weight:850;letter-spacing:-.01em;text-align:left}.wr-fab small{display:block;color:#bdbdbd;font-size:11.5px;margin-top:1px;text-align:left}.wr-panel{position:absolute;right:0;bottom:0;width:min(390px,calc(100vw - 28px));height:min(610px,calc(100vh - 28px));display:none;grid-template-rows:auto auto 1fr auto;overflow:hidden;background:#fffaf4;border:1px solid rgba(20,20,20,.12);border-radius:28px;box-shadow:0 32px 90px rgba(20,20,20,.25)}.wr-panel.open{display:grid;animation:wrIn .16s ease-out}@keyframes wrIn{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:none}}.wr-head{padding:18px 18px 16px;background:#141414;color:#fff;position:relative}.wr-head:after{content:"";position:absolute;left:18px;right:18px;bottom:0;height:1px;background:linear-gradient(90deg,var(--accent),transparent)}.wr-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.wr-brand{display:flex;gap:12px;align-items:center;min-width:0}.wr-mark{width:44px;height:44px;border-radius:14px;background:#fff;display:grid;place-items:center;overflow:hidden;border:1px solid rgba(255,255,255,.12);box-shadow:0 12px 26px rgba(255,87,34,.18)}.wr-mark img{width:100%;height:100%;object-fit:cover;display:block}.wr-kicker{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#ffb39a;font-weight:900;margin-bottom:3px}.wr-title h3{margin:0;font-size:22px;line-height:1;font-weight:850;letter-spacing:-.03em}.wr-title p{margin:6px 0 0;color:#d9d9d9;font-size:12.5px;line-height:1.35;max-width:250px}.wr-close{width:34px;height:34px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:#fff;font-size:20px;cursor:pointer}.wr-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px;background:#fffaf4;border-bottom:1px solid rgba(20,20,20,.08)}.wr-tab{height:40px;border-radius:999px;border:1px solid rgba(20,20,20,.1);background:#fff;color:#565656;font-weight:800;font-size:13px;cursor:pointer}.wr-tab.active{background:#141414;color:#fff;border-color:#141414;box-shadow:0 8px 22px rgba(20,20,20,.12)}.wr-view{min-height:0;display:none;overflow:auto;padding:16px;background:#fffaf4}.wr-view.active{display:block}.wr-chat-log{display:flex;flex-direction:column;gap:12px}.wr-row{display:flex;gap:9px;align-items:flex-start}.wr-avatar{width:27px;height:27px;border-radius:9px;background:#141414;color:#fff;display:grid;place-items:center;font-weight:900;font-size:12px;flex:0 0 auto}.wr-msg{max-width:86%;border-radius:18px;padding:11px 12px;font-size:14px;line-height:1.45;white-space:pre-wrap}.wr-msg.bot{background:#fff;border:1px solid rgba(20,20,20,.1);box-shadow:0 8px 22px rgba(20,20,20,.04);border-top-left-radius:7px;color:#1b1b1b}.wr-msg.user{align-self:flex-end;background:var(--accent);color:#fff;font-weight:650;border-bottom-right-radius:7px}.wr-compose{display:flex;gap:8px;align-items:center;padding:12px;background:#fff;border-top:1px solid rgba(20,20,20,.08)}.wr-input{flex:1;min-width:0;height:46px;border-radius:999px;border:1px solid rgba(20,20,20,.14);background:#fff;color:#171717;padding:0 15px;outline:none;font-size:14px}.wr-input:focus{border-color:var(--accent);box-shadow:0 0 0 4px rgba(255,87,34,.12)}.wr-send{width:46px;height:46px;border:0;border-radius:999px;background:var(--accent);color:#fff;display:grid;place-items:center;cursor:pointer;flex:0 0 auto}.wr-send svg{width:18px;height:18px}.wr-card{border:1px solid rgba(20,20,20,.1);background:#fff;border-radius:22px;padding:18px;box-shadow:0 12px 34px rgba(20,20,20,.06);margin-bottom:16px}.wr-card h4{font-size:21px;letter-spacing:-.04em;margin:0 0 7px;font-weight:850}.wr-card p{font-size:14px;line-height:1.5;color:#666;margin:0}.wr-voice{min-height:365px;display:grid;place-items:center;text-align:center}.wr-orb{width:126px;height:126px;border-radius:999px;background:radial-gradient(circle at 35% 28%,#fff,#ff9a78 28%,#ff5722 58%,#8b240c 100%);margin:0 auto 22px;box-shadow:0 0 0 12px rgba(255,87,34,.08),0 28px 70px rgba(255,87,34,.25)}.wr-orb.live{animation:wrPulse .9s infinite alternate ease-in-out}@keyframes wrPulse{from{transform:scale(.97);box-shadow:0 0 0 10px rgba(255,87,34,.08),0 22px 60px rgba(255,87,34,.22)}to{transform:scale(1.04);box-shadow:0 0 0 20px rgba(255,87,34,.06),0 35px 90px rgba(255,87,34,.38)}}.wr-status{font-weight:900;font-size:16px}.wr-note{color:#777;font-size:13px;line-height:1.4;margin:7px 0 0}.wr-primary,.wr-secondary{width:100%;height:48px;border-radius:999px;font-weight:900;cursor:pointer;margin-top:14px;font:inherit}.wr-primary{border:0;background:#141414;color:#fff}.wr-secondary{border:1px solid rgba(20,20,20,.12);background:#fff;color:#141414}.wr-toast{position:absolute;left:14px;right:14px;bottom:72px;background:#141414;color:#fff;border-radius:15px;padding:12px;font-size:13px;display:none}.wr-toast.show{display:block}@media(max-width:520px){.wr-ai{right:12px;bottom:12px}.wr-panel{width:calc(100vw - 24px);height:calc(100vh - 24px);border-radius:24px}.wr-fab small{display:none}}
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.className = "wr-ai";
  root.innerHTML = `
    <button class="wr-fab" aria-label="Open Rose assistant"><span class="wr-dot"><img src="/logos/wildrose.png" alt="" loading="lazy"></span><span><strong>Ask ${cfg.title}</strong><small>Website pricing & timelines</small></span></button>
    <section class="wr-panel" aria-label="${cfg.title}">
      <header class="wr-head"><div class="wr-top"><div class="wr-brand"><div class="wr-mark"><img src="/logos/wildrose.png" alt="Wildrose" loading="lazy"></div><div class="wr-title"><div class="wr-kicker">Wildrose Automations</div><h3>${cfg.title}</h3><p>Websites, pricing, timelines, and automation questions.</p></div></div><button class="wr-close" aria-label="Close">×</button></div></header>
      <div class="wr-tabs" role="tablist"><button class="wr-tab active" data-view="chat">Chat</button><button class="wr-tab" data-view="voice">Voice</button></div>
      <main class="wr-view active" data-view="chat"><div class="wr-chat-log"><div class="wr-row"><div class="wr-avatar">R</div><div class="wr-msg bot">Hey — tell me what you’re trying to build and I’ll point you in the right direction.</div></div></div></main>
      <main class="wr-view" data-view="voice"><div class="wr-card"><h4>Talk to Rose</h4><p>Say what you need built and get a straight answer.</p></div><div class="wr-voice"><div><div class="wr-orb"></div><div class="wr-status">Ready when you are</div><div class="wr-note">Your browser may ask for microphone access.</div><button class="wr-primary wr-start-voice">Start talking</button><button class="wr-secondary wr-end-voice" style="display:none">End</button></div></div></main>
      <div class="wr-compose"><input class="wr-input" placeholder="Ask about websites, pricing, timelines…"><button class="wr-send" aria-label="Send"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12h12M12 7l5 5-5 5" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div><div class="wr-toast"></div>
    </section>`;
  document.body.appendChild(root);

  const $ = sel => root.querySelector(sel), $$ = sel => Array.from(root.querySelectorAll(sel));
  const panel = $(".wr-panel"), fab = $(".wr-fab"), input = $(".wr-input"), log = $(".wr-chat-log"), toast = $(".wr-toast");
  let chatId = null, retellClient = null;
  function voiceVisitorId() {
    const key = "rose-voice-visitor";
    try {
      let id = localStorage.getItem(key);
      if (!id || !/^[a-f0-9-]{20,80}$/i.test(id)) {
        id = crypto.randomUUID();
        localStorage.setItem(key, id);
      }
      return id;
    } catch { return crypto.randomUUID(); }
  }
  fab.addEventListener("click", () => { setView("voice"); panel.classList.add("open"); fab.style.display = "none"; });
  $(".wr-close").addEventListener("click", () => { panel.classList.remove("open"); fab.style.display = "flex"; });
  $$(".wr-tab").forEach(t => t.addEventListener("click", () => setView(t.dataset.view)));
  function setView(view){ $$(".wr-tab").forEach(t=>t.classList.toggle("active",t.dataset.view===view)); $$(".wr-view").forEach(v=>v.classList.toggle("active",v.dataset.view===view)); $(".wr-compose").style.display = view === "chat" ? "flex" : "none"; }
  setView("voice");
  function addMsg(role, text){ if(role === "bot"){ const row=document.createElement("div"); row.className="wr-row"; row.innerHTML='<div class="wr-avatar">R</div>'; const bubble=document.createElement("div"); bubble.className="wr-msg bot"; bubble.textContent=text; row.appendChild(bubble); log.appendChild(row); log.parentElement.scrollTop=log.parentElement.scrollHeight; return bubble; } const el=document.createElement("div"); el.className="wr-msg user"; el.textContent=text; log.appendChild(el); log.parentElement.scrollTop=log.parentElement.scrollHeight; return el; }
  // Keep guidance on the host page; only the visitor can activate a control or link.
  const guideKey = "rose-direct-guide:" + location.origin;
  const blockedPath = () => /^\/(?:account|admin|cart|checkout|checkouts|orders|password)(?:\/|$)/i.test(location.pathname);
  const wordsOf = value => String(value || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(" ").filter(Boolean);
  const labelOf = element => String(element.getAttribute("aria-label") || [...(element.labels || [])].map(label => label.textContent).join(" ") || element.textContent || element.getAttribute("title") || element.getAttribute("placeholder") || "").replace(/\s+/g, " ").trim().slice(0, 100);
  const visible = element => !!element && !root.contains(element) && !element.disabled && !element.closest('[hidden],[aria-hidden="true"],[inert]') && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden";
  const safe = element => !/\b(?:password|payment|credit|card number|checkout|purchase|place order|confirm order|pay|delete|remove|unsubscribe|subscribe|consent|privacy|login|logout|sign in|sign out|sign up|register|email|phone|address|book|reserve|upload|send)\b/i.test(`${labelOf(element)} ${element.name || ""} ${element.id || ""} ${element.closest("form")?.action || ""}`);
  const safeLink = element => { try { const url = new URL(element.href, location.href); return /^https?:$/.test(url.protocol) && url.origin === location.origin && !/^\/(?:admin|cart|checkout|checkouts|orders|password)(?:\/|$)/i.test(url.pathname); } catch { return false; } };
  const guideWords = query => wordsOf(query).map(word => ({ invoices:"invoice", payments:"payment", subscriptions:"subscription" })[word] || word).filter(word => word.length > 1 && !new Set(["the","a","an","button","link","field","section","selector","option","on","this","page","please","to","my","your","choose","change","set","find","show","me","where","is","about","info","information","how","do","can","i","take","go","open","site","website"]).has(word));
  const matchesWord = (parts, word) => parts.some(part => part === word || part.startsWith(word));
  let spotlight = null;
  function clearGlow(){ if(!spotlight) return; cancelAnimationFrame(spotlight.frame); spotlight.layer.remove(); spotlight = null; }
  function glow(element, label){
    clearGlow();
    const layer = document.createElement("div");
    layer.className = "rose-direct-spotlight";
    layer.dataset.roseTarget = label;
    layer.setAttribute("aria-hidden", "true");
    document.body.appendChild(layer);
    const state = {layer, element, frame:0}; spotlight = state;
    const update = () => {
      if(spotlight !== state) return;
      if(!element.isConnected || !visible(element)){ clearGlow(); return; }
      const rect = element.getBoundingClientRect();
      Object.assign(layer.style,{left:`${rect.left-4}px`,top:`${rect.top-4}px`,width:`${rect.width+8}px`,height:`${rect.height+8}px`,borderRadius:`${Math.max(6,(parseFloat(getComputedStyle(element).borderTopLeftRadius)||0)+4)}px`});
      state.frame = requestAnimationFrame(update);
    };
    element.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",block:"center",inline:"nearest"});
    update();
  }
  const glowStyle = document.createElement("style");
  glowStyle.textContent = '@property --rose-orbit-angle{syntax:"<angle>";initial-value:0deg;inherits:true}.rose-direct-spotlight{--rose-orbit-angle:0deg;position:fixed;z-index:2147482999;pointer-events:none;box-sizing:border-box;border:1px solid rgba(255,139,91,.28);box-shadow:0 0 12px 2px rgba(255,120,61,.1)}.rose-direct-spotlight::before,.rose-direct-spotlight::after{content:"";position:absolute;inset:-1px;border-radius:inherit;padding:2px;background:conic-gradient(from var(--rose-orbit-angle),rgba(255,106,53,.12) 0deg,rgba(255,125,68,.3) 65deg,#ff934f 110deg,#ffe4b8 142deg,#ffb66e 160deg,rgba(255,111,57,.2) 205deg,rgba(255,111,57,.12) 245deg,#ffad77 290deg,rgba(255,120,61,.45) 315deg,rgba(255,106,53,.12) 360deg);mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);mask-composite:exclude;pointer-events:none}.rose-direct-spotlight::before{inset:-4px;padding:6px;filter:blur(5px);opacity:.85}.rose-direct-spotlight{animation:roseDirectOrbit 3.6s linear infinite}@keyframes roseDirectOrbit{to{--rose-orbit-angle:360deg}}@media(prefers-reduced-motion:reduce){.rose-direct-spotlight{animation:none;--rose-orbit-angle:135deg}}';
  document.head.appendChild(glowStyle);
  function controlMatches(query){
    if(blockedPath()) return [];
    const words = guideWords(query); if(!words.length) return [];
    return [...document.querySelectorAll('a[href],button,select,input:not([type="hidden"]):not([type="password"]):not([type="email"]):not([type="tel"]):not([type="submit"]),[role="button"],[role="tab"],summary,h1,h2,h3')]
      .filter(element => visible(element) && safe(element) && (!element.matches('a[href]') || safeLink(element)))
      .map(element => { const label=labelOf(element), parts=wordsOf(label); return {element,label,score:words.every(word=>matchesWord(parts,word)) ? 30+words.length*10-parts.length+(element.matches('h1,h2,h3')?5:0) : 0}; })
      .filter(item=>item.score>0).sort((a,b)=>b.score-a.score);
  }
  function contentMatches(query){
    if(blockedPath()) return [];
    const words=guideWords(query); if(!words.length) return [];
    const candidates=new Map();
    for(const element of [...document.querySelectorAll('h1,h2,h3,section,article,main,p,div')].slice(0,500)){
      if(!visible(element) || element.closest('form,dialog,[role="dialog"]')) continue;
      const heading=element.matches('h1,h2,h3') ? element : element.tagName==='DIV' ? element.querySelector(':scope > h1,:scope > h2,:scope > h3') : element.querySelector('h1,h2,h3');
      if(element.tagName==='DIV' && !heading) continue;
      if(heading && (!visible(heading) || !safe(heading))) continue;
      if(!heading && !safe(element)) continue;
      const content=String(element.textContent||'').replace(/\s+/g,' ').trim(); if(!content || content.length>3200) continue;
      const bodyParts=wordsOf(content), headingParts=wordsOf(heading ? labelOf(heading) : '');
      const bodyCount=words.filter(word=>matchesWord(bodyParts,word)).length; if(!bodyCount) continue;
      const headingCount=words.filter(word=>matchesWord(headingParts,word)).length;
      const target=heading && headingCount ? heading : element;
      const label=heading ? labelOf(heading) : content.slice(0,80);
      if(/\b(?:password|payment|checkout|delete|remove|credit card|place order|confirm order)\b/i.test(label)) continue;
      const score=bodyCount*20+headingCount*8+(heading?3:0)-Math.min(8,Math.floor(content.length/350));
      if(!candidates.has(target) || candidates.get(target).score<score) candidates.set(target,{element:target,label,score});
    }
    return [...candidates.values()].sort((a,b)=>b.score-a.score);
  }
  function closestHeadings(query){ const words=guideWords(query); return [...document.querySelectorAll('h1,h2,h3')].filter(element=>visible(element)&&safe(element)).map(element=>({label:labelOf(element),score:words.filter(word=>matchesWord(wordsOf(labelOf(element)),word)).length})).filter(item=>item.label).sort((a,b)=>b.score-a.score).slice(0,2).map(item=>item.label); }
  function guideFind(query){
    if(/\b(?:password|payment|credit|checkout|purchase|delete|remove|pay|login|sign in|email|phone|address|book|reserve|upload|send)\b/i.test(query) || blockedPath()) return `I can't highlight that on this page.`;
    const controls=controlMatches(query), matches=controls.length?controls:contentMatches(query);
    if(!matches.length){const headings=closestHeadings(query); return `I couldn't find ${query.slice(0,80)} on this page.${headings.length?` Closest sections: ${headings.join(' or ')}.`:''}`;}
    if(matches[1]?.score===matches[0].score) return `I found several matches for ${query.slice(0,80)}. Please be more specific.`;
    glow(matches[0].element,matches[0].label); return `I highlighted ${matches[0].label}.`;
  }
  function invoiceGoal(message){
    const direct=/^(?:please\s+)?(?:find|show me|take me to)\s+(?:my\s+|the\s+)?(.+?)[?.!]*$/i.exec(message);
    const how=/^(?:how (?:do|can) i|help me|show me how to|where (?:do|can) i)\s+(.+?)[?.!]*$/i.exec(message);
    const goal=(how?.[1] || direct?.[1] || '').replace(/^(?:find|show me|take me to)\s+(?:my\s+|the\s+)?/i,'').replace(/\binvoices\b/ig,'invoice').trim();
    return /\b(?:invoice|billing|payment|subscription)\b/i.test(goal) ? goal.slice(0,120) : null;
  }
  function routeMatches(goal){
    const hints=/\b(?:invoice|billing|payment|subscription)\b/i.test(goal)?['billing','subscription','settings','account']:[];
    return [...document.querySelectorAll('button[aria-controls],button[aria-expanded],button[aria-haspopup],summary,[role="tab"],a[href]')]
      .filter(element=>visible(element)&&safe(element)&&element.getAttribute('aria-expanded')!=='true'&&element.getAttribute('aria-selected')!=='true'&&(!element.matches('a[href]')||safeLink(element)))
      .map(element=>({element,label:labelOf(element),score:hints.reduce((best,hint,index)=>Math.max(best,wordsOf(labelOf(element)).includes(hint)?20-index*3:0),0)}))
      .filter(item=>item.score>0).sort((a,b)=>b.score-a.score);
  }
  let activeGoal=null;
  function saveGoal(goal){ try { goal ? sessionStorage.setItem(guideKey,JSON.stringify({goal,at:Date.now()})) : sessionStorage.removeItem(guideKey); } catch {} }
  function guideTask(goal){
    activeGoal=goal;
    const targets=controlMatches(goal);
    if(targets.length && targets[1]?.score!==targets[0].score){ saveGoal(null); activeGoal=null; glow(targets[0].element,targets[0].label); return `I highlighted ${targets[0].label}.`; }
    const routes=routeMatches(goal);
    if(!routes.length) {saveGoal(null);activeGoal=null;return `I couldn't find the next step for ${goal} on this page.`;}
    if(routes[1]?.score===routes[0].score) return 'I found several possible routes. Please be more specific.';
    const route=routes[0]; glow(route.element,route.label); saveGoal(goal);
    route.element.addEventListener('click',()=>setTimeout(()=>{if(activeGoal!==goal)return;if(route.element.matches('a[href]'))return;const reply=guideTask(goal);addMsg('bot',reply);},180),{once:true});
    return `Open ${route.label}.`;
  }
  function guideProfile(){
    if(blockedPath()) return "I can't guide that on this page.";
    const opener=controlMatches('update profile').find(item=>item.element.matches('button,[role="button"],a[href]'));
    if(!opener) return "I couldn't find the profile control on this page.";
    glow(opener.element,opener.label);
    opener.element.addEventListener('click',()=>setTimeout(()=>{
      const field=[...document.querySelectorAll('input:not([type="hidden"]),textarea')].find(element=>visible(element)&&safe(element)&&/display name/i.test(labelOf(element)));
      if(!field) return;
      glow(field,labelOf(field));addMsg('bot',`Choose ${labelOf(field)}.`);
      field.addEventListener('change',()=>{
        const save=[...document.querySelectorAll('button,[type="submit"]')].find(element=>visible(element)&&safe(element)&&/save profile/i.test(labelOf(element)));
        if(save){glow(save,labelOf(save));addMsg('bot',`Choose ${labelOf(save)} when you're ready.`);}
      },{once:true});
    },180),{once:true});
    return `Open ${opener.label}.`;
  }
  function guideCheapest(){
    if(blockedPath()) return "I can't compare products on this page.";
    const candidates=[...document.querySelectorAll('[data-component-type="s-search-result"],[itemtype*="Product"],.product-card,.product-item,article')].filter(visible).flatMap(card=>{
      const link=[...card.querySelectorAll('a[href]')].find(element=>visible(element)&&safe(element)&&safeLink(element)&&labelOf(element));
      const priceText=card.querySelector('.a-price .a-offscreen,[itemprop="price"],.price,.product-price')?.textContent||'';
      const price=Number(String(priceText).replace(/[^0-9.]/g,''));
      return link&&Number.isFinite(price)&&price>0?[{element:link,label:labelOf(link),price}]:[];
    }).sort((a,b)=>a.price-b.price);
    if(!candidates.length) return "I couldn't find comparable product prices on this page.";
    if(candidates[1]?.price===candidates[0].price) return "I found several products at the lowest price. Please be more specific.";
    glow(candidates[0].element,candidates[0].label);return `I highlighted ${candidates[0].label} at ${candidates[0].price.toFixed(2)}.`;
  }
  try { const saved=JSON.parse(sessionStorage.getItem(guideKey)||'null'); if(saved?.goal && Date.now()-saved.at<120000) setTimeout(()=>{setView('chat');panel.classList.add('open');fab.style.display='none';addMsg('bot',guideTask(saved.goal));},350); else saveGoal(null); } catch {}
  function handleGuide(message){
    if(/^(?:how (?:do|can) i|help me)\s+update (?:my\s+)?profile[?.!]*$/i.test(message)) return guideProfile();
    if(/\b(?:cheapest|lowest price|least expensive)\b/i.test(message)&&/\b(?:product|item)\b/i.test(message)) return guideCheapest();
    const task=invoiceGoal(message); if(task) return guideTask(task);
    const intent=/^(?:please\s+)?(?:show me where|show me|highlight|point me to|point to|where is|find)\s+(.+?)[?.!]*$/i.exec(message);
    return intent ? guideFind(intent[1]) : null;
  }
  async function api(path, body){ const r=await fetch(cfg.apiBase + path,{method:"POST",headers:{"Content-Type":"application/json","bypass-tunnel-reminder":"1"},body:JSON.stringify(body||{})}); const data=await r.json().catch(()=>({})); if(!r.ok) throw new Error(data.error||"Request failed"); return data; }
  async function ensureChat(){ if(chatId) return chatId; const data=await api("/api/chat/start",{page:location.href}); chatId=data.chatId; return chatId; }
  async function submitChat(){ const content=input.value.trim(); if(!content) return; input.value=""; addMsg("user",content); const guided=handleGuide(content); if(guided){addMsg("bot",guided);return;} const pending=addMsg("bot","Thinking…"); try{ const id=await ensureChat(); const data=await api("/api/chat/message",{chatId:id,content}); pending.textContent=data.reply || "I can help with that."; if(/\b(?:what are your hours|what are the hours|when are you open|what time are you open)\b/i.test(content)){const matches=contentMatches("hours");if(matches.length&&matches[0].score!==matches[1]?.score) glow(matches[0].element,matches[0].label);} }catch(e){ pending.textContent="I hit a connection issue. Please try again or email jack@wildroseautomations.ca."; console.error(e); } }
  $(".wr-send").addEventListener("click",submitChat); input.addEventListener("keydown",e=>{ if(e.key==="Enter") submitChat(); });
  $(".wr-start-voice").addEventListener("click", async () => { const status=$(".wr-status"), note=$(".wr-note"), orb=$(".wr-orb"); try { status.textContent="Connecting…"; const [{ RetellClient }, { RoseV3VoiceClient }, call] = await Promise.all([import("https://esm.sh/retell-client-js-sdk@3.0.4"), import(`${String(cfg.apiBase || "").replace(/\/+$/, "")}/api/voice/start?module=voice`), api("/api/voice/start", { retellClientVersion: 3, page:location.href,voiceVisitorId:voiceVisitorId()})]); retellClient = new RoseV3VoiceClient(RetellClient, cfg.apiBase); let speechReleaseTimer=null; const clearSpeechRelease=()=>{ if(speechReleaseTimer) clearTimeout(speechReleaseTimer); speechReleaseTimer=null; }; const setRoseSpeaking=()=>{ clearSpeechRelease(); status.textContent="Rose is answering"; orb.classList.add("live","speaking"); $(".wr-voice").classList.add("speaking"); }; const easeBackToListening=()=>{ clearSpeechRelease(); speechReleaseTimer=setTimeout(()=>{ status.textContent="Live with Rose"; orb.classList.remove("speaking"); $(".wr-voice").classList.remove("speaking"); },1150); }; retellClient.on("call_started",()=>{ clearSpeechRelease(); status.textContent="Live with Rose"; note.textContent="Speak naturally. Interrupt anytime."; orb.classList.add("live"); orb.classList.remove("speaking"); $(".wr-voice").classList.remove("speaking"); $(".wr-start-voice").style.display="none"; $(".wr-end-voice").style.display="block"; }); retellClient.on("agent_start_talking",setRoseSpeaking); retellClient.on("agent_stop_talking",easeBackToListening); retellClient.on("user_start_talking",()=>{ clearSpeechRelease(); status.textContent="Listening…"; orb.classList.remove("speaking"); $(".wr-voice").classList.remove("speaking"); }); retellClient.on("call_ended",()=>{ clearSpeechRelease(); status.textContent="Call ended"; note.textContent="Start another conversation anytime."; orb.classList.remove("live","speaking"); $(".wr-voice").classList.remove("speaking"); $(".wr-start-voice").style.display="block"; $(".wr-end-voice").style.display="none"; }); retellClient.on("error",(err)=>{ clearSpeechRelease(); console.error(err); status.textContent="Voice connection failed"; note.textContent="Please check microphone permission or use chat."; orb.classList.remove("live","speaking"); $(".wr-voice").classList.remove("speaking"); }); await retellClient.startCall({ accessToken: call.accessToken, callId: call.callId, transport: call.transport, iceServers: call.ice_servers, monitorToken: call.monitorToken, emitRawAudioSamples: true }); } catch(err){ console.error(err); status.textContent="Voice unavailable"; note.textContent="Please use chat for now."; } });
  $(".wr-end-voice").addEventListener("click",()=>{ try{ retellClient?.stopCall(); }catch{} });
})();
