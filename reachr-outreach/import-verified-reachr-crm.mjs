#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {DatabaseSync} from 'node:sqlite';import {initCrm,upsertVerifiedContact,listContacts} from './reachr-crm.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url)),EXECUTE=process.argv.includes('--execute');
const SEED=process.env.REACHR_CRM_SEED||'/Users/jackserver/jsw/keys/reachr-crm-seed.json';
const DB=process.env.REACHR_INBOX_DB||'/Users/jackserver/jsw/keys/reachr-inbox.sqlite';
const seed=JSON.parse(fs.readFileSync(SEED,'utf8')),ledger=JSON.parse(fs.readFileSync(path.join(ROOT,'prospects.json'),'utf8')).prospects;
if(!Array.isArray(seed)||!seed.length)throw Error('empty_seed');
const normalized=seed.map(item=>{const hits=ledger.filter(r=>r.businessName===item.business_name&&!JSON.stringify(r).toLowerCase().includes('marketplace'));if(hits.length!==1||!hits[0].messengerUrl)throw Error(`ambiguous_or_missing_ledger_route:${item.business_name}`);const r=hits[0];return {...item,messenger_url:r.messengerUrl,recipient_name:r.recipientName||r.businessName,source:'live_messenger_thread_review_2026-09-22',email_source:item.email?'prospect_provided_in_messenger':''}});
if(new Set(normalized.map(r=>r.business_name.toLowerCase())).size!==normalized.length)throw Error('duplicate_business_in_seed');
if(!EXECUTE){console.log(JSON.stringify({dry_run:true,selected:normalized.length,with_email:normalized.filter(r=>r.email).length,closed:normalized.filter(r=>r.stage==='closed_declined').length,no_messages_sent:true}));process.exit(0)}
if(!fs.existsSync(DB))throw Error('private_database_missing');const db=new DatabaseSync(DB);try{initCrm(db);let created=0,events=0;for(const item of normalized){const result=upsertVerifiedContact(db,item);created+=Number(result.created);events+=Number(result.event_added)}console.log(JSON.stringify({dry_run:false,created,events,total:listContacts(db).length,no_messages_sent:true}))}finally{db.close()}
