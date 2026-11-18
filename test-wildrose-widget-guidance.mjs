import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir} from 'node:fs/promises';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const {chromium}=await import(process.env.ROSE_PLAYWRIGHT_MODULE || 'playwright');
const folder=dirname(fileURLToPath(import.meta.url));
const output=join(folder,'artifacts/direct-glow');
await mkdir(output,{recursive:true});
const widget=await readFile(join(folder,'wildrose-widget.js'));
const logo=await readFile(join(folder,'logos/wildrose.png'));
const fixture=path=>`<!doctype html><html><head><meta charset="utf-8"><title>Direct widget fixture</title><style>body{font:18px system-ui;margin:0;padding:35px 50px}main{max-width:850px}button,a{padding:10px;margin:6px}section{min-height:220px;padding:24px;margin:24px 0;background:#f7f1ea}nav[hidden]{display:none}</style></head><body><header><button id="account" aria-controls="account-menu" aria-expanded="false" onclick="document.querySelector('#account-menu').hidden=false;this.setAttribute('aria-expanded','true')">Account</button><nav id="account-menu" hidden><a id="billing" href="/billing">Billing</a></nav></header><main><h1>Example shop</h1>${path==='/billing'?'<h2>Billing</h2><a id="invoice-history" href="/billing/invoices">Invoice history</a>':'<a id="learn-more" href="/learn">Learn more</a><button id="profile-open" onclick="document.getElementById(&quot;profile&quot;).showModal()">Update profile</button><dialog id="profile"><form onsubmit="window.didSubmit=true;event.preventDefault()"><label>Display name<input id="display-name" value="PRIVATE_FIELD_VALUE"></label><button id="save-profile" type="submit">Save profile</button></form></dialog><div data-component-type="s-search-result"><h2><a href="/product/expensive">Premium kettle</a></h2><span class="a-price"><span class="a-offscreen">$29.99</span></span></div><div data-component-type="s-search-result"><h2><a href="/product/cheap">Budget kettle</a></h2><span class="a-price"><span class="a-offscreen">$12.99</span></span></div><section id="wholesale"><h2>Wholesale</h2><p>Fresh bread for local cafés and restaurants.</p></section><section id="hours"><h2>Opening hours</h2><p>Monday to Friday 7am–6pm.</p></section>'}</main><script src="/wildrose-widget.js" data-api-base="ORIGIN" data-title="Rose"></script></body></html>`;
const server=createServer((req,res)=>{const path=new URL(req.url,'http://localhost').pathname;
  if(path==='/wildrose-widget.js'){res.writeHead(200,{'content-type':'application/javascript'});res.end(widget);return;}
  if(path==='/logos/wildrose.png'){res.writeHead(200,{'content-type':'image/png'});res.end(logo);return;}
  if(path==='/api/chat/start'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({chatId:'test'}));return;}
  if(path==='/api/chat/message'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({reply:'Our hours are Monday to Friday, 7am to 6pm.'}));return;}
  res.writeHead(200,{'content-type':'text/html'});res.end(fixture(path).replace('ORIGIN',`http://127.0.0.1:${server.address().port}`));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});
const ask=async(page,message)=>{await page.locator('.wr-tab[data-view="chat"]').click();await page.locator('.wr-input').fill(message);await page.locator('.wr-send').click();};
const glow=(page,label)=>page.locator(`.rose-direct-spotlight[data-rose-target="${label}"]`);
try {
  for(const question of ['find my invoices','How do I find my invoice?','find my invoice']){
    const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();await page.goto(origin+'/');await page.locator('.wr-fab').click();await ask(page,question);
    await glow(page,'Account').waitFor();await page.locator('#account').click();await glow(page,'Billing').waitFor();await page.locator('#billing').click();
    await page.waitForURL(origin+'/billing');await glow(page,'Invoice history').waitFor();assert.ok(!(await page.locator('.wr-chat-log').innerText()).includes("couldn't find the next step"));
    if(question==='find my invoices')await page.screenshot({path:join(output,'direct-invoices.png'),fullPage:true});
    console.log('PASS direct invoice route: '+question);await context.close();
  }
  for(const [question,target] of [['Where is Learn more?','Learn more'],['Where is the wholesale bread info?','Wholesale'],['Show me your hours','Opening hours'],['What are your hours?','Opening hours']]){
    const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();await page.goto(origin+'/');await page.locator('.wr-fab').click();await ask(page,question);await glow(page,target).waitFor();
    if(question.startsWith('What')){assert.match(await page.locator('.wr-chat-log').innerText(),/Monday to Friday/);assert.equal(page.url(),origin+'/');}
    if(question==='Show me your hours')await page.screenshot({path:join(output,'direct-live-face.png'),fullPage:true});
    console.log('PASS direct '+question);await context.close();
  }
  {
    const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();await page.goto(origin+'/');await page.locator('.wr-fab').click();await ask(page,'How do I update profile?');
    await glow(page,'Update profile').waitFor();await page.locator('#profile-open').click();await glow(page,'Display name').waitFor();
    await page.locator('#display-name').fill('Test');await page.locator('#display-name').blur();await glow(page,'Save profile').waitFor();
    assert.equal(await page.evaluate(()=>window.didSubmit===true),false);assert.ok(!(await page.locator('.wr-chat-log').innerText()).includes('PRIVATE_FIELD_VALUE'));
    console.log('PASS direct profile guidance without submit or value disclosure');await context.close();
  }
  {
    const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();await page.goto(origin+'/');await page.locator('.wr-fab').click();await ask(page,'Find the cheapest product on this page');
    await glow(page,'Budget kettle').waitFor();console.log('PASS direct cheapest product');await context.close();
  }
  for(const [path,question] of [['/','Where is Checkout?'],['/','Where is the quantum ostrich?'],['/account','Where is Learn more?']]){
    const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();await page.goto(origin+path);await page.locator('.wr-fab').click();await ask(page,question);await page.waitForTimeout(150);assert.equal(await page.locator('.rose-direct-spotlight').count(),0);
    if(question.includes('quantum'))assert.match(await page.locator('.wr-chat-log').innerText(),/Closest sections:/);
    console.log('PASS direct safety/no match: '+path+' '+question);await context.close();
  }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
