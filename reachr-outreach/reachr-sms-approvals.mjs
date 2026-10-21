#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
export const STATE_PATH=path.join(ROOT,'reachr-sms-approval-state.json');
const LOCK_PATH=`${STATE_PATH}.lock`;
const TWILIO_ENV='/Users/jackserver/jsw/keys/twilio.env';
const CONFIG_PATH=path.join(ROOT,'.reachr-approval.json');

function parseEnv(file){
 const out={};
 for(const raw of fs.readFileSync(file,'utf8').split(/\r?\n/)){
  const m=raw.trim().match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);if(!m)continue;
  out[m[1]]=m[2].trim().replace(/^["']|["']$/g,'');
 }
 return out;
}
export function config(){
 const env=parseEnv(TWILIO_ENV), local=JSON.parse(fs.readFileSync(CONFIG_PATH,'utf8'));
 return {accountSid:env.TWILIO_ACCOUNT_SID,apiKey:env.TWILIO_API_KEY,apiSecret:env.TWILIO_API_SECRET,fromPhone:env.TWILIO_PHONE_NUMBER,ownerPhone:local.ownerPhone};
}
export function loadState(){try{return JSON.parse(fs.readFileSync(STATE_PATH,'utf8'))}catch{return {approvals:{},inboundSids:{}}}}
function sleep(ms){Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms)}
export function updateState(mutator){
 let fd;
 for(let i=0;i<50;i++){try{fd=fs.openSync(LOCK_PATH,'wx');break}catch(e){if(e.code!=='EEXIST')throw e;sleep(100)}}
 if(fd===undefined)throw Error('approval state lock timeout');
 try{const state=loadState();const result=mutator(state);const tmp=`${STATE_PATH}.${process.pid}.tmp`;fs.writeFileSync(tmp,JSON.stringify(state,null,2));fs.renameSync(tmp,STATE_PATH);return result}finally{try{fs.closeSync(fd)}catch{};try{fs.unlinkSync(LOCK_PATH)}catch{}}
}
export async function sendSms(to,body){
 const c=config();if(!c.accountSid||!c.apiKey||!c.apiSecret||!c.fromPhone||!to)throw Error('Twilio SMS configuration incomplete');
 const payload=new URLSearchParams({To:to,From:c.fromPhone,Body:String(body).slice(0,1500)});
 const auth=Buffer.from(`${c.apiKey}:${c.apiSecret}`).toString('base64');
 const r=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${c.accountSid}/Messages.json`,{method:'POST',headers:{Authorization:`Basic ${auth}`,'Content-Type':'application/x-www-form-urlencoded'},body:payload});
 const j=await r.json();if(!r.ok)throw Error(j.message||`Twilio HTTP ${r.status}`);return {sid:j.sid,status:j.status,to:j.to};
}
function suggestionFor(classification){
 if(classification.reason==='positive_signal'||classification.reason==='engaged_question')return 'Basically you’d send us whatever you want promoted and we’d handle getting it into relevant local Facebook groups for you. We’d also keep track of where it was posted and any responses that come in. I’m offering the first year free while I build it out and get feedback from businesses using it.';
 return '';
}
export function buildApprovalSmsBody({code,businessName,replyPreview,classification,suggestion}){
 const commands=suggestion?`SEND ${code}\nEDIT ${code}: your message\nSKIP ${code}`:`EDIT ${code}: your message\nSKIP ${code}`;
 return `NEW REACHR MESSENGER REPLY\n\nBusiness: ${businessName}\nType: ${classification||'unclear'}\n\nThey said exactly:\n“${String(replyPreview||'').slice(0,500)}”\n\n${suggestion?`Suggested reply:\n${String(suggestion).slice(0,600)}\n\n`:'No reply is suggested yet.\n\n'}Approval code: ${code}\nReply with:\n${commands}`;
}
export async function createApprovalSms({task,prospect,classification}){
 const code=crypto.randomBytes(6).toString('hex').toUpperCase();
 const suggestion=task.suggestedReply||suggestionFor(classification);
 const recipientName=prospect.recipientName||prospect.businessName;
 const classificationLabel=classification.label||({positive_signal:'interested',engaged_question:'question',negative:'negative',automated:'automatic',neutral_or_unclear:'unclear'}[classification.reason])||classification.reason||'unclear';
 const record={code,type:'reply',status:'pending',taskId:task.id,businessName:prospect.businessName,recipientName,messengerUrl:prospect.messengerUrl,replyPreview:task.replyPreview||'',suggestedReply:suggestion,classification:classificationLabel,createdAt:new Date().toISOString()};
 updateState(s=>{s.approvals[code]=record});
 const body=buildApprovalSmsBody({code,businessName:record.businessName,replyPreview:record.replyPreview,classification:record.classification,suggestion});
 try{const sent=await sendSms(config().ownerPhone,body);updateState(s=>Object.assign(s.approvals[code],{notificationSid:sent.sid,notificationStatus:sent.status,notifiedAt:new Date().toISOString()}));return {code,...sent}}catch(e){updateState(s=>Object.assign(s.approvals[code],{status:'notification_failed',error:e.message}));throw e}
}
export async function createSafeTestSms(){
 const code=crypto.randomBytes(6).toString('hex').toUpperCase();
 updateState(s=>{s.approvals[code]={code,type:'test',status:'pending',createdAt:new Date().toISOString()}});
 const sent=await sendSms(config().ownerPhone,`Reachr approval system test [${code}]\nReply: TEST ${code}\nThis test cannot send a message to any prospect.`);
 updateState(s=>Object.assign(s.approvals[code],{notificationSid:sent.sid,notificationStatus:sent.status,notifiedAt:new Date().toISOString()}));return {code,...sent};
}
