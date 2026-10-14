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
  const source = rawSource === 'facebook' || rawSource === 'instagram' ? rawSource : 'direct';
  const rawContent = params.get('utm_content') || '';
  const content = /^[a-zA-Z0-9_-]{1,60}$/.test(rawContent) ? rawContent : '';
  window.wrFunnel = function (event) {
    if (!['landing','preview_attempt','preview_ready','preview_error','widget_open','chat_send','voice_attempt','purchase_view','meeting_view'].includes(event)) return;
    const body = { event, sessionId, source, content, page: location.pathname };
    fetch(api + '/api/rose-funnel-event', { method:'POST', mode:'cors', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body), keepalive:true }).catch(() => {});
  };
})();
