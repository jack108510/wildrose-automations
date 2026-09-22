#!/usr/bin/env node
// Private Reachr operations API. No send occurs in this process.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {normalizeConversations} from './reachr-conversation-sync.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const ORIGIN='https://jack108510.github.io';
const AUTH_URL='https://xacehhtgvubcqdoltazg.supabase.co/auth/v1/user';
const PUBLISHABLE='sb_publishable_1TNu5hqotJ7GGQXfjliivQ_ttK51EAA';
const DB_PATH=process.env.REACHR_INBOX_DB||'/Users/jackserver/jsw/keys/reachr-inbox.sqlite';
const BASE='/reachr-inbox';
function source(){const ledger=JSON.parse(fs.readFileSync(path.join(ROOT,'prospects.json'),'utf8')),state=JSON.parse(fs.readFileSync(path.join(ROOT,'reply-monitor-state.json'),'utf8')),evidencePath='/Users/jackserver/jsw/keys/reachr-thread-evidence.json';if(fs.existsSync(evidencePath))state.seen={...state.seen,...JSON.parse(fs.readFileSync(evidencePath,'utf8')).seen};return normalizeConversations(ledger,state).map(x=>({...x,conversation:{...x.conversation,id:x.conversation.external_key,updated_at:x.messages.at(-1)?.observed_at||null}}));}
export function makeApi({dbPath=DB_PATH,load=source,validate=validateToken,workerReady=false}={}){
 fs.mkdirSync(path.dirname(dbPath),{recursive:true,mode:0o700});
 const db=new DatabaseSync(dbPath);db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, business_name TEXT NOT NULL, recipient_name TEXT NOT NULL, messenger_url TEXT NOT NULL, body TEXT NOT NULL, created_by TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN (\'draft\',\'approved\',\'claimed\',\'sending\',\'sent\',\'failed\',\'cancelled\')), created_at TEXT NOT NULL, approved_at TEXT, delivery TEXT, delivery_evidence TEXT);');
 const attempts=new Map();
 try{fs.chmodSync(dbPath,0o600)}catch{}
 function send(res,code,data,headers={}){res.writeHead(code,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...headers});res.end(JSON.stringify(data));}
 function cors(req){return req.headers.origin===ORIGIN?{'access-control-allow-origin':ORIGIN,'vary':'Origin'}:{}}
 async function handler(req,res){const h=cors(req),url=new URL(req.url,'http://localhost');
  if(req.headers.origin&&req.headers.origin!==ORIGIN)return send(res,403,{error:'origin_forbidden'});
  if(url.pathname===BASE+'/health'&&req.method==='GET')return send(res,200,{ok:true},h);
  if(req.method==='OPTIONS'){if(req.headers.origin!==ORIGIN)return send(res,403,{error:'origin_forbidden'});res.writeHead(204,{...h,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'authorization,content-type','access-control-max-age':'600'});return res.end();}
  if(!url.pathname.startsWith(BASE+'/'))return send(res,404,{error:'not_found'},h);
  const token=/^Bearer (.+)$/.exec(req.headers.authorization||'')?.[1];if(!token)return send(res,401,{error:'unauthorized'},h);
  const peer=req.socket.remoteAddress||'local',now=Date.now(),rate=attempts.get(peer);if(!rate||now-rate.start>60000)attempts.set(peer,{start:now,count:1});else if(++rate.count>120)return send(res,429,{error:'rate_limited'},h);
  let user;try{user=await validate(token)}catch{return send(res,401,{error:'unauthorized'},h)}
  if(!user?.id)return send(res,401,{error:'unauthorized'},h);
  if(user.email!=='wildejack1010@gmail.com'||!user.email_confirmed_at)return send(res,403,{error:'forbidden'},h);
  let rows;try{rows=load()}catch{return send(res,503,{error:'source_unavailable'},h)}
  const conversations=rows.map(x=>x.conversation);
  if(url.pathname===BASE+'/conversations'&&req.method==='GET')return send(res,200,conversations.map(({id,business_name,recipient_name,updated_at,sender_actor_id,sender_actor_name})=>({id,business_name,recipient_name,updated_at,sender_verified:Boolean(workerReady&&sender_actor_id&&sender_actor_name)})),h);
  if(url.pathname===BASE+'/messages'&&req.method==='GET'){const row=rows.find(x=>x.conversation.id===url.searchParams.get('conversation_id'));return row?send(res,200,row.messages,h):send(res,404,{error:'not_found'},h)}
  if(url.pathname===BASE+'/jobs'&&req.method==='GET')return send(res,200,db.prepare('SELECT id,conversation_id,business_name,recipient_name,body,status,created_at,approved_at,delivery,delivery_evidence FROM jobs WHERE created_by=? ORDER BY created_at DESC LIMIT 100').all(user.id),h);
  if(req.method!=='POST')return send(res,404,{error:'not_found'},h);
  let body='';try{for await(const part of req){body+=part;if(body.length>16384)throw Error('too_large')}body=JSON.parse(body)}catch{return send(res,400,{error:'invalid_body'},h)}
  if(url.pathname===BASE+'/drafts'){
   if(typeof body.body!=='string'||!body.body.trim()||body.body.length>4000)return send(res,400,{error:'invalid_message'},h);
   const row=rows.find(x=>x.conversation.id===body.conversation_id);if(!row)return send(res,404,{error:'conversation_unverified'},h);
   const c=row.conversation;if(!c.recipient_name||!c.messenger_url)return send(res,409,{error:'recipient_unverified'},h);
   let route;try{route=new URL(c.messenger_url)}catch{}if(!route||route.protocol!=='https:'||!['www.messenger.com','messenger.com','www.facebook.com','facebook.com','m.me'].includes(route.hostname)||/marketplace/i.test(route.pathname))return send(res,409,{error:'route_unverified'},h);
   const id=crypto.randomUUID(),now=new Date().toISOString();db.prepare('INSERT INTO jobs (id,conversation_id,business_name,recipient_name,messenger_url,body,created_by,status,created_at) VALUES (?,?,?,?,?,?,?,\'draft\',?)').run(id,c.id,c.business_name,c.recipient_name,c.messenger_url,body.body,user.id,now);
   return send(res,201,{id,status:'draft',body:body.body,recipient_name:c.recipient_name},h);
  }
  const match=new RegExp('^'+BASE+'/jobs/([0-9a-f-]+)/approve$').exec(url.pathname);
  if(match){if(!workerReady)return send(res,503,{error:'verified_worker_not_active'},h);const job=db.prepare('SELECT * FROM jobs WHERE id=? AND created_by=?').get(match[1],user.id);if(!job)return send(res,404,{error:'not_found'},h);
   if(body.explicit_approval!==true||body.exact_body!==job.body||body.recipient_name!==job.recipient_name)return send(res,409,{error:'confirmation_mismatch'},h);
   const row=rows.find(x=>x.conversation.id===job.conversation_id);if(!row||row.conversation.recipient_name!==job.recipient_name||row.conversation.messenger_url!==job.messenger_url)return send(res,409,{error:'source_changed'},h);
   if(!row.conversation.sender_actor_id||!row.conversation.sender_actor_name)return send(res,409,{error:'sender_actor_unverified'},h);
   const result=db.prepare("UPDATE jobs SET status='approved',approved_at=? WHERE id=? AND status='draft' AND created_by=?").run(new Date().toISOString(),job.id,user.id);if(!result.changes)return send(res,409,{error:'not_draft'},h);
   return send(res,200,{id:job.id,status:'approved'},h);
  }
  return send(res,404,{error:'not_found'},h);
 }
 return {server:http.createServer((req,res)=>{handler(req,res).catch(()=>send(res,500,{error:'internal_error'},cors(req)))}),db};
}
async function validateToken(token){const r=await fetch(AUTH_URL,{headers:{apikey:PUBLISHABLE,Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error('invalid_token');return r.json()}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const {server}=makeApi();server.listen(Number(process.env.REACHR_INBOX_PORT||4192),'127.0.0.1',()=>console.log('Reachr private inbox API listening locally'));}
