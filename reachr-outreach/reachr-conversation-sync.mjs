#!/usr/bin/env node
// One-way evidence-backed Reachr inbox sync. Read-only unless --execute is explicit.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const KEY_FILE='/Users/jackserver/jsw/keys/reachr-supabase.env';
const norm=x=>String(x||'').trim().toLocaleLowerCase('en-US');
// Classify only provenance fields, never message text (which may mention Marketplace incidentally).
const isMarketplace=x=>[x.sourceUrl,x.messengerUrl,x.source,x.channel,x.surface,x.placement].some(v=>/marketplace/i.test(String(v||'')));
const stableHash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
export function normalizeConversations(ledger,state){
  const allowed=new Map();
  for(const record of ledger.prospects||[]){
    if(!['messenger_confirmed','messenger_ui_confirmed'].includes(record.delivery)||isMarketplace(record))continue;
    const name=String(record.businessName||'').trim();
    const url=String(record.messengerUrl||'').trim();
    let route;try{route=new URL(url)}catch{continue}
    if(!name||route.protocol!=='https:'||!['www.facebook.com','facebook.com','www.messenger.com','messenger.com','m.me'].includes(route.hostname))continue;
    for(const key of new Set([norm(name),norm(record.recipientName)].filter(Boolean))){
      if(allowed.has(key)&&allowed.get(key)!==record){allowed.set(key,null);continue;} // ambiguous alias: fail closed
      if(!allowed.has(key))allowed.set(key,record);
    }
  }
  const byKey=new Map();
  for(const [sourceId,reply] of Object.entries(state.seen||{})){
    if(isMarketplace(reply)||reply.classification?.reason==='outbound_or_empty'||reply.threadTextVerified!==true)continue;
    const record=allowed.get(norm(reply.businessName));
    if(!record||![norm(record.businessName),norm(record.recipientName)].includes(norm(reply.threadSpeaker)))continue; // exact inspected speaker, not inbox-row guess
    const body=String(reply.preview||'').trim();
    if(!body)continue;
    const key=stableHash([record.businessName,record.messengerUrl]);
    if(!byKey.has(key))byKey.set(key,{conversation:{external_key:key,business_name:record.businessName,recipient_name:record.recipientName||null,messenger_url:record.messengerUrl,marketplace_excluded:false},messages:[]});
    const result=byKey.get(key);
    const received=reply.observedAt&&Number.isFinite(Date.parse(reply.observedAt))?new Date(reply.observedAt).toISOString():null;
    result.messages.push({direction:'inbound',body,observed_at:received,provenance:`reply-monitor-preview:${stableHash([sourceId,body]).slice(0,32)}`});
    if(record.lastReplySentMessage){
      result.messages.push({direction:'outbound',body:record.lastReplySentMessage,observed_at:record.lastReplySentAt&&Number.isFinite(Date.parse(record.lastReplySentAt))?new Date(record.lastReplySentAt).toISOString():null,provenance:`outbound-ledger:${stableHash([record.businessName,record.lastReplySentMessage]).slice(0,32)}`});
    }
    // Initial confirmed send text is direct ledger evidence, not an inferred response.
    if(record.sentMessage){
      result.messages.push({direction:'outbound',body:record.sentMessage,observed_at:record.sentAt&&Number.isFinite(Date.parse(record.sentAt))?new Date(record.sentAt).toISOString():null,provenance:`confirmed-ledger:${stableHash([record.businessName,record.sentMessage]).slice(0,32)}`});
    }
  }
  return [...byKey.values()].map(x=>({...x,messages:[...new Map(x.messages.map(m=>[m.provenance,m])).values()].sort((a,b)=>Date.parse(a.observed_at||0)-Date.parse(b.observed_at||0))}));
}
function credentials(){const d={};for(const line of fs.readFileSync(KEY_FILE,'utf8').split('\n')){const i=line.indexOf('=');if(i>0)d[line.slice(0,i)]=line.slice(i+1).trim().replace(/^['"]|['"]$/g,'')}if(!d.SUPABASE_URL||!d.SUPABASE_SECRET_KEY)throw Error('server-only Supabase credentials unavailable');return d}
async function request(url,key,method,body){const r=await fetch(url,{method,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=representation'},body:body&&JSON.stringify(body)});if(!r.ok){const detail=await r.json().catch(()=>({}));throw Error(`Supabase ${r.status}: ${detail.code||'request_failed'}`)}return r.json()}
export async function sync({execute=false,ledgerFile=path.join(ROOT,'prospects.json'),stateFile=path.join(ROOT,'reply-monitor-state.json')}={}){
  const normalized=normalizeConversations(JSON.parse(fs.readFileSync(ledgerFile,'utf8')),JSON.parse(fs.readFileSync(stateFile,'utf8')));
  const summary={dry_run:!execute,conversations:normalized.length,messages:normalized.reduce((n,x)=>n+x.messages.length,0)};
  if(!execute)return summary;
  const {SUPABASE_URL:url,SUPABASE_SECRET_KEY:key}=credentials();
  // Verify schema before any mutations. Fail closed if migration has not been applied.
  await request(`${url}/rest/v1/reachr_conversations?select=id&limit=1`,key,'GET');
  await request(`${url}/rest/v1/reachr_messages?select=id&limit=1`,key,'GET');
  let written=0;
  for(const {conversation,messages} of normalized){
    const [row]=await request(`${url}/rest/v1/reachr_conversations?on_conflict=external_key`,key,'POST',[conversation]);
    if(!row?.id)throw Error('conversation upsert did not return id');
    for(const message of messages){
      // SQL unique (conversation_id, provenance) makes repeated/concurrent sync idempotent.
      await request(`${url}/rest/v1/reachr_messages?on_conflict=conversation_id,provenance`,key,'POST',[{...message,conversation_id:row.id}]);written++;
    }
  }
  return {...summary,dry_run:false,written};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 sync({execute:process.argv.includes('--execute')}).then(x=>console.log(JSON.stringify(x))).catch(e=>{console.error(e.message);process.exitCode=1});
}
