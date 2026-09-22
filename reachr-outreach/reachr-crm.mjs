import crypto from 'node:crypto';

export const STAGES = new Set(['prospect','interested','email_provided','waiting','closed_declined','client']);
const text=(v,max=500)=>String(v??'').trim().slice(0,max);
const businessKey=v=>text(v,200).toLowerCase().replace(/\s+/g,' ');
const validUrl=v=>{try{const u=new URL(v);return u.protocol==='https:'&&['m.me','messenger.com','www.messenger.com','facebook.com','www.facebook.com'].includes(u.hostname)&&!u.pathname.toLowerCase().includes('marketplace')}catch{return false}};
const validEmail=v=>!v||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export function initCrm(db){db.exec(`CREATE TABLE IF NOT EXISTS crm_contacts (
 id TEXT PRIMARY KEY, business_key TEXT NOT NULL UNIQUE, business_name TEXT NOT NULL, recipient_name TEXT NOT NULL DEFAULT '', messenger_url TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', email_source TEXT NOT NULL DEFAULT '', stage TEXT NOT NULL DEFAULT 'prospect', note TEXT NOT NULL DEFAULT '', consent_status TEXT NOT NULL DEFAULT 'unknown', no_send INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 CHECK(stage IN ('prospect','interested','email_provided','waiting','closed_declined','client')), CHECK(no_send=1));
 CREATE TABLE IF NOT EXISTS crm_events(id TEXT PRIMARY KEY, contact_id TEXT NOT NULL, event_key TEXT NOT NULL UNIQUE, type TEXT NOT NULL, summary TEXT NOT NULL, source TEXT NOT NULL, occurred_at TEXT NOT NULL, FOREIGN KEY(contact_id) REFERENCES crm_contacts(id));`);}
export function listContacts(db){return db.prepare('SELECT id,business_name,recipient_name,messenger_url,email,email_source,stage,note,consent_status,no_send,created_at,updated_at FROM crm_contacts ORDER BY CASE stage WHEN \'email_provided\' THEN 0 WHEN \'interested\' THEN 1 WHEN \'waiting\' THEN 2 WHEN \'prospect\' THEN 3 ELSE 4 END, updated_at DESC').all();}
export function contactEvents(db,id){return db.prepare('SELECT id,type,summary,source,occurred_at FROM crm_events WHERE contact_id=? ORDER BY occurred_at DESC').all(id);}
export function upsertVerifiedContact(db,input){
 const name=text(input.business_name,200),key=businessKey(name),url=text(input.messenger_url,700),email=text(input.email,254).toLowerCase(),stage=input.stage||'prospect',source=text(input.source,100),evidence=text(input.evidence,240),eventKey=text(input.event_key,250);
 if(!name||!validUrl(url)||!STAGES.has(stage)||!validEmail(email)||!source||!evidence||!eventKey)throw Error('invalid_verified_contact');
 if(email&&input.email_source!=='prospect_provided_in_messenger')throw Error('email_provenance_required');
 const now=new Date().toISOString(),existing=db.prepare('SELECT * FROM crm_contacts WHERE business_key=?').get(key);
 if(existing?.email&&email&&existing.email!==email)throw Error('email_conflict_review_required');
 const id=existing?.id||crypto.randomUUID();
 db.exec('BEGIN IMMEDIATE');try{
  if(!existing)db.prepare('INSERT INTO crm_contacts (id,business_key,business_name,recipient_name,messenger_url,email,email_source,stage,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(id,key,name,text(input.recipient_name,200),url,email,email?input.email_source:'',stage,text(input.note,600),now,now);
  else if(email&&!existing.email)db.prepare('UPDATE crm_contacts SET email=?,email_source=?,updated_at=? WHERE id=?').run(email,input.email_source,now,id);
  const info=db.prepare('INSERT OR IGNORE INTO crm_events(id,contact_id,event_key,type,summary,source,occurred_at) VALUES (?,?,?,?,?,?,?)').run(crypto.randomUUID(),id,eventKey,'verified_messenger_evidence',evidence,source,text(input.occurred_at,50)||now);
  db.exec('COMMIT');return{id,created:!existing,event_added:!!info.changes};
 }catch(error){db.exec('ROLLBACK');throw error}
}
export function updateContact(db,id,input){
 const existing=db.prepare('SELECT * FROM crm_contacts WHERE id=?').get(id);if(!existing)throw Error('not_found');
 if(Object.keys(input).some(k=>!['stage','note'].includes(k)))throw Error('invalid_fields');
 const stage=input.stage===undefined?existing.stage:input.stage,note=input.note===undefined?existing.note:text(input.note,600);
 if(!STAGES.has(stage)||typeof note!=='string')throw Error('invalid_update');
 if(stage===existing.stage&&note===existing.note)return{id,changed:false};
 const now=new Date().toISOString();db.exec('BEGIN IMMEDIATE');try{
  db.prepare('UPDATE crm_contacts SET stage=?,note=?,updated_at=? WHERE id=?').run(stage,note,now,id);
  db.prepare('INSERT INTO crm_events(id,contact_id,event_key,type,summary,source,occurred_at) VALUES (?,?,?,?,?,?,?)').run(crypto.randomUUID(),id,crypto.randomUUID(),'operator_update',`stage: ${existing.stage} → ${stage}; note ${note===existing.note?'unchanged':'updated'}`,'private_crm',now);
  db.exec('COMMIT');return{id,changed:true};
 }catch(error){db.exec('ROLLBACK');throw error}
}
