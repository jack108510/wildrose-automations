const http = require('http');
const url = process.argv[2];
if (!url) throw new Error('url required');
function get(u) {
  return new Promise((resolve, reject) => http.get(u, response => {
    let body = '';
    response.on('data', chunk => body += chunk);
    response.on('end', () => { try { resolve(JSON.parse(body)); } catch (error) { reject(error); } });
  }).on('error', reject));
}
function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      let id = 0;
      const pending = new Map();
      ws.onmessage = event => {
        const message = JSON.parse(event.data);
        const handler = pending.get(message.id);
        if (!handler) return;
        pending.delete(message.id);
        clearTimeout(handler.timer);
        message.error ? handler.reject(new Error(message.error.message)) : handler.resolve(message.result);
      };
      resolve({
        ws,
        call(method, params = {}) {
          return new Promise((resolveCall, rejectCall) => {
            const requestId = ++id;
            const timer = setTimeout(() => { pending.delete(requestId); rejectCall(new Error(`${method} timeout`)); }, 20000);
            pending.set(requestId, { resolve: resolveCall, reject: rejectCall, timer });
            ws.send(JSON.stringify({ id: requestId, method, params }));
          });
        }
      });
    };
    ws.onerror = reject;
  });
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  const tabs = await get('http://127.0.0.1:9223/json/list');
  const controllerTarget = tabs.find(target => target.type === 'page' && /fb-autoposter\/dashboard/.test(target.url)) || tabs.find(target => target.type === 'page');
  if (!controllerTarget) throw new Error('No CDP page target');
  const controller = await connect(controllerTarget.webSocketDebuggerUrl);
  const created = await controller.call('Target.createTarget', { url, background: true });
  await sleep(7000);
  const liveTabs = await get('http://127.0.0.1:9223/json/list');
  const target = liveTabs.find(item => item.id === created.targetId);
  if (!target) throw new Error('Created target missing');
  const page = await connect(target.webSocketDebuggerUrl);
  const expression = `(() => ({
    url: location.href,
    title: document.title,
    body: document.body.innerText.slice(0, 5000),
    canonical: document.querySelector('link[rel="canonical"]')?.href || '',
    buttons: [...document.querySelectorAll('[role="button"],button')].map(e => (e.innerText || e.getAttribute('aria-label') || '').trim()).filter(Boolean).slice(0,100),
    fields: [...document.querySelectorAll('input,textarea,[contenteditable="true"],[role="textbox"]')].map(e => ({tag:e.tagName,type:e.getAttribute('type')||'',aria:e.getAttribute('aria-label')||'',placeholder:e.getAttribute('placeholder')||'',text:(e.innerText||e.value||'').trim()})),
    anchors: [...document.querySelectorAll('a[href]')].map(a => ({text:(a.innerText||a.getAttribute('aria-label')||'').trim(),href:a.href})).filter(x => x.text).slice(0,80),
    messageLinks: [...document.querySelectorAll('a[href]')].map(a => ({text:(a.innerText||a.getAttribute('aria-label')||'').trim(),href:a.href})).filter(x => /message|messenger|m\.me/i.test(x.text+' '+x.href)).slice(0,30)
  }))()`;
  const result = await page.call('Runtime.evaluate', { expression, returnByValue: true });
  console.log(JSON.stringify({ targetId: created.targetId, ...result.result.value }, null, 2));
  page.ws.close();
  await controller.call('Target.closeTarget', { targetId: created.targetId });
  controller.ws.close();
})().catch(error => { console.error(error.stack || error); process.exit(1); });
