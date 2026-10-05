(() => {
  const script = document.currentScript;
  // Customer embeds must never silently become the Wildrose marketing assistant.
  if (!script?.dataset.businessId?.trim() || !script?.dataset.ownerEmail?.trim()) return;
  const escapeHtml = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const cfg = {
    apiBase: (script.dataset.apiBase || "https://wildrose-widget.wildeautomations.com").replace(/\/$/, ""),
    title: script?.dataset.title || "Rose",
    businessName: script?.dataset.businessName || script?.dataset.company || "your team",
    accent: /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(script?.dataset.accent || "") ? script.dataset.accent : "#ff5722",
    logo: script?.dataset.logo || "https://wildroseautomations.ca/logos/wildrose.png",
    ownerEmail: script.dataset.ownerEmail.trim(),
    businessId: script.dataset.businessId.trim(),
    mount: script?.dataset.mount || "",
    inline: script?.dataset.inline === "true",
    contained: script?.dataset.contained === "true",
    subtitle: script?.dataset.subtitle || "AI intake assistant",
    greeting: script?.dataset.greeting || "Hi! How can I help you today?",
    placeholder: script?.dataset.placeholder || "Ask Rose…",
    website: script?.dataset.website || location.origin,
    businessContext: script?.dataset.businessContext || "",
    services: script?.dataset.services || "",
  };

  const css = `
    .wrc-ai,.wrc-ai *{box-sizing:border-box}
    .wrc-ai{
      --accent:${cfg.accent};
      --accent-soft:color-mix(in srgb,var(--accent) 32%,white);
      --glass:rgba(255,255,255,.34);
      --glass-strong:rgba(255,255,255,.56);
      --ink:#18120f;
      --muted:rgba(24,18,15,.58);
      position:fixed;right:22px;bottom:22px;z-index:2147483000;
      font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif;
      color:var(--ink);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;
    }
    .wrc-ai.inline{position:relative;right:auto;bottom:auto;width:min(430px,100%);margin:0 auto;z-index:3}.wrc-ai.inline:before{right:50%;bottom:50%;transform:translate(50%,50%);width:280px;height:280px}.wrc-ai.inline .wrc-fab{display:none!important}.wrc-ai.inline .wrc-close{display:none}.wrc-ai.inline .wrc-panel{position:relative;right:auto;bottom:auto;display:grid;width:100%;height:560px}.wrc-ai.inline .wrc-panel.open{display:grid;animation:none}.wrc-ai.contained{position:absolute;right:18px;bottom:18px;z-index:20}.wrc-ai.contained .wrc-panel{width:min(390px,calc(100vw - 52px));height:min(570px,calc(100vh - 110px))}@media (max-width:720px){.wrc-ai.contained{right:12px;bottom:12px}.wrc-ai.contained .wrc-panel{width:min(360px,calc(100vw - 36px));height:min(560px,calc(100vh - 92px))}}
    .wrc-ai:before{content:"";position:absolute;right:-26px;bottom:-26px;width:176px;height:176px;border-radius:50%;background:radial-gradient(circle,rgba(255,87,34,.28),rgba(255,87,34,0) 68%);filter:blur(10px);pointer-events:none;opacity:.9}
    .wrc-fab{width:76px;height:76px;border:0;padding:0;border-radius:28px;display:grid;place-items:center;cursor:pointer;background:linear-gradient(145deg,rgba(255,255,255,.66),rgba(255,255,255,.22));box-shadow:0 26px 70px rgba(34,20,14,.24),0 0 0 1px rgba(255,255,255,.55),inset 0 1px 0 rgba(255,255,255,.95),inset 0 -1px 0 rgba(255,255,255,.24);backdrop-filter:blur(34px) saturate(1.55);-webkit-backdrop-filter:blur(34px) saturate(1.55);transition:transform .22s cubic-bezier(.2,.8,.2,1),box-shadow .22s ease,filter .22s ease;position:relative;overflow:hidden}
    .wrc-fab:before{content:"";position:absolute;inset:0;border-radius:inherit;background:linear-gradient(135deg,rgba(255,255,255,.92),rgba(255,255,255,0) 38%,rgba(255,87,34,.18) 100%);mix-blend-mode:screen;pointer-events:none}
    .wrc-fab:after{content:"";position:absolute;inset:9px;border-radius:22px;border:1px solid rgba(255,255,255,.42);pointer-events:none}
    .wrc-fab:hover{transform:translateY(-4px) scale(1.035);box-shadow:0 34px 86px rgba(34,20,14,.30),0 0 0 1px rgba(255,255,255,.70),0 0 36px rgba(255,87,34,.18),inset 0 1px 0 rgba(255,255,255,.98)}
    .wrc-dot{width:56px;height:56px;border-radius:20px;display:grid;place-items:center;background:linear-gradient(145deg,rgba(255,255,255,.72),rgba(255,255,255,.26));box-shadow:inset 0 1px 0 rgba(255,255,255,.82),0 12px 30px rgba(36,20,12,.15);overflow:hidden;position:relative}.wrc-dot img{width:92%;height:92%;object-fit:contain;filter:drop-shadow(0 5px 12px rgba(0,0,0,.14))}
    .wrc-panel{position:absolute;right:0;bottom:0;width:min(382px,calc(100vw - 24px));height:min(578px,calc(100vh - 24px));display:none;grid-template-rows:auto auto 1fr auto;overflow:hidden;border-radius:38px;background:linear-gradient(145deg,rgba(255,255,255,.62),rgba(255,255,255,.26) 46%,rgba(255,244,236,.34));border:1px solid rgba(255,255,255,.62);box-shadow:0 34px 110px rgba(29,18,12,.28),0 0 0 1px rgba(255,255,255,.28),inset 0 1px 0 rgba(255,255,255,.92),inset 0 -1px 0 rgba(255,255,255,.20);backdrop-filter:blur(44px) saturate(1.8);-webkit-backdrop-filter:blur(44px) saturate(1.8)}
    .wrc-panel:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 12% 0%,rgba(255,255,255,.88),transparent 30%),radial-gradient(circle at 92% 10%,rgba(255,87,34,.26),transparent 34%),linear-gradient(160deg,rgba(255,255,255,.38),transparent 45%);pointer-events:none}.wrc-panel:after{content:"";position:absolute;inset:1px;border-radius:37px;border:1px solid rgba(255,255,255,.40);pointer-events:none}.wrc-panel.open{display:grid;animation:wrGlassIn .28s cubic-bezier(.18,.9,.2,1)}@keyframes wrGlassIn{from{opacity:0;transform:translateY(18px) scale(.972);filter:blur(3px)}to{opacity:1;transform:none;filter:none}}
    .wrc-head,.wrc-tabs,.wrc-compose{position:relative;z-index:1}.wrc-head{padding:17px 17px 12px}.wrc-top{display:flex;align-items:center;justify-content:space-between;gap:12px}.wrc-brand{display:flex;align-items:center;gap:11px}.wrc-mark{width:44px;height:44px;border-radius:16px;background:linear-gradient(145deg,rgba(255,255,255,.68),rgba(255,255,255,.24));display:grid;place-items:center;box-shadow:inset 0 1px 0 rgba(255,255,255,.82),0 12px 28px rgba(36,20,12,.13);overflow:hidden}.wrc-mark img{width:88%;height:88%;object-fit:contain;filter:drop-shadow(0 4px 9px rgba(0,0,0,.12))}.wrc-title h3{margin:0;font-size:17px;font-weight:850;letter-spacing:-.035em}.wrc-title small{display:block;margin-top:1px;color:var(--muted);font-size:12px;font-weight:650}.wrc-close{width:36px;height:36px;border:1px solid rgba(255,255,255,.46);border-radius:14px;background:rgba(255,255,255,.28);color:rgba(24,18,15,.72);font-size:21px;line-height:1;cursor:pointer;backdrop-filter:blur(16px);transition:.16s ease}.wrc-close:hover{background:rgba(255,255,255,.48);color:#160f0c;transform:scale(1.04)}
    .wrc-tabs{margin:0 17px 12px;padding:4px;border-radius:18px;background:rgba(255,255,255,.26);border:1px solid rgba(255,255,255,.42);display:grid;grid-template-columns:1fr 1fr;gap:4px;box-shadow:inset 0 1px 0 rgba(255,255,255,.50)}.wrc-tab{height:38px;border:0;border-radius:14px;background:transparent;color:rgba(24,18,15,.54);font-weight:780;cursor:pointer;transition:.18s ease}.wrc-tab.active{background:rgba(255,255,255,.62);color:#18120f;box-shadow:0 10px 24px rgba(28,18,12,.10),inset 0 1px 0 rgba(255,255,255,.82)}
    .wrc-view{position:relative;z-index:1;display:none;min-height:0;overflow:auto;padding:0 17px 14px}.wrc-view.active{display:block}.wrc-chat-log{display:flex;flex-direction:column;gap:10px;padding:2px 0 10px}.wrc-row{display:flex;align-items:flex-end;gap:8px}.wrc-avatar{width:28px;height:28px;border-radius:11px;background:linear-gradient(145deg,rgba(255,104,45,.9),rgba(255,87,34,.58));display:grid;place-items:center;overflow:hidden;flex:0 0 auto}.wrc-avatar img{width:78%;height:78%;object-fit:contain}.wrc-msg{max-width:86%;padding:11px 13px;border-radius:18px;font-size:14px;line-height:1.45;white-space:pre-wrap;box-shadow:0 10px 26px rgba(28,18,12,.08)}.wrc-msg.bot{background:rgba(255,255,255,.54);border:1px solid rgba(255,255,255,.56);border-bottom-left-radius:7px}.wrc-msg.user{align-self:flex-end;background:linear-gradient(145deg,var(--accent),#ff845d);color:white;border-bottom-right-radius:7px}
    .wrc-voice{height:100%;min-height:330px;display:grid;place-items:center;text-align:center;padding:18px 12px 26px}.wrc-orb{width:164px;height:164px;margin:0 auto 22px;border-radius:50%;background:radial-gradient(circle at 35% 27%,rgba(255,255,255,.95),rgba(255,245,236,.52) 22%,rgba(255,120,66,.36) 48%,rgba(255,87,34,.62) 78%);box-shadow:inset 0 2px 8px rgba(255,255,255,.9),inset 0 -18px 32px rgba(129,44,17,.15),0 24px 74px rgba(255,87,34,.26),0 0 0 1px rgba(255,255,255,.72);position:relative;overflow:hidden;transform-origin:50% 58%}.wrc-orb:before{content:"";position:absolute;inset:18px;border-radius:50%;background:radial-gradient(circle at 35% 20%,rgba(255,255,255,.86),transparent 34%);filter:blur(2px)}.wrc-orb:after{content:"";position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 20deg,transparent,rgba(255,255,255,.45),transparent,rgba(255,87,34,.25),transparent);animation:wrSpin 6s linear infinite;opacity:.72}@keyframes wrSpin{to{transform:rotate(1turn)}}.wrc-orb.live{animation:wrPulse 1.8s ease-in-out infinite}.wrc-orb.speaking{animation:wrSpeak 1.05s cubic-bezier(.35,0,.25,1) infinite;box-shadow:inset 0 2px 8px rgba(255,255,255,.9),0 28px 94px rgba(255,87,34,.42),0 0 0 12px rgba(255,87,34,.08)}@keyframes wrPulse{50%{transform:scale(1.035);filter:saturate(1.12)}}@keyframes wrSpeak{0%,100%{transform:translateY(0) scale(1);border-radius:50%}22%{transform:translateY(-5px) scale(1.035,.965);border-radius:48% 52% 47% 53%}48%{transform:translateY(3px) scale(.982,1.026);border-radius:54% 46% 52% 48%}72%{transform:translateY(-2px) scale(1.018,.99);border-radius:49% 51% 55% 45%}}.wrc-panel.speaking .wrc-status{animation:wrTextBreathe 1.05s ease-in-out infinite}@keyframes wrTextBreathe{50%{opacity:.72;transform:translateY(-1px)}}.wrc-status{font-size:23px;font-weight:860;letter-spacing:-.05em;margin-bottom:7px}.wrc-note{font-size:13px;color:var(--muted);line-height:1.45;margin-bottom:18px}.wrc-primary,.wrc-secondary{height:48px;border:0;border-radius:999px;padding:0 22px;font-weight:860;cursor:pointer}.wrc-primary{color:white;background:linear-gradient(145deg,var(--accent),#ff7b4e);box-shadow:0 16px 34px rgba(255,87,34,.25),inset 0 1px 0 rgba(255,255,255,.28)}.wrc-secondary{background:rgba(255,255,255,.44);border:1px solid rgba(255,255,255,.56);color:#211612}.wrc-live-transcript{display:none;margin:18px auto 0;width:min(292px,100%);border-radius:22px;padding:12px;background:rgba(255,255,255,.30);border:1px solid rgba(255,255,255,.48);box-shadow:inset 0 1px 0 rgba(255,255,255,.55);text-align:left}.wrc-live-transcript.has-lines{display:block}.wrc-live-label{font-size:11px;text-transform:uppercase;letter-spacing:.14em;font-weight:900;color:rgba(24,18,15,.46);margin-bottom:8px}.wrc-live-lines{display:flex;flex-direction:column;gap:6px;max-height:96px;overflow:auto}.wrc-live-line{font-size:12px;line-height:1.35;color:rgba(24,18,15,.78);padding:7px 9px;border-radius:13px;background:rgba(255,255,255,.34)}.wrc-live-line.user{background:rgba(255,87,34,.14);color:#442014}.wrc-compose{display:none;align-items:center;gap:8px;margin:0 17px 17px;padding:8px;border-radius:22px;background:rgba(255,255,255,.36);border:1px solid rgba(255,255,255,.52);box-shadow:inset 0 1px 0 rgba(255,255,255,.55)}.wrc-input{flex:1;height:38px;border:0;background:transparent;outline:0;color:var(--ink);font-size:14px;padding:0 8px}.wrc-input::placeholder{color:rgba(24,18,15,.44)}.wrc-send{width:38px;height:38px;border:0;border-radius:15px;background:linear-gradient(145deg,var(--accent),#ff7b4e);color:white;display:grid;place-items:center;cursor:pointer}.wrc-send svg{width:18px;height:18px}.wrc-toast{position:absolute;left:17px;right:17px;bottom:78px;padding:10px 12px;border-radius:16px;background:rgba(24,18,15,.78);color:white;font-size:12px;text-align:center;opacity:0;transform:translateY(6px);pointer-events:none;transition:.16s ease}.wrc-toast.show{opacity:1;transform:none}
    @media (max-width:520px){.wrc-ai{right:12px;bottom:12px}.wrc-panel{width:calc(100vw - 24px);height:min(620px,calc(100vh - 24px));border-radius:34px}.wrc-fab{width:70px;height:70px;border-radius:25px}.wrc-orb{width:146px;height:146px}}
  `;

  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.className = cfg.inline ? "wrc-ai inline" : (cfg.contained ? "wrc-ai contained" : "wrc-ai");
  root.innerHTML = `
    <button class="wrc-fab" aria-label="Open Rose assistant"><span class="wrc-dot"><img src="${escapeHtml(cfg.logo)}" alt=""></span></button>
    <section class="wrc-panel" aria-label="${escapeHtml(cfg.title)}">
      <header class="wrc-head"><div class="wrc-top"><div class="wrc-brand"><div class="wrc-mark"><img src="${escapeHtml(cfg.logo)}" alt=""></div><div class="wrc-title"><h3>${escapeHtml(cfg.title)}</h3><small>${escapeHtml(cfg.subtitle)}</small></div></div><button class="wrc-close" aria-label="Close">×</button></div></header>
      <div class="wrc-tabs" role="tablist"><button class="wrc-tab" data-view="chat">Chat</button><button class="wrc-tab active" data-view="voice">Voice</button></div>
      <main class="wrc-view" data-view="chat"><div class="wrc-chat-log"><div class="wrc-row"><div class="wrc-avatar"><img src="${escapeHtml(cfg.logo)}" alt=""></div><div class="wrc-msg bot">${escapeHtml(cfg.greeting)}</div></div></div></main>
      <main class="wrc-view active" data-view="voice"><div class="wrc-voice"><div><div class="wrc-orb"></div><div class="wrc-status">Ready when you are</div><div class="wrc-note">Tap start and speak naturally.</div><button class="wrc-primary wrc-start-voice">Start talking</button><button class="wrc-secondary wrc-end-voice" style="display:none">End</button></div></div></main>
      <div class="wrc-compose"><input class="wrc-input" placeholder="${escapeHtml(cfg.placeholder)}"><button class="wrc-send" aria-label="Send"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12h12M12 7l5 5-5 5" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div><div class="wrc-toast"></div>
    </section>`;
  let mount = null;
  try { mount = cfg.mount ? document.querySelector(cfg.mount) : null; } catch { /* Invalid selector: fall back to floating widget. */ }
  (mount || document.body).appendChild(root);

  const $ = sel => root.querySelector(sel);
  const $$ = sel => Array.from(root.querySelectorAll(sel));
  const panel = $(".wrc-panel");
  const fab = $(".wrc-fab");
  const input = $(".wrc-input");
  const log = $(".wrc-chat-log");
  let chatId = null;
  let retellClient = null;
  function voiceVisitorId() {
    const key = 'rose-voice-visitor:' + cfg.businessId;
    try {
      let id = localStorage.getItem(key);
      if (!id || !/^[a-f0-9-]{20,80}$/i.test(id)) {
        id = crypto.randomUUID();
        localStorage.setItem(key, id);
      }
      return id;
    } catch { return crypto.randomUUID(); }
  }

  let voiceBusy = false;

  fab.addEventListener("click", () => { setView("voice"); panel.classList.add("open"); fab.style.display = "none"; });
  $(".wrc-close").addEventListener("click", () => { try { retellClient?.stopCall(); } catch {} voiceBusy = false; $(".wrc-start-voice").disabled = false; panel.classList.remove("open"); fab.style.display = "grid"; });
  $$(".wrc-tab").forEach(t => t.addEventListener("click", () => setView(t.dataset.view)));

  function setView(view) {
    $$(".wrc-tab").forEach(t => t.classList.toggle("active", t.dataset.view === view));
    $$(".wrc-view").forEach(v => v.classList.toggle("active", v.dataset.view === view));
    $(".wrc-compose").style.display = view === "chat" ? "flex" : "none";
  }
  function addMsg(role, text) {
    if (role === "bot") {
      const row = document.createElement("div");
      row.className = "wrc-row";
      row.innerHTML = `<div class="wrc-avatar"><img src="${escapeHtml(cfg.logo)}" alt=""></div>`;
      const bubble = document.createElement("div");
      bubble.className = "wrc-msg bot";
      bubble.textContent = text;
      row.appendChild(bubble);
      log.appendChild(row);
      log.parentElement.scrollTop = log.parentElement.scrollHeight;
      return bubble;
    }
    const el = document.createElement("div");
    el.className = "wrc-msg user";
    el.textContent = text;
    log.appendChild(el);
    log.parentElement.scrollTop = log.parentElement.scrollHeight;
    return el;
  }
  function voiceSpeaker(role) {
    return /agent|assistant|bot|rose/i.test(role || "") ? "bot" : "user";
  }
  function clearVoiceTranscriptBubbles() {
    log?.querySelectorAll('[data-voice-transcript="true"]').forEach(el => {
      const row = el.closest('.wrc-row');
      if (row) row.remove();
      else el.remove();
    });
  }
  function addVoiceParagraph(speaker, text) {
    const clean = String(text || "").trim();
    if (!clean) return;
    const bubble = addMsg(speaker, clean);
    bubble.dataset.voiceTranscript = "true";
    bubble.closest('.wrc-row')?.setAttribute('data-voice-transcript', 'true');
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
  }
  function appendVoiceTranscript(role, text, partial = false) {
    const clean = String(text || "").trim();
    if (!clean || partial) return;
    addVoiceParagraph(voiceSpeaker(role), clean);
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
    if (!r.ok) throw new Error(data.error || "Request failed");
    return data;
  }
  async function ensureChat() {
    if (chatId) return chatId;
    const data = await api("/api/chat/start", { page: location.href, businessId: cfg.businessId, ownerEmail: cfg.ownerEmail, businessName: cfg.businessName, website: cfg.website, businessContext: cfg.businessContext, services: cfg.services });
    chatId = data.chatId;
    return chatId;
  }
  async function submitChat() {
    const content = input.value.trim();
    if (!content) return;
    input.value = "";
    addMsg("user", content);
    const pending = addMsg("bot", "Thinking…");
    try {
      const id = await ensureChat();
      const data = await api("/api/chat/message", { chatId: id, content, businessId: cfg.businessId, ownerEmail: cfg.ownerEmail, businessName: cfg.businessName, website: cfg.website, businessContext: cfg.businessContext, services: cfg.services });
      pending.textContent = data.reply || "I can help with that.";
    } catch (e) {
      pending.textContent = "I hit a connection issue. Please try again shortly.";
      console.error(e);
    }
  }

  $(".wrc-send").addEventListener("click", submitChat);
  input.addEventListener("keydown", e => { if (e.key === "Enter") submitChat(); });
  $(".wrc-start-voice").addEventListener("click", async () => {
    const status = $(".wrc-status"), note = $(".wrc-note"), orb = $(".wrc-orb"), startBtn = $(".wrc-start-voice"), endBtn = $(".wrc-end-voice");
    if (voiceBusy) return;
    voiceBusy = true;
    startBtn.disabled = true;
    try { retellClient?.stopCall(); } catch {}
    try {
      status.textContent = "Connecting…";
      const [{ RetellWebClient }, call] = await Promise.all([
        import("https://esm.sh/retell-client-js-sdk@2.0.7"),
        api("/api/voice/start", { page: location.href, voiceVisitorId: voiceVisitorId(), businessId: cfg.businessId, ownerEmail: cfg.ownerEmail, businessName: cfg.businessName, website: cfg.website, businessContext: cfg.businessContext, services: cfg.services })
      ]);
      retellClient = new RetellWebClient();
      retellClient.on("call_started", () => { panel.classList.remove("speaking"); status.textContent = "Listening"; note.textContent = "Speak naturally. Interrupt anytime."; orb.classList.add("live", "listening"); orb.classList.remove("speaking"); $(".wrc-start-voice").style.display = "none"; $(".wrc-end-voice").style.display = "inline-block"; });
      retellClient.on("update", handleTranscriptUpdate);
      retellClient.on("transcript", handleTranscriptUpdate);
      retellClient.on("conversation_updated", handleTranscriptUpdate);
      retellClient.on("agent_start_talking", () => { panel.classList.add("speaking"); status.textContent = "Rose is speaking"; orb.classList.add("speaking"); orb.classList.remove("listening"); });
      retellClient.on("agent_stop_talking", () => { panel.classList.remove("speaking"); status.textContent = "Listening"; orb.classList.add("listening"); orb.classList.remove("speaking"); });
      retellClient.on("user_start_talking", () => { panel.classList.remove("speaking"); status.textContent = "Listening"; orb.classList.add("listening"); orb.classList.remove("speaking"); });
      retellClient.on("user_stop_talking", () => { panel.classList.remove("speaking"); status.textContent = "Thinking"; orb.classList.remove("listening", "speaking"); });
      retellClient.on("call_ended", () => { panel.classList.remove("speaking"); status.textContent = "Call ended"; note.textContent = "Start another conversation anytime."; orb.classList.remove("live", "listening", "speaking"); $(".wrc-start-voice").style.display = "inline-block"; $(".wrc-end-voice").style.display = "none"; });
      retellClient.on("error", err => { panel.classList.remove("speaking"); console.error(err); status.textContent = "Voice connection failed"; note.textContent = "Please check microphone permission or use chat."; orb.classList.remove("live", "listening", "speaking"); });
      await retellClient.startCall({ accessToken: call.accessToken });
    } catch (err) {
      voiceBusy = false;
      startBtn.disabled = false;
      console.error(err);
      status.textContent = "Voice unavailable";
      note.textContent = "Please use chat for now.";
      startBtn.style.display = "inline-block";
      endBtn.style.display = "none";
    }
  });
  $(".wrc-end-voice").addEventListener("click", () => { try { retellClient?.stopCall(); } catch {} voiceBusy = false; $(".wrc-start-voice").disabled = false; });
})();
