import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {source} from './reachr-inbox-api.mjs';

test('authenticated API source joins only exact-route private import cache and marks verified inbound',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'reachr-inbox-source-'));
 try{const url='https://www.messenger.com/t/123',ledgerPath=path.join(dir,'ledger.json'),statePath=path.join(dir,'state.json'),planPath=path.join(dir,'plan.json');
  fs.writeFileSync(ledgerPath,JSON.stringify({prospects:[{businessName:'Atlas',recipientName:'Atlas',messengerUrl:url,delivery:'messenger_confirmed',sentMessage:'Hello',sentAt:'2026-09-10T10:00:00Z'}]}));fs.writeFileSync(statePath,JSON.stringify({seen:{}}));
  fs.writeFileSync(planPath,JSON.stringify({conversations:[{external_key:'a',business_name:'Atlas',messenger_url:url}],messages:[{external_key:'a',direction:'inbound',body:'Please send information',observed_at:'2026-09-11T10:00:00Z',provenance:'messenger_aria_label:abcd'}]}),{mode:0o600});
  const rows=source({ledgerPath,statePath,evidencePath:path.join(dir,'missing.json'),planPath});assert.equal(rows.length,1);assert.equal(rows[0].conversation.verified_inbound,true);assert.deepEqual(rows[0].messages.map(x=>x.direction),['outbound','inbound']);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
