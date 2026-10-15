// Anonymous first-party Rose funnel milestones. No visitor text, URL query, contact fields or IP is sent.
(function () {
  const script = document.currentScript;
  const api = script?.dataset.apiBase || 'https://rose-publisher.wildeautomations.com';
  const params = new URLSearchParams(location.search);
  let sessionId;
  try {
    sessionId = sessionStorage.getItem('roseFunnelSession');
    if (!/^[a-zA-Z0-9_-]{20,80}$/.test(sessionId || '')) {
      sessionId = crypto.randomUUID().replaceAll('-', '');
      sessionStorage.setItem('roseFunnelSession', sessionId);
    }
  } catch { sessionId = crypto.randomUUID().replaceAll('-', ''); }
  const rawSource = (params.get('utm_source') || '').toLowerCase();
  const source = params.get('utm_medium') === 'reachr' ? 'facebook' :
    rawSource === 'facebook' || rawSource === 'instagram' ? rawSource : 'direct';
  const rawContent = params.get('utm_content') || '';
  const content = /^[a-zA-Z0-9_-]{1,60}$/.test(rawContent) ? rawContent : '';
  const rawCampaign = params.get('reachr_campaign') || params.get('utm_campaign') || '';
  const campaign = /^[a-zA-Z0-9_-]{1,80}$/.test(rawCampaign) ? rawCampaign : '';
  const rawGroup = params.get('reachr_group') || params.get('utm_term') || '';
  const group = /^[a-zA-Z0-9_-]{1,100}$/.test(rawGroup) ? rawGroup : '';
  window.wrFunnel = function (event) {
    if (!['landing','engaged_visit','preview_attempt','preview_ready','preview_error','widget_open','chat_send','voice_attempt','purchase_view','meeting_view','lead_saved'].includes(event)) return;
    const body = { event, sessionId, source, content, campaign, group, page: location.pathname };
    fetch(api + '/api/rose-funnel-event', { method:'POST', mode:'cors', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body), keepalive:true }).catch(() => {});
  };
  // A page load alone includes link scanners. This stronger signal requires a
  // visible page for eight seconds and a trusted pointer/touch/key action.
  // It is still a likelihood signal; browser automation can mimic interaction.
  if (source === 'facebook' && campaign && group && document.addEventListener) {
    let visibleMs = 0;
    let interacted = false;
    let sent = false;
    let lastTick = Date.now();
    const maybeSend = () => {
      if (!sent && interacted && visibleMs >= 8000) {
        sent = true;
        window.wrFunnel('engaged_visit');
        clearInterval(timer);
      }
    };
    for (const type of ['pointerdown', 'touchstart', 'keydown']) {
      document.addEventListener(type, event => {
        if (event.isTrusted !== true) return;
        interacted = true;
        maybeSend();
      }, { passive: true, once: false });
    }
    const timer = setInterval(() => {
      const now = Date.now();
      if (document.visibilityState === 'visible') visibleMs += Math.min(now - lastTick, 1250);
      lastTick = now;
      maybeSend();
    }, 1000);
  }
})();
