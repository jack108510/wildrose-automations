const http = require('http');
const groupUrl = process.argv[2];
if (!groupUrl) throw new Error('Usage: node inspect-facebook-group-focused.cjs <Facebook group URL>');
function tabs() { return new Promise((resolve, reject) => http.get('http://127.0.0.1:9223/json/list', res => { let body=''; res.on('data', c=>body+=c); res.on('end',()=>{ try { resolve(JSON.parse(body)); } catch (e) { reject(e); } }); }).on('error',reject)); }
function connect(url) { return new Promise((resolve,reject)=>{ const socket=new WebSocket(url); socket.addEventListener('open',()=>resolve(socket),{once:true}); socket.addEventListener('error',reject,{once:true}); }); }
function caller(socket) { let id=0; const pending=new Map(); socket.addEventListener('message',event=>{const m=JSON.parse(event.data); if(pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}}); return (method,params={})=>new Promise(resolve=>{const n=++id;pending.set(n,resolve);socket.send(JSON.stringify({id:n,method,params}));}); }
(async()=>{
  const seed=(await tabs()).find(t=>t.type==='page'); if(!seed) throw Error('No browser page');
  const s=await connect(seed.webSocketDebuggerUrl); const call=caller(s); const created=await call('Target.createTarget',{url:groupUrl}); s.close();
  await new Promise(r=>setTimeout(r,3000)); const tab=(await tabs()).find(t=>t.id===created.result?.targetId); if(!tab) throw Error('No group tab');
  const socket=await connect(tab.webSocketDebuggerUrl); const ask=caller(socket); await ask('Page.bringToFront'); await new Promise(r=>setTimeout(r,7000));
  const res=await ask('Runtime.evaluate',{expression:`JSON.stringify({title:document.title,body:document.body.innerText.slice(0,14000),articles:[...document.querySelectorAll('[role="article"]')].map(a=>({text:(a.innerText||'').slice(0,1400),links:[...a.querySelectorAll('a[href]')].map(x=>({text:(x.innerText||'').trim(),href:x.href})).filter(x=>x.text).slice(0,20)})).filter(x=>x.text).slice(0,12)})`,returnByValue:true}); console.log(res.result?.result?.value||'{}');socket.close();
})().catch(e=>{console.error(e.message);process.exit(1)});
