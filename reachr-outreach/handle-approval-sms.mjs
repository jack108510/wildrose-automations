#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, loadState, sendSms, updateState } from './reachr-sms-approvals.mjs';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]||'':''}
function b64(name){const v=arg(name);return v?Buffer.from(v,'base64').toString('utf8'):''}
function phone(v){return String(v||'').replace(/\D/g,'')}
const from=b64('--from-b64')||arg('--from');
const body=(b64('--body-b64')||arg('--body')).trim();
const sid=b64('--sid-b64')||arg('--sid')||`manual-${Date.now()}`;
const owner=config().ownerPhone;
if(phone(from)!==phone(owner)){console.log(JSON.stringify({handled:false,reason:'sender_not_owner'}));process.exit(0)}
if(loadState().inboundSids?.[sid]){console.log(JSON.stringify({handled:true,duplicate:true}));process.exit(0)}
const m=body.match(/^\s*(TEST|SEND|EDIT|SKIP)\s+([A-F0-9]{12})(?:\s*:\s*|\s+)?([\s\S]*)$/i);
if(!m){updateState(s=>{s.inboundSids[sid]={receivedAt:new Date().toISOString(),handled:false}});console.log(JSON.stringify({handled:false,reason:'not_approval_command'}));process.exit(0)}
const command=m[1].toUpperCase(),code=m[2].toUpperCase(),edited=(m[3]||'').trim();
let approval;
try{approval=updateState(s=>{
 s.inboundSids[sid]={receivedAt:new Date().toISOString(),handled:true,command,code};
 const a=s.approvals[code];if(!a)throw Error('approval code not found');
 if(!['pending','send_failed','notification_failed'].includes(a.status))throw Error(`approval already ${a.status}`);
 if(command==='TEST'&&a.type!=='test')throw Error('not a test code');
 if(command!=='TEST'&&a.type==='test')throw Error('test code only accepts TEST');
 if(command==='EDIT'&&!edited)throw Error('EDIT requires message text');
 if(command==='SEND'&&!a.suggestedReply)throw Error('no suggested reply; use EDIT');
 if(command==='SKIP'){a.status='skipped';a.decidedAt=new Date().toISOString();return {...a}}
 if(command==='TEST'){a.status='test_confirmed';a.decidedAt=new Date().toISOString();return {...a}}
 a.status='processing';a.decision=command;a.finalReply=command==='EDIT'?edited:a.suggestedReply;a.decidedAt=new Date().toISOString();return {...a};
})}catch(e){await sendSms(owner,`Reachr approval error: ${e.message}`).catch(()=>{});console.error(`ERROR:${e.message}`);process.exit(1)}
if(command==='SKIP'){await sendSms(owner,`Skipped Reachr reply [${code}]. Nothing was sent.`);console.log(JSON.stringify({handled:true,command,status:'skipped'}));process.exit(0)}
if(command==='TEST'){await sendSms(owner,`Reachr approval test passed [${code}]. Two-way SMS commands are working. No prospect message was sent.`);console.log(JSON.stringify({handled:true,command,status:'test_confirmed'}));process.exit(0)}
const run=spawnSync(process.execPath,[path.join(ROOT,'send-direct-verified-followup.mjs'),approval.messengerUrl,approval.recipientName,approval.finalReply],{encoding:'utf8',timeout:90000});
const success=run.status===0&&String(run.stdout).includes(`SENT:${approval.recipientName}`);
updateState(s=>Object.assign(s.approvals[code],success?{status:'sent',sentAt:new Date().toISOString()}:{status:'send_failed',sendError:String(run.stderr||run.stdout||`exit ${run.status}`).slice(0,800)}));
if(success){await sendSms(owner,`Sent to ${approval.businessName} [${code}]:\n${approval.finalReply.slice(0,900)}`);console.log(JSON.stringify({handled:true,command,status:'sent',businessName:approval.businessName}))}
else{await sendSms(owner,`NOT sent to ${approval.businessName} [${code}]. Identity/send confirmation failed. It is safe to retry.`);console.error(`NOT_SENT:${String(run.stderr||run.stdout).trim()}`);process.exit(1)}
