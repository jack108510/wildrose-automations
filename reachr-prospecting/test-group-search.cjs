const fs = require('fs');
const http = require('http');
const path = require('path');

const group = process.argv[2];
if (!group) {
  console.error('usage: node test-group-search.cjs https://www.facebook.com/groups/<group>');
  process.exit(2);
}
const source = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function get(url) {
  return new Promise((resolve, reject) => http.get(url, response => {
    let body = '';
    response.on('data', chunk => body += chunk);
    response.on('end', () => { try { resolve(JSON.parse(body)); } catch (error) { reject(error); } });
  }).on('error', reject));
}
function connect(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.onopen = () => {
      let id = 0;
      const pending = new Map();
      socket.onmessage = event => {
        const message = JSON.parse(event.data);
        const handler = pending.get(message.id);
        if (handler) { pending.delete(message.id); handler(message.result); }
      };
      resolve({ socket, command: (method, params = {}) => new Promise(done => {
        const requestId = ++id;
        pending.set(requestId, done);
        socket.send(JSON.stringify({ id: requestId, method, params }));
      }) });
    };
    socket.onerror = reject;
  });
}
(async () => {
  const tabs = await get('http://127.0.0.1:9223/json/list');
  const seed = tabs.find(tab => tab.type === 'page');
  const controller = await connect(seed.webSocketDebuggerUrl);
  const url = `${group.replace(/\/$/, '')}?sorting_setting=CHRONOLOGICAL`;
  const created = await controller.command('Target.createTarget', { url, background: true });
  await sleep(9000);
  const current = await get('http://127.0.0.1:9223/json/list');
  const tab = current.find(item => item.id === created.targetId);
  const connection = await connect(tab.webSocketDebuggerUrl);
  await connection.command('Runtime.evaluate', { expression: `${source};true` });
  const rounds = [];
  for (let index = 0; index < 4; index += 1) {
    const scan = await connection.command('Runtime.evaluate', {
      expression: 'JSON.stringify(globalThis.__reachrScanVisibleGroupPromotions())',
      returnByValue: true,
    });
    rounds.push(JSON.parse(scan.result.value));
    if (index < 3) {
      await connection.command('Runtime.evaluate', { expression: 'window.scrollBy(0, Math.max(window.innerHeight * 2, 1600)); true' });
      await sleep(1500);
    }
  }
  console.log(JSON.stringify(rounds, null, 2));
  connection.socket.close();
  await controller.command('Target.closeTarget', { targetId: created.targetId });
  controller.socket.close();
})().catch(error => { console.error(error); process.exit(1); });
