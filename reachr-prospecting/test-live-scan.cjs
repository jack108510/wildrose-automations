const fs = require('fs');
const http = require('http');
const source = fs.readFileSync(require('path').join(__dirname, 'content.js'), 'utf8');
function getJson(url) { return new Promise((resolve, reject) => http.get(url, res => { let body=''; res.on('data', c => body += c); res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } }); }).on('error', reject)); }
function connect(url) { return new Promise((resolve, reject) => { const ws = new WebSocket(url); ws.onopen = () => resolve(ws); ws.onerror = reject; }); }
(async () => {
  const tabs = await getJson('http://127.0.0.1:9223/json/list');
  const tab = tabs.find(t => t.type === 'page' && /facebook\.com\/groups\/[^/]+\/?$/.test(t.url));
  if (!tab) throw new Error('No open Facebook group feed tab.');
  const ws = await connect(tab.webSocketDebuggerUrl); let id = 0; const pending = new Map();
  ws.onmessage = event => { const message = JSON.parse(event.data); if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); } };
  const call = (method, params = {}) => new Promise(resolve => { const n = ++id; pending.set(n, resolve); ws.send(JSON.stringify({ id: n, method, params })); });
  await call('Runtime.evaluate', { expression: source });
  const result = await call('Runtime.evaluate', { expression: 'JSON.stringify(globalThis.__reachrScanVisibleGroupPromotions())', returnByValue: true });
  ws.close();
  const value = result.result?.result?.value;
  if (!value) throw new Error(result.result?.exceptionDetails?.text || 'Live scan returned no value.');
  console.log(value);
})().catch(error => { console.error(error.message); process.exit(1); });
