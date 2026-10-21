#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, createApprovalSms, sendSms } from './reachr-sms-approvals.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const QUEUE = path.join(ROOT, 'prospects.json');
const STATE = path.join(ROOT, 'reply-monitor-state.json');
const TASKS = '/Users/jackserver/wildrose-ai-widget/leads/rose-tasks.jsonl';
const CDP = process.env.REACHR_CDP_ENDPOINT || 'http://127.0.0.1:9223';
const WAIT = Number(process.env.REACHR_REPLY_WAIT_MS || 6000);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const norm = value => String(value || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');

export function classifyReply(text) {
  const value = String(text || '').trim();
  const lower = value.toLowerCase();
  if (!value || /^you:/i.test(value)) return { good: false, reason: 'outbound_or_empty' };
  if (/not interested|don'?t think i(?:'m| am) interested|no thanks|no thank you|please stop|do not contact|don'?t contact|remove me|wrong person|unsubscribe/.test(lower)) return { good: false, reason: 'negative' };
  if (/thanks? for (contacting|messaging|reaching out)|thank you for getting in touch|we(?:'ve| have) received your message|someone will be with you|will get back to you|respond as soon as|away from the office|automated (reply|response)|auto[- ]?reply/.test(lower)) return { good: false, reason: 'automated' };
  if (/\b(yes|yeah|yep|sure|interested|sounds good|tell me more|more info|send (it|me|over)|would love|i'?d love|let'?s|how does|how would|how much|price|pricing|cost|demo|call me|sign me up|great idea|open to|happy to)\b/.test(lower)) return { good: true, reason: 'positive_signal' };
  if (/[?]$/.test(value) && /\b(how|what|when|where|can|could|would|do|does|is|are)\b/i.test(value)) return { good: true, reason: 'engaged_question' };
  return { good: false, reason: 'neutral_or_unclear' };
}
export function parseThreadLabel(label) {
  const value=String(label||'').replace(/^Enter, Message sent\s+/i,'At ');
  const match=value.match(/^At\s+.*?,\s+(.+?):\s+([\s\S]+)$/i);
  return match?{speaker:match[1].trim(),text:match[2].trim(),label:String(label||'')}:null;
}
function get(url) { return new Promise((resolve, reject) => http.get(url, response => { let body=''; response.on('data', chunk => body += chunk); response.on('end', () => { try { resolve(JSON.parse(body)); } catch (error) { reject(error); } }); }).on('error', reject)); }
function connect(url) { return new Promise((resolve, reject) => { const ws = new WebSocket(url); ws.onopen = () => { let id=0; const pending=new Map(); ws.onmessage = event => { const message=JSON.parse(event.data), item=pending.get(message.id); if (!item) return; pending.delete(message.id); clearTimeout(item.timer); message.error ? item.reject(Error(message.error.message)) : item.resolve(message.result); }; resolve({ws,call:(method,params={})=>new Promise((res,rej)=>{const requestId=++id,timer=setTimeout(()=>{pending.delete(requestId);rej(Error(`${method} timeout`));},20000);pending.set(requestId,{resolve:res,reject:rej,timer});ws.send(JSON.stringify({id:requestId,method,params}));})}); }; ws.onerror=reject; }); }
async function connectController() {
  const tabs=await get(`${CDP}/json/list`);
  const base=tabs.find(t=>t.type==='page');
  if(base) return connect(base.webSocketDebuggerUrl);
  const version=await get(`${CDP}/json/version`);
  if(!version.webSocketDebuggerUrl) throw Error('managed Chrome controller unavailable');
  return connect(version.webSocketDebuggerUrl);
}
async function collectInboxRows(page) {
  const seen=new Set(); let stable=0;
  for(let i=0;i<60&&stable<3;i++) {
    const evaluated=await page.call('Runtime.evaluate',{expression:`(()=>{const grid=document.querySelector('[role="grid"][aria-label="Chats"]');const rows=[...(grid||document).querySelectorAll('[role="row"]')].map(e=>e.innerText).filter(Boolean);let scroller=grid;while(scroller&&scroller.scrollHeight<=scroller.clientHeight+5)scroller=scroller.parentElement;if(!scroller)return {rows,top:0,height:0,client:0,bottom:true};const before=scroller.scrollTop;scroller.scrollTop=Math.min(scroller.scrollHeight,scroller.scrollTop+Math.max(250,scroller.clientHeight*.8));scroller.dispatchEvent(new Event('scroll',{bubbles:true}));return {rows,top:scroller.scrollTop,height:scroller.scrollHeight,client:scroller.clientHeight,bottom:scroller.scrollTop+scroller.clientHeight>=scroller.scrollHeight-5,moved:scroller.scrollTop>before};})()`,returnByValue:true});
    const snapshot=evaluated.result.value||{rows:[]}; const before=seen.size;
    for(const row of snapshot.rows||[]) seen.add(row);
    stable=(snapshot.bottom&&seen.size===before)?stable+1:0;
    await sleep(250);
  }
  return [...seen].map(parseRow).filter(Boolean);
}
async function inspectLatestThread(controller,prospect) {
  let page,targetId;
  try {
    const made=await controller.call('Target.createTarget',{url:prospect.messengerUrl,background:true});targetId=made.targetId;
    await sleep(WAIT);
    const live=await get(`${CDP}/json/list`),tab=live.find(t=>t.id===targetId);
    if(!tab) throw Error('thread target unavailable');
    page=await connect(tab.webSocketDebuggerUrl);
    let labels=[];
    for(let i=0;i<8;i++) {
      const evaluated=await page.call('Runtime.evaluate',{expression:`(()=>[...document.querySelectorAll('[role="log"][aria-label^="Messages in conversation"] [aria-label]')].map(e=>e.getAttribute('aria-label')).filter(a=>a&&a.startsWith('At ')))()`,returnByValue:true});
      labels=evaluated.result.value||[]; if(labels.length)break; await sleep(750);
    }
    const parsed=labels.map(parseThreadLabel).filter(Boolean);
    return parsed.at(-1)||null;
  } finally {
    if(targetId) try{await controller.call('Target.closeTarget',{targetId});}catch{}
    page?.ws.close();
  }
}
function taskId() { return `rose_task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`; }
function suggestedReply(businessName) {
  return `Basically you’d send us whatever you want promoted and we’d handle getting it into relevant local Facebook groups for you. We’d keep track of everything too, so you’re not spending your time doing it yourself. We’re giving the first few businesses a year free, we’d just want your feedback as we go. If that sounds good I can get ${businessName} added.`;
}
function appendTask({ businessName, preview, messengerUrl, fingerprint, observedAt, classification }) {
  fs.mkdirSync(path.dirname(TASKS), { recursive: true });
  const isPositive=['positive_signal','engaged_question'].includes(classification.reason);
  const labels={positive_signal:'interested',engaged_question:'question',negative:'negative',automated:'automatic',neutral_or_unclear:'unclear'};
  const label=labels[classification.reason]||classification.reason;
  const guidance=isPositive
    ? `Suggested response:\n${suggestedReply(businessName)}\n\nNext action: open Messenger, review the full thread, personalize the response, send it, then mark this task done.`
    : classification.reason==='automated'
      ? 'Next action: automatic response logged for visibility; review only if the thread needs attention.'
      : classification.reason==='negative'
        ? 'Next action: review the thread, respect any opt-out, and close the conversation.'
        : 'Next action: open Messenger, read the full thread, and write an individual response.';
  const proposedReply=isPositive?suggestedReply(businessName):'';
  const task = { id:taskId(), createdAt:new Date().toISOString(), status:'open', priority:classification.reason==='automated'?'normal':'urgent', title:`Reachr reply — ${businessName} (${label})`, notes:`Messenger reply detected for Reachr outreach.\n\nBusiness: ${businessName}\nReply: ${preview}\nClassification: ${label}\nDetected: ${observedAt}\n\n${guidance}`, kind:'reachr-reply', clientId:'reachr', sourceId:fingerprint, url:messengerUrl || 'https://www.messenger.com/', replyPreview:preview, suggestedReply:proposedReply };
  fs.appendFileSync(TASKS, `${JSON.stringify(task)}\n`);
  return task;
}
function parseRow(text) {
  const lines=String(text||'').split('\n').map(x=>x.trim()).filter(x=>x && x!=='·');
  if (lines.length < 2) return null;
  const businessName=lines[0];
  const timeIndex=lines.findIndex((line,index)=>index>0 && /^(\d+[mhd]|\d+\s+(minute|hour|day)s? ago|Yesterday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/i.test(line));
  const preview=lines.slice(1,timeIndex>1?timeIndex:2).join(' ').trim();
  return {businessName,preview};
}
async function main() {
  if (process.argv.includes('--self-test')) {
    const cases=[['Yes, send me more info',true],['How much does it cost?',true],['Thanks for contacting us. We will respond soon.',false],['At this time I am not interested.',false],["Actually you know what? I don't think I'm interested in testing any tools.",false],['You: follow-up',false]];
    for (const [text,expected] of cases) { const actual=classifyReply(text).good; if(actual!==expected) throw Error(`classification failed: ${text}`); }
    const inbound=parseThreadLabel("At 1:03 PM, Example Dog Grooming: Sure. Please send me more information- much appreciated");
    if(inbound?.speaker!=="Example Dog Grooming"||!inbound.text.startsWith('Sure.'))throw Error('thread label parsing failed');
    const outbound=parseThreadLabel('At 1:04 PM, You: Absolutely, here is how it works.');
    if(outbound?.speaker!=='You')throw Error('outbound thread label parsing failed');
    console.log('reply classifier and thread parser tests passed'); return;
  }
  const queue=JSON.parse(fs.readFileSync(QUEUE));
  const prospects = new Map();
  for (const p of queue.prospects.filter(p => p.status === 'sent')) {
    prospects.set(norm(p.businessName), p);
    if (p.recipientName) prospects.set(norm(p.recipientName), p);
  }
  const state=fs.existsSync(STATE)?JSON.parse(fs.readFileSync(STATE)):{schema:'reachr.reply-monitor.v1',seen:{}};
  const existingTaskSources=new Set();
  if(fs.existsSync(TASKS)) for(const line of fs.readFileSync(TASKS,'utf8').split('\n')) { try { const task=JSON.parse(line); if(task.sourceId) existingTaskSources.add(task.sourceId); } catch {} }
  const controller=await connectController();
  const made=await controller.call('Target.createTarget',{url:'https://www.messenger.com/',background:true});
  await sleep(WAIT);
  const live=await get(`${CDP}/json/list`), tab=live.find(t=>t.id===made.targetId);
  if(!tab) throw Error('Messenger inbox tab did not open');
  const page=await connect(tab.webSocketDebuggerUrl);
  const rows=await collectInboxRows(page);
  const created=[], observedAt=new Date().toISOString();
  for(const row of rows){
    const prospect=prospects.get(norm(row.businessName));
    if(!prospect) continue;
    let canonicalPreview=row.preview.replace(/^Unread message:\s*/i,'').trim();
    if(classifyReply(canonicalPreview).reason==='outbound_or_empty') {
      const fingerprint=crypto.createHash('sha256').update(`${norm(row.businessName)}\n${canonicalPreview}`).digest('hex').slice(0,32);
      state.seen[fingerprint] ||= {businessName:row.businessName,preview:canonicalPreview,classification:{good:false,reason:'outbound_or_empty'},observedAt};
      continue;
    }
    let fingerprint=crypto.createHash('sha256').update(`${norm(row.businessName)}\n${canonicalPreview}`).digest('hex').slice(0,32);
    if(existingTaskSources.has(fingerprint)) continue;
    let threadEvidence=null, threadError='';
    try {
      threadEvidence=await inspectLatestThread(controller,prospect);
      if(threadEvidence?.speaker==='You') {
        state.seen[fingerprint]={businessName:row.businessName,preview:canonicalPreview,classification:{good:false,reason:'outbound_or_empty'},observedAt,threadVerified:true};
        continue;
      }
      if(threadEvidence?.text) {
        canonicalPreview=threadEvidence.text;
        fingerprint=crypto.createHash('sha256').update(`${norm(row.businessName)}\n${canonicalPreview}`).digest('hex').slice(0,32);
        if(existingTaskSources.has(fingerprint)) continue;
      }
    } catch(error) { threadError=error.message; }
    const classification=state.seen[fingerprint]?.classification||classifyReply(canonicalPreview);
    state.seen[fingerprint]={businessName:row.businessName,preview:canonicalPreview,classification,observedAt,threadVerified:Boolean(threadEvidence),threadTextVerified:Boolean(threadEvidence?.text)&&[norm(prospect.businessName),norm(prospect.recipientName)].includes(norm(threadEvidence?.speaker)),...(threadEvidence?{threadSpeaker:threadEvidence.speaker}:{}),...(threadError?{threadError}:{})};
    if(classification.reason==='outbound_or_empty') continue;
    const task=appendTask({businessName:prospect.businessName,preview:canonicalPreview,messengerUrl:prospect.messengerUrl,fingerprint,observedAt,classification});
    state.seen[fingerprint].taskId=task.id;
    state.seen[fingerprint].taskCreatedAt=task.createdAt;
    existingTaskSources.add(fingerprint);
    try { const sms=await createApprovalSms({task,prospect,classification}); state.seen[fingerprint].smsApprovalCode=sms.code; state.seen[fingerprint].smsNotificationSid=sms.sid; }
    catch(error) { state.seen[fingerprint].smsError=error.message; }
    created.push({taskId:task.id,businessName:prospect.businessName,preview:canonicalPreview});
  }
  state.health={...(state.health||{}),status:'ok',lastSuccessAt:new Date().toISOString(),lastError:''};
  const tmp=`${STATE}.tmp`;fs.writeFileSync(tmp,`${JSON.stringify(state,null,2)}\n`);fs.renameSync(tmp,STATE);
  try{await controller.call('Target.closeTarget',{targetId:made.targetId});}catch{}
  page.ws.close();controller.ws.close();
  console.log(JSON.stringify({checkedRows:rows.length,createdTasks:created.length,created},null,2));
}
async function recordMonitorFailure(error) {
  const state=fs.existsSync(STATE)?JSON.parse(fs.readFileSync(STATE)):{schema:'reachr.reply-monitor.v1',seen:{}};
  const now=new Date(),lastAlert=Date.parse(state.health?.lastAlertAt||0),shouldAlert=!Number.isFinite(lastAlert)||now.getTime()-lastAlert>60*60*1000;
  state.health={...(state.health||{}),status:'error',lastError:String(error.message||error).slice(0,500),lastFailureAt:now.toISOString()};
  if(shouldAlert) {
    try { const sms=await sendSms(config().ownerPhone,`REACHR REPLY MONITOR ERROR\nReplies may not be detected until this is fixed.\n\n${state.health.lastError}`);state.health.lastAlertAt=now.toISOString();state.health.lastAlertSid=sms.sid; }
    catch(smsError) { state.health.lastAlertError=smsError.message; }
  }
  const tmp=`${STATE}.tmp`;fs.writeFileSync(tmp,`${JSON.stringify(state,null,2)}\n`);fs.renameSync(tmp,STATE);
}
main().catch(async error=>{await recordMonitorFailure(error);console.error(error.stack||error);process.exit(1);});
