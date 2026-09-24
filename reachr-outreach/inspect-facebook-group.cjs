const http = require('http');
const groupUrl = process.argv[2];
if (!groupUrl) throw new Error('Usage: node inspect-facebook-group.cjs <Facebook group URL>');

function getTabs() {
  return new Promise((resolve, reject) => http.get('http://127.0.0.1:9223/json/list', res => {
    let body = ''; res.on('data', chunk => body += chunk); res.on('end', () => {
      try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
    });
  }).on('error', reject));
}
function connect(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.addEventListener('open', () => resolve(socket), { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
}
function call(socket) {
  let next = 0;
  const waiters = new Map();
  socket.addEventListener('message', event => { const data = JSON.parse(event.data); if (waiters.has(data.id)) { waiters.get(data.id)(data); waiters.delete(data.id); } });
  return (method, params = {}) => new Promise(resolve => { const id = ++next; waiters.set(id, resolve); socket.send(JSON.stringify({ id, method, params })); });
}
(async () => {
  const seed = (await getTabs()).find(tab => tab.type === 'page');
  if (!seed) throw new Error('No logged-in Facebook browser tab available');
  const seedSocket = await connect(seed.webSocketDebuggerUrl);
  const seedCall = call(seedSocket);
  const created = await seedCall('Target.createTarget', { url: groupUrl });
  seedSocket.close();
  await new Promise(resolve => setTimeout(resolve, 12000));
  const tab = (await getTabs()).find(item => item.id === created.result?.targetId);
  if (!tab) throw new Error('Facebook group tab did not remain available');
  const socket = await connect(tab.webSocketDebuggerUrl);
  const ask = call(socket);
  const result = await ask('Runtime.evaluate', { expression: `JSON.stringify({title:document.title,articles:[...document.querySelectorAll('[role="article"]')].map(a=>({text:(a.innerText||'').slice(0,1400),links:[...a.querySelectorAll('a[href]')].map(x=>({text:(x.innerText||'').trim(),href:x.href})).filter(x=>x.text).slice(0,18)})).filter(x=>x.text).slice(0,12)})`, returnByValue: true });
  console.log(result.result?.result?.value || '{}');
  socket.close();
})().catch(error => { console.error(error.message); process.exit(1); });
