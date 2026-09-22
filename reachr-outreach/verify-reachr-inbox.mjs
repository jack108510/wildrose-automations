#!/usr/bin/env node
// Read-only Reachr private inbox readiness probe. Never prints credentials or message rows.
import fs from 'node:fs';
const path='/Users/jackserver/jsw/keys/reachr-supabase.env';
const load=p=>Object.fromEntries(fs.readFileSync(p,'utf8').split('\n').filter(x=>x.includes('=')).map(x=>{const i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1).trim().replace(/^['"]|['"]$/g,'')]}));
const vars={...load('/Users/jackserver/jsw/keys/repfind.env'),...load(path)};
const base=vars.SUPABASE_URL+'/rest/v1/';
let ready=true;
for(const table of ['reachr_conversations','reachr_messages','reachr_reply_jobs']){
 const query=table+'?select=id&limit=1';
 for(const [role,key] of [['server',vars.SUPABASE_SECRET_KEY],['public',vars.SUPABASE_ANON_KEY]]){
  let status,code='';try{const r=await fetch(base+query,{headers:{apikey:key,Authorization:'Bearer '+key}});status=r.status;if(!r.ok){const v=await r.json();code=v.code||''}if(role==='server'&&status!==200)ready=false;if(role==='public'&&status===200){const rows=await r.json();if(rows.length)ready=false}}
  catch(e){status='network_error';ready=false}
  console.log(`${table} ${role} ${status} ${code}`);
 }
}
console.log('private_inbox_schema_ready',ready);
process.exitCode=ready?0:1;
