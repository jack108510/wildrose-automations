#!/usr/bin/env node
import http from 'node:http';

const endpoint = 'http://127.0.0.1:9223/json/list';
const getJson = url => new Promise((resolve, reject) => http.get(url, response => {
  let body = '';
  response.on('data', chunk => { body += chunk; });
  response.on('end', () => {
    try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
  });
}).on('error', reject));

async function connect(wsUrl) {
  const socket = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    const resolve = pending.get(message.id);
    if (resolve) { pending.delete(message.id); resolve(message); }
  });
  return {
    socket,
    call: (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++nextId;
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`CDP call timed out: ${method}`));
      }, 15000);
      pending.set(id, message => { clearTimeout(timeout); resolve(message); });
      socket.send(JSON.stringify({ id, method, params }));
    })
  };
}

const tabs = await getJson(endpoint);
const dashboard = tabs.find(tab => tab.type === 'page' && /fb-autoposter\/dashboard\.html/.test(tab.url));
if (!dashboard) throw new Error('Reachr dashboard tab is not open in the authenticated Chrome session.');
const { socket, call } = await connect(dashboard.webSocketDebuggerUrl);
try {
  const response = await call('Runtime.evaluate', {
    expression: "JSON.stringify({hasSb:!!window.sb, booted:!!window.__amplrBooted, href:location.href})",
    returnByValue: true
  });
  const value = response.result?.result?.value;
  if (!value || value.error) throw new Error(value?.error?.message || 'Could not load saved groups.');
  console.log(JSON.stringify(value.data || [], null, 2));
} finally {
  socket.close();
}
