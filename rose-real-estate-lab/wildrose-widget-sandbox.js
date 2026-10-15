(() => {
  const script = document.currentScript;
  const cfg = {
    apiBase: script?.dataset.apiBase || "",
    title: script?.dataset.title || "Rose",
    businessName: script?.dataset.businessName || script?.dataset.company || "Wildrose Automations",
    accent: script?.dataset.accent || "#ff5722",
    logo: script?.dataset.logo || "/logos/wildrose.png",
    ownerEmail: script?.dataset.ownerEmail || script?.dataset.leadEmail || script?.dataset.notificationEmail || "",
    fallbackUrl: script?.dataset.fallbackUrl || "",
    businessId: script?.dataset.businessId || script?.dataset.clientId || "",
    mount: script?.dataset.mount || "",
    inline: script?.dataset.inline === "true",
    contained: script?.dataset.contained === "true",
    subtitle: script?.dataset.subtitle || "AI intake assistant",
    greeting: script?.dataset.greeting || "Tell me what you want automated and I’ll turn it into a clear next step.",
    placeholder: script?.dataset.placeholder || "Ask Rose…",
    website: script?.dataset.website || "",
    businessContext: script?.dataset.businessContext || "",
    services: script?.dataset.services || "",
    defaultView: script?.dataset.defaultView || (script?.dataset.inline === "true" ? "chat" : "voice"),
    shopping: script?.dataset.shopping !== "false",
  };
  const widgetOptions = { navigation: true, autoOpen: true, productSuggestions: true, cartActions: script?.dataset.cartActions !== "false", voiceNavigation: true, siteControls: true };
  const settingsReady = cfg.apiBase && cfg.businessId ? fetch(`${cfg.apiBase}/api/rose-public-config?businessId=${encodeURIComponent(cfg.businessId)}`)
    .then(response => response.ok ? response.json() : null)
    .then(data => {
      const appearance = data?.config?.appearance || {};
      const saved = data?.config?.settings || {};
      for (const [key, field] of Object.entries({ navigation: "widgetNavigation", autoOpen: "widgetAutoOpen", productSuggestions: "widgetProductSuggestions", cartActions: "widgetCartActions", voiceNavigation: "widgetVoiceNavigation", siteControls: "widgetSiteControls" })) {
        if (typeof saved[field] === "boolean") widgetOptions[key] = saved[field];
      }
      cfg.shopping = cfg.shopping && widgetOptions.productSuggestions;
      if (data?.config?.status === "published") {
        cfg.businessName = String(saved.businessName || cfg.businessName).slice(0, 120);
        const assistantName = String(appearance.assistantName || cfg.title).slice(0, 80);
        const subtitle = String(appearance.greetingMessage || "").trim();
        cfg.title = assistantName;
        root.querySelector(".wr-title h3").textContent = assistantName;
        if (subtitle && subtitle !== "AI intake assistant") root.querySelector(".wr-title small").textContent = subtitle.slice(0, 100);
        const greeting = String(saved.assistantIntro || (subtitle && subtitle !== "AI intake assistant" ? subtitle : `Hi, I'm ${assistantName}. How can I help you with ${cfg.businessName}?`)).slice(0, 400);
        const initialGreeting = root.querySelector(".wr-chat-log .wr-msg.bot");
        if (initialGreeting?.textContent === cfg.greeting) initialGreeting.textContent = greeting;
        if (/^#[0-9a-f]{6}$/i.test(appearance.brandPrimary || "")) root.style.setProperty("--accent", appearance.brandPrimary);
        try {
          const logo = new URL(appearance.avatarUrl);
          if (logo.protocol === "https:") root.querySelectorAll("img").forEach(img => { img.src = logo.href; });
        } catch {}
      }
      if (!widgetOptions.cartActions) root.querySelectorAll(".wr-product-actions button").forEach(button => button.remove());
      if (!widgetOptions.navigation) root.querySelectorAll('[data-rose-page-results="true"]').forEach(list => list.remove());
    }).catch(() => {}) : Promise.resolve();
  const fallbackHref = /^https:\/\//i.test(cfg.fallbackUrl) || /^mailto:[^\s@]+@[^\s@]+$/i.test(cfg.fallbackUrl)
    ? cfg.fallbackUrl
    : /^[^\s@]+@[^\s@]+$/.test(cfg.ownerEmail) ? `mailto:${cfg.ownerEmail}` : "";

  const css = `
    .wr-ai,.wr-ai *{box-sizing:border-box}
    .wr-ai{
      --accent:${cfg.accent};
      --accent-soft:color-mix(in srgb,var(--accent) 32%,white);
      --glass:rgba(255,255,255,.34);
      --glass-strong:rgba(255,255,255,.56);
      --ink:#18120f;
      --muted:#554b45;
      position:fixed;right:22px;bottom:22px;z-index:2147483000;
      font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif;
      color:var(--ink);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;
    }
    .wr-ai.inline{position:relative;right:auto;bottom:auto;width:min(430px,100%);margin:0 auto;z-index:3}.wr-ai.inline:before{right:50%;bottom:50%;transform:translate(50%,50%);width:280px;height:280px}.wr-ai.inline .wr-fab{display:none!important}.wr-ai.inline .wr-close{display:none}.wr-ai.inline .wr-panel{position:relative;right:auto;bottom:auto;display:grid;width:100%;height:560px}.wr-ai.inline .wr-panel.open{display:grid;animation:none}.wr-ai.contained{position:absolute;right:18px;bottom:18px;z-index:20}.wr-ai.contained .wr-panel{width:min(390px,calc(100vw - 52px));height:min(570px,calc(100vh - 110px))}@media (max-width:720px){.wr-ai.contained{right:12px;bottom:12px}.wr-ai.contained .wr-panel{width:min(360px,calc(100vw - 36px));height:min(560px,calc(100vh - 92px))}}
    .wr-ai:before{content:"";position:absolute;right:-26px;bottom:-26px;width:176px;height:176px;border-radius:50%;background:radial-gradient(circle,rgba(255,87,34,.28),rgba(255,87,34,0) 68%);filter:blur(10px);pointer-events:none;opacity:.9}
    .wr-fab{width:76px;height:76px;border:0;padding:0;border-radius:28px;display:grid;place-items:center;cursor:pointer;background:linear-gradient(145deg,rgba(255,255,255,.66),rgba(255,255,255,.22));box-shadow:0 26px 70px rgba(34,20,14,.24),0 0 0 1px rgba(255,255,255,.55),inset 0 1px 0 rgba(255,255,255,.95),inset 0 -1px 0 rgba(255,255,255,.24);backdrop-filter:blur(34px) saturate(1.55);-webkit-backdrop-filter:blur(34px) saturate(1.55);transition:transform .22s cubic-bezier(.2,.8,.2,1),box-shadow .22s ease,filter .22s ease;position:relative;overflow:hidden}
    .wr-fab:before{content:"";position:absolute;inset:0;border-radius:inherit;background:linear-gradient(135deg,rgba(255,255,255,.92),rgba(255,255,255,0) 38%,rgba(255,87,34,.18) 100%);mix-blend-mode:screen;pointer-events:none}
    .wr-fab:after{content:"";position:absolute;inset:9px;border-radius:22px;border:1px solid rgba(255,255,255,.42);pointer-events:none}
    .wr-fab:hover{transform:translateY(-4px) scale(1.035);box-shadow:0 34px 86px rgba(34,20,14,.30),0 0 0 1px rgba(255,255,255,.70),0 0 36px rgba(255,87,34,.18),inset 0 1px 0 rgba(255,255,255,.98)}
    .wr-dot{width:56px;height:56px;border-radius:20px;display:grid;place-items:center;background:linear-gradient(145deg,rgba(255,255,255,.72),rgba(255,255,255,.26));box-shadow:inset 0 1px 0 rgba(255,255,255,.82),0 12px 30px rgba(36,20,12,.15);overflow:hidden;position:relative}.wr-dot img{width:92%;height:92%;object-fit:contain;filter:drop-shadow(0 5px 12px rgba(0,0,0,.14))}
    .wr-panel{position:absolute;right:0;bottom:0;width:min(382px,calc(100vw - 24px));height:min(578px,calc(100vh - 24px));display:none;grid-template-rows:auto auto 1fr auto;overflow:hidden;border-radius:38px;background:linear-gradient(145deg,#fffefd,#fff6f0 46%,#ffeae0);border:1px solid rgba(255,255,255,.75);box-shadow:0 34px 110px rgba(29,18,12,.28),0 0 0 1px rgba(255,255,255,.28),inset 0 1px 0 rgba(255,255,255,.92),inset 0 -1px 0 rgba(255,255,255,.20);backdrop-filter:blur(44px) saturate(1.8);-webkit-backdrop-filter:blur(44px) saturate(1.8)}
    .wr-panel:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 12% 0%,rgba(255,255,255,.88),transparent 30%),radial-gradient(circle at 92% 10%,rgba(255,87,34,.26),transparent 34%),linear-gradient(160deg,rgba(255,255,255,.38),transparent 45%);pointer-events:none}.wr-panel:after{content:"";position:absolute;inset:1px;border-radius:37px;border:1px solid rgba(255,255,255,.40);pointer-events:none}.wr-panel.open{display:grid;animation:wrGlassIn .28s cubic-bezier(.18,.9,.2,1)}@keyframes wrGlassIn{from{opacity:0;transform:translateY(18px) scale(.972);filter:blur(3px)}to{opacity:1;transform:none;filter:none}}
    .wr-head,.wr-tabs,.wr-compose{position:relative;z-index:1}.wr-head{padding:17px 17px 12px}.wr-top{display:flex;align-items:center;justify-content:space-between;gap:12px}.wr-brand{display:flex;align-items:center;gap:11px}.wr-mark{width:44px;height:44px;border-radius:16px;background:linear-gradient(145deg,rgba(255,255,255,.68),rgba(255,255,255,.24));display:grid;place-items:center;box-shadow:inset 0 1px 0 rgba(255,255,255,.82),0 12px 28px rgba(36,20,12,.13);overflow:hidden}.wr-mark img{width:88%;height:88%;object-fit:contain;filter:drop-shadow(0 4px 9px rgba(0,0,0,.12))}.wr-title h3{margin:0;font-size:17px;font-weight:850;letter-spacing:-.035em}.wr-title small{display:block;margin-top:1px;color:var(--muted);font-size:12px;font-weight:650}.wr-close{width:36px;height:36px;border:1px solid rgba(255,255,255,.46);border-radius:14px;background:rgba(255,255,255,.28);color:rgba(24,18,15,.72);font-size:21px;line-height:1;cursor:pointer;backdrop-filter:blur(16px);transition:.16s ease}.wr-close:hover{background:rgba(255,255,255,.48);color:#160f0c;transform:scale(1.04)}
    .wr-tabs{margin:0 17px 12px;padding:4px;border-radius:18px;background:rgba(255,255,255,.26);border:1px solid rgba(255,255,255,.42);display:grid;grid-template-columns:1fr 1fr;gap:4px;box-shadow:inset 0 1px 0 rgba(255,255,255,.50)}.wr-tab{height:38px;border:0;border-radius:14px;background:transparent;color:rgba(24,18,15,.54);font-weight:780;cursor:pointer;transition:.18s ease}.wr-tab.active{background:rgba(255,255,255,.62);color:#18120f;box-shadow:0 10px 24px rgba(28,18,12,.10),inset 0 1px 0 rgba(255,255,255,.82)}
    .wr-view{position:relative;z-index:1;display:none;min-height:0;overflow:auto;padding:0 17px 14px}.wr-view.active{display:block}.wr-chat-log{display:flex;flex-direction:column;gap:10px;padding:2px 0 10px}.wr-row{display:flex;align-items:flex-end;gap:8px}.wr-avatar{width:28px;height:28px;border-radius:11px;background:linear-gradient(145deg,rgba(255,104,45,.9),rgba(255,87,34,.58));display:grid;place-items:center;overflow:hidden;flex:0 0 auto}.wr-avatar img{width:78%;height:78%;object-fit:contain}.wr-dot[data-logo-fallback="true"]::before,.wr-mark[data-logo-fallback="true"]::before,.wr-avatar[data-logo-fallback="true"]::before{content:"✦";font-weight:950;color:var(--accent);font-size:22px}.wr-avatar[data-logo-fallback="true"]::before{color:#fff;font-size:15px}.wr-msg{max-width:86%;padding:11px 13px;border-radius:18px;font-size:14px;line-height:1.45;white-space:pre-wrap;box-shadow:0 10px 26px rgba(28,18,12,.08)}.wr-msg.bot{background:rgba(255,255,255,.54);border:1px solid rgba(255,255,255,.56);border-bottom-left-radius:7px}.wr-msg.user{align-self:flex-end;background:linear-gradient(145deg,var(--accent),#ff845d);color:white;border-bottom-right-radius:7px}.wr-products{display:grid;gap:10px;margin:3px 0 8px 36px}.wr-product{display:flex;gap:10px;padding:10px;border-radius:15px;background:#fff;border:1px solid rgba(24,18,15,.12)}.wr-product img{width:54px;height:54px;object-fit:cover;border-radius:9px}.wr-product-info{min-width:0;flex:1}.wr-product-title{font-size:13px;font-weight:800;line-height:1.3}.wr-product-price{font-size:12px;color:var(--muted);margin-top:3px}.wr-product-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:7px}.wr-product-actions a,.wr-product-actions button{border:0;border-radius:9px;background:#f4ece7;color:#4b2417;font-weight:700;font-size:11px;font-family:inherit;padding:7px 9px;cursor:pointer;text-decoration:none}.wr-product-actions button{background:var(--accent);color:white}.wr-product-actions button:disabled{opacity:.55;cursor:wait}
    .wr-commerce-card{display:grid;grid-template-columns:82px minmax(0,1fr);gap:12px;padding:12px;border-radius:20px;border-color:rgba(24,18,15,.08);box-shadow:0 9px 25px rgba(35,20,12,.08);transition:border-color .22s ease,box-shadow .22s ease,transform .22s ease}.wr-commerce-card:hover{transform:translateY(-1px);box-shadow:0 13px 29px rgba(35,20,12,.11)}.wr-product-media{width:82px;height:82px;overflow:hidden;border-radius:14px;background:linear-gradient(145deg,#fff8f2,#f5e4d9);display:grid;place-items:center}.wr-product-media img{display:block;width:100%;height:100%;object-fit:cover;border-radius:0}.wr-product-media-fallback{display:grid;place-items:center;gap:1px;color:#a76f57;text-align:center}.wr-product-media-fallback span{font-size:27px;line-height:1}.wr-product-media-fallback small{font-size:10px;font-weight:750;letter-spacing:.02em}.wr-commerce-card .wr-product-info{display:flex;flex-direction:column;justify-content:center}.wr-commerce-card .wr-product-title{font-size:14px;line-height:1.35;overflow-wrap:anywhere}.wr-commerce-card .wr-product-price{color:#2f211b;font-size:15px;font-weight:850;margin-top:7px}.wr-commerce-card .wr-product-actions{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.35fr);gap:8px;margin-top:0}.wr-commerce-card .wr-product-actions a,.wr-commerce-card .wr-product-actions button{min-height:42px;padding:10px 11px;border-radius:12px;font-size:12px;line-height:1.25;display:flex;align-items:center;justify-content:center;text-align:center}.wr-commerce-card .wr-product-actions a{background:#f6f1ed;color:#3d2d25}.wr-commerce-card .wr-product-actions button{background:var(--accent);color:white;position:relative;transition:background .2s ease,transform .2s ease}.wr-commerce-card .wr-product-actions button:hover:not(:disabled){transform:translateY(-1px)}.wr-commerce-card .wr-product-actions button[data-cart-state="loading"]{opacity:1;padding-left:29px}.wr-commerce-card .wr-product-actions button[data-cart-state="loading"]:before{content:"";position:absolute;left:12px;width:12px;height:12px;border:2px solid rgba(255,255,255,.45);border-top-color:white;border-radius:50%;animation:wrCartSpin .7s linear infinite}.wr-commerce-card .wr-product-actions button[data-cart-state="added"]{background:#24754b;opacity:1;cursor:default}.wr-commerce-card.is-added{border-color:rgba(36,117,75,.38);animation:wrCartAdded .45s ease}.wr-commerce-card .wr-product-actions select{grid-column:1/-1;width:100%;min-height:42px;padding:8px 10px;border:1px solid rgba(24,18,15,.2);border-radius:12px;background:white;font:inherit;color:var(--ink)}.wr-commerce-card .wr-product-actions [data-rose-cart-link="true"]{grid-column:1/-1;background:#eaf4ed;color:#175334;font-weight:800}@keyframes wrCartSpin{to{transform:rotate(1turn)}}@keyframes wrCartAdded{50%{transform:scale(1.018);box-shadow:0 0 0 4px rgba(36,117,75,.12)}}@media (prefers-reduced-motion:reduce){.wr-commerce-card,.wr-commerce-card .wr-product-actions button{transition:none}.wr-commerce-card.is-added,.wr-commerce-card .wr-product-actions button[data-cart-state="loading"]:before{animation:none}}
    .wr-voice{height:100%;min-height:330px;display:grid;place-items:center;text-align:center;padding:18px 12px 26px}.wr-orb{width:164px;height:164px;margin:0 auto 22px;border-radius:50%;background:radial-gradient(circle at 35% 27%,rgba(255,255,255,.95),rgba(255,245,236,.52) 22%,rgba(255,120,66,.36) 48%,rgba(255,87,34,.62) 78%);box-shadow:inset 0 2px 8px rgba(255,255,255,.9),inset 0 -18px 32px rgba(129,44,17,.15),0 24px 74px rgba(255,87,34,.26),0 0 0 1px rgba(255,255,255,.72);position:relative;overflow:hidden;transform-origin:50% 58%}.wr-orb:before{content:"";position:absolute;inset:18px;border-radius:50%;background:radial-gradient(circle at 35% 20%,rgba(255,255,255,.86),transparent 34%);filter:blur(2px)}.wr-orb:after{content:"";position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 20deg,transparent,rgba(255,255,255,.45),transparent,rgba(255,87,34,.25),transparent);animation:wrSpin 6s linear infinite;opacity:.72}@keyframes wrSpin{to{transform:rotate(1turn)}}.wr-orb.live{animation:wrPulse 1.8s ease-in-out infinite}.wr-orb.speaking{animation:wrSpeak 1.05s cubic-bezier(.35,0,.25,1) infinite;box-shadow:inset 0 2px 8px rgba(255,255,255,.9),0 28px 94px rgba(255,87,34,.42),0 0 0 12px rgba(255,87,34,.08)}@keyframes wrPulse{50%{transform:scale(1.035);filter:saturate(1.12)}}@keyframes wrSpeak{0%,100%{transform:translateY(0) scale(1);border-radius:50%}22%{transform:translateY(-5px) scale(1.035,.965);border-radius:48% 52% 47% 53%}48%{transform:translateY(3px) scale(.982,1.026);border-radius:54% 46% 52% 48%}72%{transform:translateY(-2px) scale(1.018,.99);border-radius:49% 51% 55% 45%}}.wr-panel.speaking .wr-status{animation:wrTextBreathe 1.05s ease-in-out infinite}@keyframes wrTextBreathe{50%{opacity:.72;transform:translateY(-1px)}}.wr-status{font-size:23px;font-weight:860;letter-spacing:-.05em;margin-bottom:7px}.wr-note{font-size:13px;color:var(--muted);line-height:1.45;margin-bottom:18px}.wr-primary,.wr-secondary{height:48px;border:0;border-radius:999px;padding:0 22px;font-weight:860;cursor:pointer}.wr-primary{color:white;background:linear-gradient(145deg,var(--accent),#ff7b4e);box-shadow:0 16px 34px rgba(255,87,34,.25),inset 0 1px 0 rgba(255,255,255,.28)}.wr-secondary{background:rgba(255,255,255,.44);border:1px solid rgba(255,255,255,.56);color:#211612}.wr-live-transcript{display:none;margin:18px auto 0;width:min(292px,100%);border-radius:22px;padding:12px;background:rgba(255,255,255,.30);border:1px solid rgba(255,255,255,.48);box-shadow:inset 0 1px 0 rgba(255,255,255,.55);text-align:left}.wr-live-transcript.has-lines{display:block}.wr-live-label{font-size:11px;text-transform:uppercase;letter-spacing:.14em;font-weight:900;color:rgba(24,18,15,.46);margin-bottom:8px}.wr-live-lines{display:flex;flex-direction:column;gap:6px;max-height:96px;overflow:auto}.wr-live-line{font-size:12px;line-height:1.35;color:rgba(24,18,15,.78);padding:7px 9px;border-radius:13px;background:rgba(255,255,255,.34)}.wr-live-line.user{background:rgba(255,87,34,.14);color:#442014}.wr-compose{display:none;align-items:center;gap:8px;margin:0 17px 17px;padding:8px;border-radius:22px;background:rgba(255,255,255,.36);border:1px solid rgba(255,255,255,.52);box-shadow:inset 0 1px 0 rgba(255,255,255,.55)}.wr-input{flex:1;height:38px;border:0;background:transparent;outline:0;color:var(--ink);font-size:14px;padding:0 8px}.wr-input::placeholder{color:rgba(24,18,15,.44)}.wr-send{width:38px;height:38px;border:0;border-radius:15px;background:linear-gradient(145deg,var(--accent),#ff7b4e);color:white;display:grid;place-items:center;cursor:pointer}.wr-send svg{width:18px;height:18px}.wr-toast{position:absolute;left:17px;right:17px;bottom:78px;padding:10px 12px;border-radius:16px;background:rgba(24,18,15,.78);color:white;font-size:12px;text-align:center;opacity:0;transform:translateY(6px);pointer-events:none;transition:.16s ease}.wr-toast.show{opacity:1;transform:none}.wr-fallback{display:inline-block;margin-top:5px;color:#9a3210;font-weight:850;text-decoration:underline;text-underline-offset:2px}
    @media (max-width:520px){.wr-ai{right:12px;bottom:12px}.wr-panel{width:calc(100vw - 24px);height:min(620px,calc(100vh - 24px));border-radius:34px}.wr-fab{width:70px;height:70px;border-radius:25px}.wr-orb{width:146px;height:146px}}
  `;

  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.className = cfg.inline ? "wr-ai inline" : (cfg.contained ? "wr-ai contained" : "wr-ai");
  root.innerHTML = `
    <button class="wr-fab" aria-label="Open Rose assistant"><span class="wr-dot"><img src="${cfg.logo}" alt=""></span></button>
    <section class="wr-panel" aria-label="${cfg.title}">
      <header class="wr-head"><div class="wr-top"><div class="wr-brand"><div class="wr-mark"><img src="${cfg.logo}" alt=""></div><div class="wr-title"><h3>${cfg.title}</h3><small>${cfg.subtitle}</small></div></div><button class="wr-close" aria-label="Close">×</button></div></header>
      <div class="wr-tabs" role="tablist"><button class="wr-tab" data-view="chat">Chat</button><button class="wr-tab active" data-view="voice">Voice</button></div>
      <main class="wr-view" data-view="chat"><div class="wr-chat-log"><div class="wr-row"><div class="wr-avatar"><img src="${cfg.logo}" alt=""></div><div class="wr-msg bot">${cfg.greeting}</div></div></div></main>
      <main class="wr-view active" data-view="voice"><div class="wr-voice"><div><div class="wr-orb"></div><div class="wr-status">Ready when you are</div><div class="wr-note">Tap start and speak naturally.</div><button class="wr-primary wr-start-voice">Start talking</button><button class="wr-secondary wr-end-voice" style="display:none">End</button></div></div></main>
      <div class="wr-compose"><input class="wr-input" placeholder="${cfg.placeholder}"><button class="wr-send" aria-label="Send"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12h12M12 7l5 5-5 5" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div><div class="wr-toast"></div>
    </section>`;
  const mount = cfg.mount ? document.querySelector(cfg.mount) : null;
  (mount || document.body).appendChild(root);

  const $ = sel => root.querySelector(sel);
  const $$ = sel => Array.from(root.querySelectorAll(sel));
  const panel = $(".wr-panel");
  const fab = $(".wr-fab");
  const input = $(".wr-input");
  const log = $(".wr-chat-log");
  let chatId = null;
  const siteSessionKey = `rose-site-chat:live-v1:${cfg.businessId || location.hostname}`;
  let shoppingHistory = [];
  let lastProducts = [];
  let lastSitePages = [];
  let lastNavigationChoices = [];
  let pendingNavigation = null;
  let retellClient = null;
  let voiceBusy = false;

  root.querySelectorAll("img").forEach(img => img.addEventListener("error", () => {
    img.style.display = "none";
    img.parentElement?.setAttribute("data-logo-fallback", "true");
  }));
  fab.addEventListener("click", () => { setView(cfg.defaultView); panel.classList.add("open"); fab.style.display = "none"; });
  $(".wr-close").addEventListener("click", () => { try { retellClient?.stopCall(); } catch {} voiceBusy = false; $(".wr-start-voice").disabled = false; panel.classList.remove("open"); fab.style.display = "grid"; });
  $$(".wr-tab").forEach(t => t.addEventListener("click", () => setView(t.dataset.view)));

  function setView(view) {
    view = view === "chat" ? "chat" : "voice";
    $$(".wr-tab").forEach(t => t.classList.toggle("active", t.dataset.view === view));
    $$(".wr-view").forEach(v => v.classList.toggle("active", v.dataset.view === view));
    $(".wr-compose").style.display = view === "chat" ? "flex" : "none";
  }
  setView(cfg.defaultView);
  function addMsg(role, text) {
    if (role === "bot") {
      const row = document.createElement("div");
      row.className = "wr-row";
      row.innerHTML = `<div class="wr-avatar"><img src="${cfg.logo}" alt=""></div>`;
      const bubble = document.createElement("div");
      bubble.className = "wr-msg bot";
      bubble.textContent = text;
      row.appendChild(bubble);
      log.appendChild(row);
      log.parentElement.scrollTop = log.parentElement.scrollHeight;
      return bubble;
    }
    const el = document.createElement("div");
    el.className = "wr-msg user";
    el.textContent = text;
    log.appendChild(el);
    log.parentElement.scrollTop = log.parentElement.scrollHeight;
    return el;
  }
  try {
    const saved = JSON.parse(sessionStorage.getItem(siteSessionKey) || "{}");
    chatId = typeof saved.chatId === "string" ? saved.chatId : null;
    shoppingHistory = Array.isArray(saved.messages) ? saved.messages.slice(-12) : [];
    shoppingHistory.forEach(message => addMsg(message.role === "user" ? "user" : "bot", String(message.text || "").slice(0, 1600)));
    lastProducts = Array.isArray(saved.products) ? saved.products.filter(product => product.provider === commerceProvider() && (product.provider !== "native" || product.url === location.href)).slice(0, 4) : [];
    renderProducts(lastProducts.filter(product => new URL(product.url, location.href).pathname !== location.pathname));
    lastSitePages = Array.isArray(saved.sitePages) ? saved.sitePages.slice(0, 4) : [];
    renderSitePages(lastSitePages);
    lastNavigationChoices = Array.isArray(saved.navigationChoices) ? saved.navigationChoices.filter(choice => !choice.provider || lastProducts.some(product => product.url === choice.url)).slice(0, 4) : [];
    pendingNavigation = saved.pendingNavigation || null;
    if (pendingNavigation && Date.now() - Number(pendingNavigation.at) < 120000) {
      const destination = safePageUrl(pendingNavigation.url);
      if (destination && destination.pathname === location.pathname && destination.search === location.search) {
        const message = `You're on ${String(pendingNavigation.title || document.title || "the page").slice(0, 100)}.`;
        addMsg("bot", message);
        shoppingHistory.push({ role: "bot", text: message });
        setView(pendingNavigation.view === "voice" ? "voice" : "chat");
        if (pendingNavigation.view === "voice") {
          $(".wr-status").textContent = "Page opened";
          $(".wr-note").textContent = "Tap Start talking to continue.";
        }
        panel.classList.add("open");
        fab.style.display = "none";
        reportCapabilityOutcome({ id: "navigation:page", kind: "navigation", label: "Open requested page", status: "verified" });
      }
    }
    pendingNavigation = null;
    saveSiteSession();
  } catch { /* Storage can be disabled. */ }
  function saveSiteSession() {
    try { sessionStorage.setItem(siteSessionKey, JSON.stringify({ chatId, messages: shoppingHistory.slice(-12), products: lastProducts, sitePages: lastSitePages, navigationChoices: lastNavigationChoices, pendingNavigation })); } catch { /* Storage can be disabled. */ }
  }
  function showContactFallback(target, message) {
    target.textContent = message;
    if (!fallbackHref) return;
    const link = document.createElement("a");
    link.className = "wr-fallback";
    link.href = fallbackHref;
    link.textContent = "Contact the team directly";
    target.appendChild(document.createElement("br"));
    target.appendChild(link);
  }
  function currentPageContext() {
    const description = document.querySelector('meta[name="description"]')?.content || "";
    const headings = [...document.querySelectorAll("main h1, main h2, h1")].slice(0, 6).map(el => el.textContent.trim()).filter(Boolean);
    const controls = widgetOptions.siteControls ? discoverSiteControls().slice(0, 16).map(control => ({ id: control.id, kind: control.kind, label: control.label, options: control.options?.slice(0, 8) })) : [];
    return { url: location.href, title: document.title.slice(0, 180), description: description.slice(0, 400), headings: headings.join(" | ").slice(0, 600), controls };
  }
  function safePageUrl(value) {
    try {
      const url = new URL(value, location.href);
      if (!/^https?:$/.test(url.protocol) || url.hostname.replace(/^www\./, "").toLowerCase() !== location.hostname.replace(/^www\./, "").toLowerCase()) return null;
      if (/^\/(?:account|admin|cart|checkout|checkouts|orders)(?:\/|$)/i.test(url.pathname)) return null;
      return url;
    } catch { return null; }
  }
  function navigationRequested(message) {
    return widgetOptions.navigation && /\b(?:open|visit|go to|take me to|navigate to)\b/i.test(message);
  }
  function navigateTo(page, view = "chat") {
    if (!widgetOptions.navigation) return false;
    const destination = safePageUrl(page?.url);
    if (!destination) return false;
    pendingNavigation = { url: destination.href, title: page.title || "the page", view, at: Date.now() };
    saveSiteSession();
    location.assign(destination.href);
    return true;
  }
  function priorNavigationChoice(message) {
    if (!navigationRequested(message)) return null;
    const ordinal = /\b(?:the\s+)?(first|second|third|fourth|1st|2nd|3rd|4th|#?[1-4])\s+(?:one|option|result|page|product)?\b/i.exec(message)?.[1]?.toLowerCase();
    if (!ordinal) return null;
    const index = { first: 0, "1st": 0, "1": 0, "#1": 0, second: 1, "2nd": 1, "2": 1, "#2": 1, third: 2, "3rd": 2, "3": 2, "#3": 2, fourth: 3, "4th": 3, "4": 3, "#4": 3 }[ordinal];
    return /product/i.test(message) ? lastProducts[index] || null : /page/i.test(message) ? lastSitePages[index] || null : lastNavigationChoices[index] || null;
  }
  function currentPageLinks(message) {
    const skip = new Set("a an and can could for from go i is me my navigate of on open page please show take the to visit want where you your".split(" "));
    const words = [...new Set(String(message).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(word => word.length > 2 && !skip.has(word)))].slice(0, 8);
    if (!words.length) return [];
    const links = new Map();
    for (const anchor of document.querySelectorAll("a[href]")) {
      if (root.contains(anchor)) continue;
      const url = safePageUrl(anchor.href);
      if (!url || url.pathname === location.pathname && url.search === location.search) continue;
      const title = (anchor.textContent || anchor.getAttribute("aria-label") || anchor.getAttribute("title") || "").replace(/\s+/g, " ").trim().slice(0, 120);
      if (!title) continue;
      const label = title.toLowerCase();
      const path = url.pathname.toLowerCase();
      const score = words.reduce((n, word) => n + (label.includes(word) ? 3 : 0) + (path.includes(word) ? 1 : 0), 0);
      if (score && (!links.has(url.href) || links.get(url.href).score < score)) links.set(url.href, { url: url.href, title, score });
    }
    return [...links.values()].sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, 4).map(({ url, title }) => ({ url, title }));
  }
  const controlWords = value => String(value || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  function visibleSiteControl(element) {
    if (!element || root.contains(element) || element.disabled || element.closest('[hidden], [aria-hidden="true"], [inert]')) return false;
    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
  }
  function controlLabel(element) {
    const labels = [...(element.labels || [])].map(label => label.textContent).join(" ");
    const explicit = element.getAttribute("aria-label") || element.getAttribute("title") || labels || element.closest("fieldset")?.querySelector("legend")?.textContent || element.getAttribute("placeholder") || "";
    return String(explicit || element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 100);
  }
  function safeControl(element) {
    const context = `${controlLabel(element)} ${element.name || ""} ${element.id || ""} ${element.closest("form")?.action || ""}`;
    return !/\b(?:password|payment|credit|card number|checkout|purchase|place order|complete order|confirm order|pay|delete|remove|unsubscribe|subscribe|consent|privacy|login|logout|sign in|sign out|sign up|register|email|phone|address|book|reserve|upload|send)\b/i.test(context);
  }
  function discoverSiteControls() {
    if (/^\/(?:account|admin|cart|checkout|checkouts|orders|password)(?:\/|$)/i.test(location.pathname)) return [];
    const controls = [];
    for (const element of document.querySelectorAll('input[type="search"], input[role="searchbox"], form[role="search"] input:not([type="hidden"]), input[name="s"], input[name="q"]')) {
      if (visibleSiteControl(element) && safeControl(element) && (element.type === "search" || element.getAttribute("role") === "searchbox" || element.closest('form[role="search"]') || /search/i.test(`${controlLabel(element)} ${element.form?.action || ""}`)) && (element.form || element.closest("form"))) controls.push({ kind: "search", element, label: controlLabel(element) || "Site search" });
    }
    for (const element of document.querySelectorAll("select")) {
      if (!visibleSiteControl(element) || !safeControl(element) || element.multiple) continue;
      const label = controlLabel(element);
      if (!/\b(?:sort|filter|size|color|colour|variant|quantity|style|material|category|brand|price)\b/i.test(`${label} ${element.name || ""}`) && !element.closest('form.cart, form.variations_form, [class*="filter"], [class*="facet"]')) continue;
      const options = [...element.options].filter(option => !option.disabled && option.value).map(option => option.textContent.trim()).filter(Boolean);
      if (options.length) controls.push({ kind: "select", element, label: label || "Options", options: options.slice(0, 30) });
    }
    for (const element of document.querySelectorAll('input[type="checkbox"], input[type="radio"]')) {
      if (!visibleSiteControl(element) || !safeControl(element)) continue;
      const container = element.closest('[class*="filter"], [id*="filter"], [class*="facet"], [id*="facet"], form.cart, form.variations_form, [role="group"]');
      if (!container) continue;
      const label = controlLabel(element);
      if (label) controls.push({ kind: "choice", element, label });
    }
    for (const element of document.querySelectorAll('button[aria-expanded], button[aria-controls], button[aria-haspopup], [role="tab"], summary')) {
      if (!visibleSiteControl(element) || !safeControl(element) || element.type === "submit") continue;
      const label = controlLabel(element);
      if (label) controls.push({ kind: "toggle", element, label });
    }
    const counts = new Map();
    return controls.slice(0, 80).map(control => {
      const base = `${control.kind}:${controlWords(control.label).slice(0, 70)}`;
      const ordinal = counts.get(base) || 0;
      counts.set(base, ordinal + 1);
      return { ...control, id: `${base}:${ordinal}` };
    });
  }
  async function reportCapabilityOutcome(result = null) {
    await settingsReady;
    if (!cfg.apiBase || !cfg.businessId || (!widgetOptions.siteControls && !result)) return;
    const controls = widgetOptions.siteControls ? discoverSiteControls().slice(0, 24).map(control => ({ id: control.id, kind: control.kind, label: control.label, options: control.options?.slice(0, 12) || [] })) : [];
    try {
      await fetch(`${cfg.apiBase}/api/rose-site-capabilities`, {
        method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
        body: JSON.stringify({ businessId: cfg.businessId, pageUrl: location.href, controls, result }),
      });
    } catch { /* Capability memory should not interrupt the visitor. */ }
  }
  function siteControlIntent(message) {
    const search = /\b(?:search (?:this |the )?(?:site|website) for|look up on (?:this |the )?(?:site|website))\s+(.+)/i.exec(message);
    if (search) return { kind: "search", target: search[1].trim() };
    if (/\b(?:filter by|sort by|set (?:the )?\w+ to|choose (?:the )?\w+|select (?:the )?\w+|show (?:the )?(?:filters?|menu|reviews?|details?)|open (?:the )?(?:filters?|menu|reviews?|details?)|close (?:the )?(?:filters?|menu|reviews?|details?))\b/i.test(message)) return { kind: "control", target: message };
    return null;
  }
  function siteControlCandidates(intent, controls) {
    const target = controlWords(intent.target);
    if (intent.kind === "search") return controls.filter(control => control.kind === "search").map(control => ({ control, score: 1 }));
    const words = target.split(" ").filter(word => word.length > 2 && !["choose", "select", "filter", "sort", "show", "open", "close", "set", "the", "to", "by", "for", "please", "option", "options"].includes(word));
    const matchCount = label => { const tokens = controlWords(label).split(" "); return words.filter(word => tokens.includes(word)).length; };
    return controls.flatMap(control => {
      if (control.kind === "search") return [];
      const label = controlWords(control.label);
      if (control.kind === "toggle") {
        if (!/\b(?:show|open|close|hide)\b/i.test(intent.target)) return [];
        const score = matchCount(label);
        return score ? [{ control, score }] : [];
      }
      if (control.kind === "choice") {
        const score = matchCount(label);
        return score ? [{ control, score }] : [];
      }
      const matches = [...control.element.options].filter(option => !option.disabled && option.value).map(option => ({ option, label: controlWords(option.textContent) }));
      const optionPhrase = target.replace(/^(?:sort|filter) by |^(?:choose|select) |^set (?:the )?\w+ to /, "");
      const ranked = matches.map(match => ({ ...match, score: matchCount(match.label) + (optionPhrase.length > 2 && match.label === optionPhrase ? 5 : 0) })).sort((a, b) => b.score - a.score);
      if (!ranked[0]?.score || ranked[0].score === (ranked[1]?.score || 0)) return [];
      const labelScore = matchCount(label);
      return [{ control, option: ranked[0].option, score: ranked[0].score + labelScore }];
    }).sort((a, b) => b.score - a.score);
  }
  function visibleProductResults() {
    const scope = document.querySelector('main, [role="main"]') || document.body;
    const links = [...scope.querySelectorAll('a[href*="/products/"], a[href*="/product/"], li.product a[href], [data-product-id] a[href], .product-card a[href]')]
      .filter(link => !root.contains(link) && visibleSiteControl(link));
    const products = [];
    const seen = new Set();
    for (const link of links) {
      const url = safePageUrl(link.href);
      if (!url || seen.has(url.pathname)) continue;
      seen.add(url.pathname);
      products.push(url.pathname);
      if (products.length === 40) break;
    }
    return products.length ? products.join("|") : "";
  }
  async function productResultsChanged(before) {
    if (!before) return false;
    for (let attempt = 0; attempt < 12; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const after = visibleProductResults();
      if (after && after !== before) return true;
    }
    return false;
  }
  function changesProductResults(control) {
    const details = `${control.label} ${control.element.name || ""} ${control.element.closest('[class*="filter"], [class*="facet"]')?.className || ""}`;
    return /\b(?:sort|filter|facet|category|brand|price)\b/i.test(details) || control.kind === "choice";
  }
  let pendingSiteControlChoices = [];
  function siteControlOrdinal(message) {
    const match = /\b(first|second|third|fourth|1st|2nd|3rd|4th|#?[1-4])\b/i.exec(message)?.[1]?.toLowerCase();
    return match ? { first: 0, "1st": 0, "1": 0, "#1": 0, second: 1, "2nd": 1, "2": 1, "#2": 1, third: 2, "3rd": 2, "3": 2, "#3": 2, fourth: 3, "4th": 3, "4": 3, "#4": 3 }[match] : null;
  }
  async function handleSiteControlRequest(message, view = "chat") {
    const ordinal = pendingSiteControlChoices.length ? siteControlOrdinal(message) : null;
    const followup = ordinal != null && !/\b(?:product|page|cart|basket)\b/i.test(message);
    const intent = followup ? pendingSiteControlChoices[ordinal]?.intent : siteControlIntent(message);
    if (!intent) return false;
    const respond = text => { addMsg("bot", text); if (view === "voice") $(".wr-note").textContent = text; };
    if (!widgetOptions.siteControls) { respond("Website controls are turned off for this site."); return true; }
    const candidates = followup ? [] : siteControlCandidates(intent, discoverSiteControls());
    const best = followup ? pendingSiteControlChoices[ordinal]?.candidate : candidates[0];
    if (!best) {
      if (/\b(?:choose|select)\b/i.test(message) && !/\b(?:filter|sort|size|color|colour|option)\b/i.test(message)) return false;
      respond("I couldn't find that control on this page. Try opening the relevant page first.");
      return true;
    }
    if (candidates[1] && candidates[1].score === best.score) {
      pendingSiteControlChoices = candidates.filter(item => item.score === best.score).slice(0, 4).map(candidate => ({ candidate, intent }));
      respond(`I found more than one match: ${pendingSiteControlChoices.map((item, index) => `${index + 1}. ${item.candidate.control.label}`).join(", ")}. Say first, second, or name the control.`);
      return true;
    }
    pendingSiteControlChoices = [];
    const { control, option } = best;
    const element = control.element;
    const record = (status, reason = "") => { reportCapabilityOutcome({ id: control.id, kind: control.kind, label: control.label, status, reason }); };
    if (!visibleSiteControl(element) || !safeControl(element)) { respond("That control is no longer available on this page."); record("failed", "Control became unavailable or unsafe to use."); return true; }
    if (control.kind === "search") {
      const form = element.form || element.closest("form");
      const action = form && new URL(form.action || location.href, location.href);
      if (!form || !action || action.origin !== location.origin || form.method.toLowerCase() !== "get" || form.querySelector('input[type="password"], input[type="email"], input[type="tel"]')) { respond("I couldn't use this site's search form."); return true; }
      element.value = intent.target.slice(0, 120);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      respond(`Searching the site for ${intent.target.slice(0, 80)}.`);
      record("submitted");
      form.requestSubmit();
      return true;
    }
    if (control.kind === "select" && option) {
      const checksResults = changesProductResults(control);
      const beforeResults = checksResults ? visibleProductResults() : "";
      element.value = option.value;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      const resultsChanged = checksResults && await productResultsChanged(beforeResults);
      const selected = element.value === option.value;
      const status = !selected ? "failed" : checksResults && !resultsChanged ? "ambiguous" : "verified";
      respond(!selected ? "The site did not keep that selection." : status === "ambiguous" ? `Selected ${option.textContent.trim()}, but I couldn't confirm that the product results changed.` : `Selected ${option.textContent.trim()} for ${control.label}.`);
      record(status, status === "ambiguous" ? "The control changed, but product results could not be confirmed." : selected ? "" : "The site did not keep the selected option.");
      return true;
    }
    if (control.kind === "choice") {
      const beforeResults = visibleProductResults();
      element.checked = true;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      const resultsChanged = await productResultsChanged(beforeResults);
      const status = !element.checked ? "failed" : !resultsChanged ? "ambiguous" : "verified";
      respond(status === "verified" ? `Filtered products by ${control.label}.` : status === "ambiguous" ? `Selected ${control.label}, but I couldn't confirm that the product results changed.` : "The site did not keep that selection.");
      record(status, status === "ambiguous" ? "The choice changed, but product results could not be confirmed." : element.checked ? "" : "The site did not keep the selected choice.");
      return true;
    }
    if (control.kind === "toggle") {
      const closing = /\b(?:close|hide)\b/i.test(message);
      const expanded = element.getAttribute("aria-expanded");
      if (expanded !== null && (expanded === "true") === !closing) { respond(`${control.label} is already ${closing ? "closed" : "open"}.`); return true; }
      element.click();
      await new Promise(resolve => setTimeout(resolve, 60));
      const state = element.tagName === "SUMMARY" ? element.closest("details")?.open : element.getAttribute("aria-expanded") === "true" || element.getAttribute("aria-selected") === "true";
      const targetId = element.getAttribute("aria-controls");
      const target = targetId && document.getElementById(targetId);
      const targetMatches = !target || (target.getClientRects().length > 0 && getComputedStyle(target).visibility !== "hidden") === !closing;
      const verified = state === !closing && targetMatches;
      respond(verified ? `${control.label} is ${closing ? "closed" : "open"}.` : `I activated ${control.label}, but couldn't confirm the page changed.`);
      record(verified ? "verified" : "failed", verified ? "" : "The page did not confirm the menu or detail state changed.");
      return true;
    }
    return false;
  }
  function shoppingQuery(message) {
    const words = String(message).toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, " ").split(/\s+/);
    const skip = new Set("i im need want looking for find show open go visit take me a an the some best good fit please can you do does have under below less than dollars dollar with to my your something and or in on of that is are what which would like buy get shop shopping product products recommend recommendation add put place cart basket bag into price prices cost costs stock availability available much".split(" "));
    return words.filter(word => word.length > 2 && !skip.has(word) && !/^\d+$/.test(word)).slice(0, 5).join(" ");
  }
  function wantsProducts(message) {
    if (navigationRequested(message) && /\b(?:shipping|delivery|returns?|refunds?|privacy|terms|contact|faq|about|size guide|sizing)\b/i.test(message)) return false;
    if (/\b(?:shipping|delivery|returns?|refunds?|privacy|terms|contact|faq|hours?|warranty|policy)\b/i.test(message) && !/\b(?:find|show|recommend|buy|add|product|item)\b/i.test(message)) return false;
    return /\b(find|show|open|visit|look|looking|search|recommend|best|fit|need|want|price|prices|cost|costs|available|home|homes|house|houses|property|properties|listing|listings|bed|beds|bedroom|bedrooms|bath|condo|cottage|townhome|waterfront|coastal)\b/i.test(message) || /\bhow much\b/i.test(message);
  }
  function shopRoot() {
    return window.Shopify?.routes?.root || "/";
  }
  function commerceProvider() {
    if (typeof window.RoseCommerce?.searchProducts === "function" && typeof window.RoseCommerce?.addItem === "function") return "custom";
    if (window.Shopify?.routes?.root) return "shopify";
    if (document.body.classList.contains("woocommerce") || document.querySelector("form.cart, .woocommerce, [class*=woocommerce]")) return "woocommerce";
    return "native";
  }
  function productBudget(message) {
    const match = message.match(/(?:under|below|less than|max(?:imum)?|up to)\s*\$?\s*([\d,]+(?:\.\d+)?)\s*(million|m|thousand|k)?/i);
    if (!match) return Infinity;
    return Number(match[1].replaceAll(',', '')) * (/^(million|m)$/i.test(match[2] || '') ? 1000000 : /^(thousand|k)$/i.test(match[2] || '') ? 1000 : 1);
  }
  function normalizeProducts(items, provider, message) {
    return (Array.isArray(items) ? items : []).filter(item => item && typeof item === "object").map(item => {
      const url = safePageUrl(item.url || item.permalink);
      const price = item.price == null || item.price === "" ? NaN : Number(item.price);
      const currency = /^[A-Z]{3}$/.test(String(item.currency || "")) ? item.currency : "USD";
      return url && url.origin === location.origin && item.id != null && item.title && item.available !== false && (Number.isFinite(price) ? price <= productBudget(message) : productBudget(message) === Infinity)
        ? { provider, id: item.id, handle: item.handle, title: String(item.title).slice(0, 120), url: url.href, image: item.image || "", price: Number.isFinite(price) ? price : null, currency, available: typeof item.available === "boolean" ? item.available : null, needsOptions: Boolean(item.needsOptions) }
        : null;
    }).filter(Boolean).slice(0, 4);
  }
  async function findProducts(message) {
    if (!cfg.shopping || !wantsProducts(message)) return [];
    const query = shoppingQuery(message);
    const provider = commerceProvider();
    if (provider === "native") return findNativeProduct(message);
    if (!query) return [];
    if (provider === "custom") return normalizeProducts(await window.RoseCommerce.searchProducts(message), provider, message);
    if (provider === "woocommerce") {
      const url = new URL("/wp-json/wc/store/v1/products", location.origin);
      url.searchParams.set("search", query);
      url.searchParams.set("per_page", "6");
      const response = await fetch(url, { credentials: "same-origin" });
      if (!response.ok) throw new Error("Product search unavailable");
      const items = await response.json();
      return normalizeProducts(items.map(item => ({
        id: item.id, title: item.name, url: item.permalink, image: item.images?.[0]?.src,
        price: Number(item.prices?.price) / 10 ** Number(item.prices?.currency_minor_unit || 0),
        currency: item.prices?.currency_code, available: item.is_in_stock && item.is_purchasable,
        needsOptions: item.type !== "simple" || item.has_options,
      })), provider, message);
    }
    return findShopifyProducts(message);
  }
  function findNativeProduct(message) {
    const form = nativeProductForm();
    if (!form) return [];
    const title = document.querySelector('h1.product_title, [itemprop="name"], main h1, h1')?.textContent?.trim();
    if (!title) return [];
    const query = shoppingQuery(message).toLowerCase();
    if (query && !query.split(" ").some(word => title.toLowerCase().includes(word)) && !/\b(?:this|current)\s+(?:product|item)\b/i.test(message)) return [];
    const priceText = document.querySelector('[itemprop="price"]')?.getAttribute("content") || document.querySelector('.product .price, .product-price')?.textContent || "";
    const price = priceText ? Number(String(priceText).replace(/[^\d.]/g, "")) : NaN;
    return [{ provider: "native", title: title.slice(0, 120), url: location.href, image: "", price: Number.isFinite(price) ? price : null, currency: "USD" }];
  }
  function nativeProductForm() {
    const forms = [...document.querySelectorAll('form.cart, form[action*="/cart/add"], form[action*="add-to-cart"]')].filter(form => !root.contains(form) && form.querySelector('button[type="submit"], input[type="submit"]'));
    return forms.length === 1 ? forms[0] : null;
  }
  async function findShopifyProducts(message) {
    if (!cfg.shopping || !wantsProducts(message)) return [];
    const query = shoppingQuery(message);
    if (!query) return [];
    const url = new URL(shopRoot() + "search/suggest.json", location.origin);
    url.searchParams.set("q", query);
    url.searchParams.set("resources[type]", "product");
    url.searchParams.set("resources[limit]", "6");
    const response = await fetch(url, { credentials: "same-origin" });
    if (!response.ok) throw new Error("Product search unavailable");
    const data = await response.json();
    return (data.resources?.results?.products || []).filter(p => p.available && Number(p.price) <= productBudget(message)).slice(0, 4).map(p => ({
      provider: "shopify", title: String(p.title || "").slice(0, 120), handle: String(p.handle || ""),
      url: new URL(p.url || `/products/${p.handle}`, location.origin).pathname,
      image: p.image || p.featured_image?.url || "", price: Number(p.price), currency: window.Shopify?.currency?.active || "USD", available: p.available === true,
    }));
  }
  function renderProducts(products) {
    products = products.filter(product => new URL(product.url, location.href).pathname !== location.pathname);
    if (!products.length) return;
    const list = document.createElement("div");
    list.className = "wr-products";
    for (const product of products) {
      const card = document.createElement("div");
      card.className = "wr-product wr-commerce-card";
      const media = document.createElement("div");
      media.className = "wr-product-media";
      if (product.image) {
        const img = document.createElement("img");
        img.src = product.image;
        img.alt = "";
        img.loading = "lazy";
        img.addEventListener("error", () => {
          img.remove();
          media.innerHTML = '<div class="wr-product-media-fallback" aria-hidden="true"><span>◈</span><small>Product</small></div>';
        }, { once: true });
        media.appendChild(img);
      } else {
        media.innerHTML = '<div class="wr-product-media-fallback" aria-hidden="true"><span>◈</span><small>Product</small></div>';
      }
      card.appendChild(media);
      const info = document.createElement("div");
      info.className = "wr-product-info";
      const title = document.createElement("div");
      title.className = "wr-product-title";
      title.textContent = product.title;
      info.appendChild(title);
      if (Number.isFinite(product.price)) {
        const price = document.createElement("div");
        price.className = "wr-product-price";
        price.textContent = new Intl.NumberFormat(undefined, { style: "currency", currency: product.currency || "USD" }).format(product.price);
        info.appendChild(price);
      }
      const actions = document.createElement("div");
      actions.className = "wr-product-actions";
      const link = document.createElement("a");
      link.href = product.url;
      link.textContent = "View home";
      link.addEventListener("click", event => {
        if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (!widgetOptions.navigation) return;
        event.preventDefault();
        navigateTo(product, root.querySelector('.wr-tab.active')?.dataset.view);
      });
      actions.appendChild(link);
      if (widgetOptions.cartActions) {
        const add = document.createElement("button");
        add.type = "button";
        add.textContent = product.provider === 'custom' && product.needsOptions ? 'Choose options' : 'Add to cart';
        add.dataset.cartState = "idle";
        add.setAttribute("aria-live", "polite");
        add.addEventListener("click", () => product.provider === 'custom' && product.needsOptions ? navigateTo(product, root.querySelector('.wr-tab.active')?.dataset.view) : addProduct(product, add));
        actions.appendChild(add);
      }
      card.appendChild(info);
      card.appendChild(actions);
      list.appendChild(card);
    }
    log.appendChild(list);
    log.parentElement.scrollTop = log.parentElement.scrollHeight;
    return list;
  }
  function cartRequested(message) {
    return /\b(?:add|put|place)\b[\s\S]{0,90}\b(?:cart|basket|bag)\b/i.test(message);
  }
  function cartChoice(message, products) {
    if (!products.length) return null;
    const ordinal = /\b(first|second|third|fourth|1st|2nd|3rd|4th|#?[1-4])\b/i.exec(message)?.[1]?.toLowerCase();
    if (ordinal) {
      const index = { first: 0, "1st": 0, "1": 0, "#1": 0, second: 1, "2nd": 1, "2": 1, "#2": 1, third: 2, "3rd": 2, "3": 2, "#3": 2, fourth: 3, "4th": 3, "4": 3, "#4": 3 }[ordinal];
      return products[index] || null;
    }
    const words = shoppingQuery(message).split(" ").filter(word => word.length > 2 && !["this", "that", "one", "item"].includes(word));
    if (words.length) {
      const ranked = products.map(product => ({ product, score: words.filter(word => product.title.toLowerCase().includes(word)).length })).sort((a, b) => b.score - a.score);
      if (ranked[0].score > 0 && ranked[0].score > (ranked[1]?.score || 0)) return ranked[0].product;
      return null;
    }
    return products.length === 1 ? products[0] : null;
  }
  async function handleCartRequest(message, view = "chat") {
    if (!cartRequested(message)) return false;
    await settingsReady;
    if (!cfg.shopping || !widgetOptions.cartActions) {
      addMsg("bot", "Cart actions are turned off for this site.");
      return true;
    }
    const here = window.RoseCommerce?.currentProduct?.();
    if (here && (!/\b(?:ridge|summit|switchback|cloudline|trailhead|roamer|canyon|daybreak|wayfinder|wildflower)\b/i.test(message) || message.toLowerCase().includes(here.title.toLowerCase()))) {
      const selection = window.RoseCommerce.currentSelection();
      if (!selection) { addMsg('bot', 'Choose a color, size, and model on this page first.'); return true; }
      const note = addMsg('bot', `Adding ${here.title} to your demo bag…`);
      try {
        const before = await window.RoseCommerce.getCart();
        const prior = before.items.filter(item => item.id === here.id).reduce((sum,item)=>sum+item.quantity,0);
        await window.RoseCommerce.addItem({product:here,quantity:1});
        const after = await window.RoseCommerce.getCart();
        const count = after.items.filter(item => item.id === here.id).reduce((sum,item)=>sum+item.quantity,0);
        if (count <= prior) throw new Error('I could not confirm that it was added.');
        note.textContent = `Added ${here.title} · ${selection.color} · ${selection.size} · ${selection.model} to your demo bag. Want to look at another size or color?`;
      } catch (error) { note.textContent = error.message; }
      if (view === 'voice') $('.wr-note').textContent = note.textContent;
      return true;
    }
    let products = lastProducts;
    let product = cartChoice(message, products);
    if (!product) {
      const found = await findProducts(message).catch(() => []);
      if (found.length) {
        products = found;
        lastProducts = found;
        lastNavigationChoices = found;
        renderProducts(found);
        saveSiteSession();
        product = cartChoice(message, found);
      }
    }
    if (!product) {
      const note = products.length > 1 ? "Which product should I add? Say its name or number." : "I could not identify a product to add. Tell me its name first.";
      addMsg("bot", note);
      if (view === "voice") { $(".wr-note").textContent = note; root.querySelector('.wr-tab[data-view="chat"]').textContent = "Chat • choose product"; }
      return true;
    }
    const cards = [...log.querySelectorAll(".wr-product")];
    let button = cards.reverse().find(card => card.querySelector(".wr-product-title")?.textContent === product.title && card.querySelector('a[href]')?.href === new URL(product.url, location.href).href)?.querySelector("button");
    if (!button) button = renderProducts([product])?.querySelector("button");
    if (!button) return true;
    const note = `Adding ${product.title} to the cart…`;
    const statusMessage = addMsg("bot", note);
    if (view === "voice") $(".wr-note").textContent = note;
    await addProduct(product, button);
    const result = button.textContent === "Added ✓" ? `${product.title} was added to the cart.` : button.textContent === "Submitted to store" ? "The store form was submitted. Check the cart to confirm." : button.textContent === "Add selected" ? "Choose the product option in Chat, then add it." : "I could not confirm the cart change. Use the product controls shown in Chat.";
    statusMessage.textContent = result;
    if (view === "voice") $(".wr-note").textContent = result;
    return true;
  }
  let actionInFlight = false;
  async function executeRequestedAction(message, view = "chat") {
    const actionable = cartRequested(message) || siteControlIntent(message) || (pendingSiteControlChoices.length && siteControlOrdinal(message) != null) || priorNavigationChoice(message);
    if (!actionable) return { handled: false };
    if (actionInFlight) {
      addMsg("bot", "I'm finishing the previous action. Please try again in a moment.");
      return { handled: true, type: "busy" };
    }
    actionInFlight = true;
    try {
      if (await handleCartRequest(message, view)) return { handled: true, type: "cart" };
      if (await handleSiteControlRequest(message, view)) return { handled: true, type: "control" };
      const prior = priorNavigationChoice(message);
      if (prior && navigateTo(prior, view)) return { handled: true, type: "navigation" };
      return { handled: false };
    } finally { actionInFlight = false; }
  }
  function renderSitePages(pages) {
    if (!widgetOptions.navigation) return;
    const valid = (pages || []).filter(page => safePageUrl(page?.url)).slice(0, 4);
    if (!valid.length) return;
    const list = document.createElement("div");
    list.className = "wr-products";
    list.dataset.rosePageResults = "true";
    for (const page of valid) {
      const card = document.createElement("div");
      card.className = "wr-product";
      const info = document.createElement("div");
      info.className = "wr-product-info";
      const title = document.createElement("div");
      title.className = "wr-product-title";
      title.textContent = String(page.title || "Website page").slice(0, 120);
      info.appendChild(title);
      if (page.description) {
        const detail = document.createElement("div");
        detail.className = "wr-product-price";
        detail.textContent = String(page.description).slice(0, 150);
        info.appendChild(detail);
      }
      const actions = document.createElement("div");
      actions.className = "wr-product-actions";
      const link = document.createElement("a");
      link.href = page.url;
      link.textContent = "Open page";
      link.addEventListener("click", event => {
        if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        navigateTo(page, root.querySelector('.wr-tab.active')?.dataset.view);
      });
      actions.appendChild(link);
      info.appendChild(actions);
      card.appendChild(info);
      list.appendChild(card);
    }
    log.appendChild(list);
    log.parentElement.scrollTop = log.parentElement.scrollHeight;
  }
  function showCartLink(button, url) {
    const destination = new URL(url || "/cart", location.origin);
    if (destination.origin !== location.origin) return;
    const existing = button.parentElement.querySelector('[data-rose-cart-link="true"]');
    if (existing) { existing.href = destination.href; return; }
    const cart = document.createElement("a");
    cart.href = destination.href;
    cart.textContent = "View cart";
    cart.dataset.roseCartLink = "true";
    button.parentElement.appendChild(cart);
  }
  function recordCartOutcome(product, status, reason = "") {
    reportCapabilityOutcome({ id: `cart:${product.provider}`, kind: "cart", label: `Add to cart (${product.provider})`, status, reason: String(reason).slice(0, 180) });
  }
  function setCartButtonState(button, state, label) {
    button.dataset.cartState = state;
    button.textContent = label;
    button.setAttribute("aria-busy", state === "loading" ? "true" : "false");
    button.closest(".wr-commerce-card")?.classList.toggle("is-added", state === "added");
  }
  async function addProduct(product, button) {
    await settingsReady;
    if (!widgetOptions.cartActions) return;
    if (product.needsOptions) {
      addMsg("bot", `Open ${product.title} to choose its color, size, and model. Then I can add it to your demo bag.`);
      return;
    }
    if (product.provider === "shopify") return addShopifyProduct(product, button);
    button.disabled = true;
    setCartButtonState(button, "loading", "Adding…");
    try {
      if (product.provider === "woocommerce") {
        const cartUrl = new URL("/wp-json/wc/store/v1/cart", location.origin);
        const before = await fetch(cartUrl, { credentials: "same-origin" });
        if (!before.ok) throw new Error("The store cart is unavailable. Please use the product page.");
        const token = before.headers.get("Cart-Token");
        if (!token) throw new Error("The store did not provide a cart token. Please use the product page.");
        const prior = await before.json();
        const priorQuantity = (prior.items || []).filter(item => Number(item.id) === Number(product.id)).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
        const response = await fetch(new URL("/wp-json/wc/store/v1/cart/add-item", location.origin), {
          method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "Cart-Token": token },
          body: JSON.stringify({ id: Number(product.id), quantity: 1 }),
        });
        const cart = await response.json().catch(() => ({}));
        const quantity = (cart.items || []).filter(item => Number(item.id) === Number(product.id)).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
        if (!response.ok || quantity < priorQuantity + 1) throw new Error("The store could not confirm this item in the cart. Please check the cart.");
        setCartButtonState(button, "added", "Added ✓");
        const cartLink = document.querySelector('a[href*="/cart/"]:not(.wr-ai a)');
        showCartLink(button, cartLink?.href || "/cart/");
        recordCartOutcome(product, "verified");
      } else if (product.provider === "custom") {
        const priorCart = typeof window.RoseCommerce.getCart === "function" ? await window.RoseCommerce.getCart() : null;
        const priorQuantity = (priorCart?.items || []).filter(item => String(item.id) === String(product.id)).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
        const result = await window.RoseCommerce.addItem({ product, quantity: 1 });
        if (!result || result.ok !== true) throw new Error("The store could not confirm this item in the cart.");
        if (typeof window.RoseCommerce.getCart === "function") {
          const cart = await window.RoseCommerce.getCart();
          const quantity = (cart?.items || []).filter(item => String(item.id) === String(product.id)).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
          if (quantity < priorQuantity + 1) throw new Error("The store could not confirm this item in the cart.");
        }
        setCartButtonState(button, "added", "Added ✓");
        if (result.cartUrl) showCartLink(button, result.cartUrl);
        recordCartOutcome(product, "verified");
      } else if (product.provider === "native") {
        const form = nativeProductForm();
        const action = form && new URL(form.action || location.href, location.href);
        const submit = form?.querySelector('button[type="submit"], input[type="submit"]');
        if (!form || new URL(product.url).href !== location.href || !action || action.origin !== location.origin || !submit || submit.disabled) throw new Error("Open this product page to choose options and add the item.");
        if (!form.reportValidity()) throw new Error("Choose the required product options on the page first.");
        const unchosen = [...form.querySelectorAll("select")].some(select => !select.value);
        if (unchosen) throw new Error("Choose the product options on the page first.");
        setCartButtonState(button, "submitted", "Submitted to store");
        form.requestSubmit(submit);
        recordCartOutcome(product, "submitted", "The store form was submitted; cart contents could not be confirmed.");
        addMsg("bot", "I submitted the store’s product form. Check the cart to confirm it was added.");
      }
    } catch (error) {
      button.disabled = false;
      setCartButtonState(button, "idle", "Add to cart");
      recordCartOutcome(product, "failed", error.message);
      addMsg("bot", error.message);
    }
  }
  async function addShopifyProduct(product, button) {
    await settingsReady;
    if (!widgetOptions.cartActions) return;
    button.disabled = true;
    setCartButtonState(button, "loading", "Checking options…");
    try {
      if (!/^[a-z0-9-]+$/.test(product.handle)) throw new Error("Open the product page to choose options.");
      const detail = await fetch(new URL(shopRoot() + `products/${product.handle}.js`, location.origin), { credentials: "same-origin" });
      if (!detail.ok) throw new Error("Open the product page to choose options.");
      const full = await detail.json();
      const variants = (full.variants || []).filter(v => v.available && !v.requires_selling_plan);
      if (!variants.length) throw new Error("This item needs options that must be chosen on its product page.");
      let selected = variants[0];
      if (variants.length > 1) {
        let picker = button.parentElement.querySelector("select");
        if (!picker) {
          picker = document.createElement("select");
          picker.setAttribute("aria-label", `Choose options for ${product.title}`);
          variants.forEach(variant => {
            const option = document.createElement("option");
            option.value = String(variant.id);
            option.textContent = variant.title;
            picker.appendChild(option);
          });
          button.parentElement.insertBefore(picker, button);
          button.disabled = false;
          setCartButtonState(button, "idle", "Add selected");
          return;
        }
        selected = variants.find(variant => String(variant.id) === picker.value);
        if (!selected) throw new Error("Please choose an available option.");
      }
      const cartUrl = new URL(shopRoot() + "cart.js", location.origin);
      const before = await fetch(cartUrl, { credentials: "same-origin" });
      const priorCart = before.ok ? await before.json() : null;
      const priorQuantity = (priorCart?.items || []).filter(item => String(item.id) === String(selected.id)).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      const response = await fetch(new URL(shopRoot() + "cart/add.js", location.origin), {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ id: selected.id, quantity: 1 }] }),
      });
      if (!response.ok) throw new Error("The store could not add that item. Please use the product page.");
      const cartResponse = await fetch(cartUrl, { credentials: "same-origin" });
      const cartState = cartResponse.ok ? await cartResponse.json() : null;
      const quantity = (cartState?.items || []).filter(item => String(item.id) === String(selected.id)).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      if (quantity < priorQuantity + 1) throw new Error("The store could not confirm this item in the cart. Please check the cart.");
      setCartButtonState(button, "added", "Added ✓");
      showCartLink(button, new URL(shopRoot() + "cart", location.origin));
      recordCartOutcome(product, "verified");
    } catch (error) {
      button.disabled = false;
      setCartButtonState(button, "idle", "Add to cart");
      recordCartOutcome(product, "failed", error.message);
      addMsg("bot", error.message);
    }
  }
  function voiceSpeaker(role) {
    return /agent|assistant|bot|rose/i.test(role || "") ? "bot" : "user";
  }
  function clearVoiceTranscriptBubbles() {
    log?.querySelectorAll('[data-voice-transcript="true"]').forEach(el => {
      const row = el.closest('.wr-row');
      if (row) row.remove();
      else el.remove();
    });
  }
  function addVoiceParagraph(speaker, text) {
    const clean = String(text || "").trim();
    if (!clean) return;
    const bubble = addMsg(speaker, clean);
    bubble.dataset.voiceTranscript = "true";
    bubble.closest('.wr-row')?.setAttribute('data-voice-transcript', 'true');
  }
  let lastVoiceShoppingText = "";
  async function handleVoiceRequest(text) {
    await settingsReady;
    const normalized = String(text || "").trim().toLowerCase();
    const wantsNavigation = widgetOptions.voiceNavigation && navigationRequested(normalized);
    if (((!cfg.shopping || !wantsProducts(normalized)) && !wantsNavigation && !siteControlIntent(normalized) && !(pendingSiteControlChoices.length && siteControlOrdinal(normalized) != null)) || normalized === lastVoiceShoppingText) return;
    lastVoiceShoppingText = normalized;
    try {
      if ((await executeRequestedAction(text, "voice")).handled) return;
      const products = cfg.shopping ? await findProducts(text).catch(() => []) : [];
      if (products.length) {
        lastProducts = products;
        renderProducts(products);
        saveSiteSession();
      }
      if (wantsNavigation) {
        const result = await api("/api/rose-site-navigation", { query: text, businessId: cfg.businessId, pageUrl: location.href, website: cfg.website || location.origin }).then(data => data.pages || []).catch(() => []);
        const pages = result.filter(page => safePageUrl(page?.url) && !products.some(product => safePageUrl(product.url)?.href === safePageUrl(page.url)?.href)).slice(0, 4);
        const siteChoices = pages.length ? pages : currentPageLinks(text).filter(page => !products.some(product => safePageUrl(product.url)?.href === safePageUrl(page.url)?.href));
        const choices = [...products, ...siteChoices];
        if (siteChoices.length) { lastSitePages = siteChoices; renderSitePages(siteChoices); saveSiteSession(); }
        lastNavigationChoices = choices; saveSiteSession();
        if (widgetOptions.autoOpen && choices.length === 1 && navigateTo(choices[0], "voice")) return;
      } else if (products.length) { lastNavigationChoices = products; saveSiteSession(); }
      if (!products.length && !lastNavigationChoices.length) return;
      const chatTab = root.querySelector('.wr-tab[data-view="chat"]');
      if (chatTab) chatTab.textContent = products.length ? "Chat • products" : "Chat • pages";
    } catch (error) { console.warn("Rose voice navigation unavailable", error); }
  }
  function renderVoiceTranscriptItems(items) {
    const groups = [];
    for (const item of items || []) {
      const text = item?.content || item?.text || item?.transcript || item?.message;
      const clean = String(text || "").trim();
      if (!clean) continue;
      const speaker = voiceSpeaker(item?.role || item?.speaker || item?.source);
      const last = groups[groups.length - 1];
      if (last?.speaker === speaker) last.parts.push(clean);
      else groups.push({ speaker, parts: [clean] });
    }
    clearVoiceTranscriptBubbles();
    groups.forEach(g => addVoiceParagraph(g.speaker, g.parts.join("\n\n")));
    const last = groups[groups.length - 1];
    if (last?.speaker === "user") handleVoiceRequest(last.parts.join(" "));
  }
  function appendVoiceTranscript(role, text, partial = false) {
    const clean = String(text || "").trim();
    if (!clean || partial) return;
    const speaker = voiceSpeaker(role);
    addVoiceParagraph(speaker, clean);
    if (speaker === "user") handleVoiceRequest(clean);
  }
  function handleTranscriptUpdate(payload) {
    const items = Array.isArray(payload?.transcript) ? payload.transcript
      : Array.isArray(payload?.transcripts) ? payload.transcripts
      : Array.isArray(payload?.conversation) ? payload.conversation
      : Array.isArray(payload) ? payload : null;
    if (items) {
      renderVoiceTranscriptItems(items);
      return;
    }
    const text = payload?.content || payload?.text || payload?.transcript || payload?.message;
    const role = payload?.role || payload?.speaker || payload?.source || payload?.type;
    const key = `${role || ""}:${text || ""}`;
    if (text && handleTranscriptUpdate.lastKey !== key) {
      handleTranscriptUpdate.lastKey = key;
      appendVoiceTranscript(role, text, Boolean(payload?.is_final === false || payload?.final === false));
    }
  }
  async function api(path, body) {
    const r = await fetch(cfg.apiBase + path, { method: "POST", headers: { "Content-Type": "application/json", "bypass-tunnel-reminder": "1" }, body: JSON.stringify(body || {}) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { const error = new Error(data.error || "Request failed"); error.status = r.status; throw error; }
    return data;
  }
  async function ensureChat() {
    if (chatId) return chatId;
    const data = await api("/api/chat/start", { page: location.href, businessId: cfg.businessId, ownerEmail: cfg.ownerEmail, businessName: cfg.businessName, website: cfg.website, businessContext: cfg.businessContext, services: cfg.services });
    chatId = data.chatId;
    saveSiteSession();
    return chatId;
  }
  async function submitChat() {
    await settingsReady;
    const content = input.value.trim();
    if (!content) return;
    input.value = "";
    addMsg("user", content);
    shoppingHistory.push({ role: "user", text: content }); saveSiteSession();
    if ((await executeRequestedAction(content)).handled) return;
    const pending = addMsg("bot", "Thinking…");
    try {
      let products = [];
      try { products = await findProducts(content); } catch (error) { console.warn("Rose product search unavailable", error); }
      const sendMessage = id => api("/api/chat/message", { chatId: id, content, businessId: cfg.businessId, ownerEmail: cfg.ownerEmail, businessName: cfg.businessName, website: cfg.website, businessContext: cfg.businessContext, services: cfg.services, pageContext: currentPageContext(), shoppingProducts: products });
      let id = await ensureChat();
      let data;
      try { data = await sendMessage(id); }
      catch (error) {
        if (![400, 404, 410].includes(error.status)) throw error;
        chatId = null; saveSiteSession();
        id = await ensureChat();
        data = await sendMessage(id);
      }
      pending.textContent = data.reply || "I can help with that.";
      shoppingHistory.push({ role: "bot", text: pending.textContent }); saveSiteSession();
      renderProducts(products);
      lastProducts = products; saveSiteSession();
      const mappedPages = (data.sitePages || []).filter(page => safePageUrl(page?.url) && !products.some(product => page.url.includes(product.url))).slice(0, 4);
      const sitePages = mappedPages.length || !navigationRequested(content) ? mappedPages : currentPageLinks(content).filter(page => !products.some(product => safePageUrl(product.url)?.href === safePageUrl(page.url)?.href));
      renderSitePages(sitePages);
      lastSitePages = sitePages; saveSiteSession();
      lastNavigationChoices = [...products, ...sitePages]; saveSiteSession();
      if (navigationRequested(content)) {
        const choices = lastNavigationChoices;
        if (widgetOptions.autoOpen && choices.length === 1) navigateTo(choices[0]);
        else if (choices.length > 1 && !data.reply) pending.textContent = "I found a few matching pages. Choose one below, or say ‘open the second one’.";
      }
    } catch (e) {
      chatId = null; saveSiteSession();
      const links = navigationRequested(content) ? currentPageLinks(content) : [];
      if (links.length) {
        lastSitePages = links; saveSiteSession();
        lastNavigationChoices = links; saveSiteSession();
        pending.textContent = links.length === 1 ? "I found that page and am opening it." : "I found these pages. Choose one below.";
        renderSitePages(links);
        if (links.length === 1) navigateTo(links[0]);
      } else {
        const suggestions = await findProducts(content).catch(() => []);
        renderProducts(suggestions);
        lastProducts = suggestions; saveSiteSession();
        showContactFallback(pending, suggestions.length ? "Rose's live chat is temporarily unavailable. You can still explore the matching products below." : "Rose's live chat is temporarily unavailable. Please try again shortly.");
      }
      console.error(e);
    }
  }

  $(".wr-send").addEventListener("click", submitChat);
  input.addEventListener("keydown", e => { if (e.key === "Enter") submitChat(); });
  $(".wr-start-voice").addEventListener("click", async () => {
    const status = $(".wr-status"), note = $(".wr-note"), orb = $(".wr-orb"), startBtn = $(".wr-start-voice"), endBtn = $(".wr-end-voice");
    if (voiceBusy) return;
    voiceBusy = true;
    startBtn.disabled = true;
    try { retellClient?.stopCall(); } catch {}
    try {
      status.textContent = "Connecting…";
      const [{ RetellWebClient }, call] = await Promise.all([
        import("https://esm.sh/retell-client-js-sdk@2.0.7"),
        api("/api/voice/start", { page: location.href, pageContext: currentPageContext(), businessId: cfg.businessId, ownerEmail: cfg.ownerEmail, businessName: cfg.businessName, website: cfg.website, businessContext: cfg.businessContext, services: cfg.services })
      ]);
      retellClient = new RetellWebClient();
      let speechReleaseTimer = null;
      const SPEECH_RELEASE_DELAY = 1150;
      const clearSpeechRelease = () => {
        if (speechReleaseTimer) clearTimeout(speechReleaseTimer);
        speechReleaseTimer = null;
      };
      const setRoseSpeaking = () => {
        clearSpeechRelease();
        panel.classList.add("speaking");
        status.textContent = "Rose is speaking";
        orb.classList.add("live", "speaking");
        orb.classList.remove("listening");
      };
      const setListening = () => {
        clearSpeechRelease();
        panel.classList.remove("speaking");
        status.textContent = "Listening";
        orb.classList.add("live", "listening");
        orb.classList.remove("speaking");
      };
      const easeBackToListening = () => {
        clearSpeechRelease();
        speechReleaseTimer = setTimeout(setListening, SPEECH_RELEASE_DELAY);
      };
      retellClient.on("call_started", () => { setListening(); note.textContent = "Speak naturally. Interrupt anytime."; startBtn.disabled = false; startBtn.style.display = "none"; endBtn.style.display = "inline-block"; });
      retellClient.on("update", handleTranscriptUpdate);
      retellClient.on("transcript", handleTranscriptUpdate);
      retellClient.on("conversation_updated", handleTranscriptUpdate);
      retellClient.on("agent_start_talking", setRoseSpeaking);
      retellClient.on("agent_stop_talking", easeBackToListening);
      retellClient.on("user_start_talking", setListening);
      retellClient.on("user_stop_talking", () => { clearSpeechRelease(); panel.classList.remove("speaking"); status.textContent = "Thinking"; orb.classList.remove("listening", "speaking"); });
      retellClient.on("call_ended", () => { voiceBusy = false; startBtn.disabled = false; clearSpeechRelease(); panel.classList.remove("speaking"); status.textContent = "Call ended"; note.textContent = "Start another conversation anytime."; orb.classList.remove("live", "listening", "speaking"); startBtn.style.display = "inline-block"; endBtn.style.display = "none"; });
      retellClient.on("error", err => { voiceBusy = false; startBtn.disabled = false; clearSpeechRelease(); panel.classList.remove("speaking"); console.error(err); status.textContent = "Voice connection failed"; showContactFallback(note, "Rose could not start a voice call."); orb.classList.remove("live", "listening", "speaking"); startBtn.style.display = "inline-block"; endBtn.style.display = "none"; });
      await retellClient.startCall({ accessToken: call.accessToken });
    } catch (err) {
      voiceBusy = false;
      startBtn.disabled = false;
      console.error(err);
      status.textContent = "Voice unavailable";
      showContactFallback(note, "Rose is temporarily unavailable.");
      startBtn.style.display = "inline-block";
      endBtn.style.display = "none";
    }
  });
  $(".wr-end-voice").addEventListener("click", () => { try { retellClient?.stopCall(); } catch {} voiceBusy = false; $(".wr-start-voice").disabled = false; });
  const observePageCapabilities = () => { if (discoverSiteControls().length) reportCapabilityOutcome(); };
  if (document.readyState === "complete") observePageCapabilities();
  else window.addEventListener("load", observePageCapabilities, { once: true });
})();
