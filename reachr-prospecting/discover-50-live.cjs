const fs=require('fs'),http=require('http'),path=require('path');
const CDP='http://127.0.0.1:9223',TARGET=80,BATCH=6,WAIT_MS=7500,MAX_GROUPS=382;
const resultPath=path.join(__dirname,'discovery-50-results.json');
const contentSource=fs.readFileSync(path.join(__dirname,'content.js'),'utf8');
function getJson(url){return new Promise((r,j)=>http.get(url,x=>{let b='';x.on('data',c=>b+=c);x.on('end',()=>{try{r(JSON.parse(b))}catch(e){j(e)}})}).on('error',j))}
function connect(wsUrl){return new Promise((resolve,reject)=>{const ws=new WebSocket(wsUrl);ws.addEventListener('open',()=>{let id=0;const wait=new Map();ws.addEventListener('message',e=>{const m=JSON.parse(e.data),p=wait.get(m.id);if(p){wait.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)}});resolve({ws,call:(method,params={})=>new Promise((res,rej)=>{const n=++id,timer=setTimeout(()=>{wait.delete(n);rej(Error(`${method} timeout`))},20000);wait.set(n,{resolve:res,reject:rej,timer});ws.send(JSON.stringify({id:n,method,params}))})})},{once:true});ws.addEventListener('error',reject,{once:true})})}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function norm(v=''){return String(v).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
async function scanTarget(tab){const c=await connect(tab.webSocketDebuggerUrl);try{await c.call('Runtime.evaluate',{expression:contentSource});const r=await c.call('Runtime.evaluate',{expression:'JSON.stringify(globalThis.__reachrScanVisibleGroupPromotions())',returnByValue:true});return JSON.parse(r.result?.value||'{}')}finally{c.ws.close()}}
(async()=>{
 const initial=await getJson(`${CDP}/json/list`),dash=initial.find(t=>t.type==='page'&&/fb-autoposter\/dashboard\.html/.test(t.url));if(!dash)throw Error('Reachr dashboard unavailable');
 const ctl=await connect(dash.webSocketDebuggerUrl);const q=await ctl.call('Runtime.evaluate',{expression:`JSON.stringify((cachedData?.groups||[]).map(g=>({name:g.name||'',url:g.url||''})))`,returnByValue:true});
 const all=JSON.parse(q.result?.value||'[]'),pattern=/business|entrepreneur|advertis|promot|vendor|marketplace|buy.{0,5}sell|networking|small biz/i,seenUrls=new Set();
 const previous=fs.existsSync(resultPath)?JSON.parse(fs.readFileSync(resultPath,'utf8')):{prospects:[],attempts:[]};
 const attemptedUrls=new Set((previous.attempts||[]).map(x=>x.group?.url).filter(Boolean));
 const unique=all.filter(g=>g.url&&!seenUrls.has(g.url)&&seenUrls.add(g.url));
 const groups=[...unique.filter(g=>pattern.test(g.name)),...unique.filter(g=>!pattern.test(g.name))].filter(g=>!attemptedUrls.has(g.url)).slice(0,MAX_GROUPS);
 const prospects=new Map((previous.prospects||[]).map(p=>[norm(p.businessName),p])),attempts=[...(previous.attempts||[])];
 for(let offset=0;offset<groups.length&&prospects.size<TARGET;offset+=BATCH){
  const batch=groups.slice(offset,offset+BATCH),opened=[];
  for(const group of batch){try{const x=await ctl.call('Target.createTarget',{url:group.url,background:true});opened.push({group,id:x.targetId})}catch(e){attempts.push({group,error:e.message})}}
  await sleep(WAIT_MS);const tabs=await getJson(`${CDP}/json/list`);
  for(const item of opened){
   const tab=tabs.find(t=>t.id===item.id);
   if(!tab){attempts.push({group:item.group,error:'tab missing'});continue}
   try{
    const result=await scanTarget(tab);
    attempts.push({group:item.group,title:result.sourceGroupName,count:result.count||0,ok:result.ok});
    for(const c of result.candidates||[]){
     const key=norm(c.businessName);if(!key||key.length<3)continue;
     const source={sourceGroupName:c.sourceGroupName,sourceGroupUrl:c.sourceGroupUrl,postUrl:c.postUrl||'',observedText:c.observedText,observedAt:c.observedAt,promotionSignals:c.promotionSignals};
     if(prospects.has(key)){
      const old=prospects.get(key);
      if(!old.sources.some(s=>s.sourceGroupUrl===source.sourceGroupUrl&&s.observedText===source.observedText))old.sources.push(source);
     }else{
      prospects.set(key,{businessName:c.businessName,businessUrl:c.businessUrl||'',draft:c.draft,status:'discovered_pending_review',sources:[source]});
     }
    }
   }catch(e){attempts.push({group:item.group,error:e.message})}
  }
  for(const item of opened)try{await ctl.call('Target.closeTarget',{targetId:item.id})}catch{}
  console.error(`progress groups=${Math.min(offset+BATCH,groups.length)}/${groups.length} prospects=${prospects.size}/${TARGET}`);
 }
 ctl.ws.close();const found=[...prospects.values()].slice(0,TARGET),out={schema:'reachr.discovery.v1',createdAt:new Date().toISOString(),target:TARGET,groupsAvailable:groups.length,groupsScanned:attempts.filter(x=>x.ok).length,groupsAttempted:attempts.length,count:found.length,complete:found.length>=TARGET,prospects:found,attempts};
 fs.writeFileSync(resultPath,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({complete:out.complete,count:out.count,groupsScanned:out.groupsScanned,groupsAttempted:out.groupsAttempted,resultPath,names:found.map(x=>x.businessName)},null,2));
})().catch(e=>{console.error(e.stack||e);process.exit(1)});