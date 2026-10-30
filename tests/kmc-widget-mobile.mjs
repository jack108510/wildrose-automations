const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const source = await fs.readFile(new URL('../wildrose-widget-sandbox.js',import.meta.url),'utf8');
// Synthetic reproduction of the published default-orange appearance overriding a green embed.
const published=JSON.stringify({widgetActive:true,config:{appearance:{assistantName:'KMC Spark Assistant',brandPrimary:'#ff5722',brandAccent:'#ff5722'}}});
await fs.mkdir('test-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
try {
 for(const [width,height] of [[360,640],[390,760],[640,390],[1440,900]]) {
  const p=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/logos/wildrose.png',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"/>'}));
  await p.route('https://widget.test/**',r=>r.fulfill({contentType:'application/javascript',body:source}));
  await p.route('https://api.test/**',r=>r.fulfill({contentType:'application/json',body:published}));
  await p.route('https://client.test/',r=>r.fulfill({contentType:'text/html',body:`<meta name="viewport" content="width=device-width, initial-scale=1"><body><script src="https://widget.test/widget.js" data-api-base="https://api.test" data-business-id="rose-checkout-muyn52us-ksmk51" data-website="https://kmcspark.com/" data-title="KMC Spark" data-accent="#466709"></script>`}));await p.goto('https://client.test/');
  await p.locator('.wr-title h3').filter({hasText:'KMC Spark Assistant'}).waitFor({state:'attached'});
  await p.locator('.wr-fab').click();
  const m=await p.locator('.wr-panel').evaluate(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect(),root=e.closest('.wr-ai');return {height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom,background:s.backgroundImage,accent:getComputedStyle(root).getPropertyValue('--accent').trim(),orb:root.querySelector('.wr-orb').getBoundingClientRect().width,close:root.querySelector('.wr-close').getBoundingClientRect().width};});
  assert.equal(m.accent,'#466709','Explicit client brand must survive published default orange');
  assert.equal(m.background,'none','No glass/gradient panel');
  assert.ok(m.height<=480,`Panel too tall: ${m.height}`);
  assert.ok(m.orb<=64,'Voice indicator must not dominate panel');
  assert.ok(m.close>=44,'Close must be a usable touch target');
  assert.ok(m.top>=0&&m.bottom<=height&&m.left>=0&&m.right<=width,'Panel must fit viewport');
  await p.screenshot({path:`test-artifacts/voice-${width}x${height}.png`});
  await p.locator('.wr-tab').filter({hasText:'Chat'}).click();await p.locator('.wr-input').waitFor({state:'visible'});
  assert.ok(await p.locator('.wr-send').isVisible());
  await p.screenshot({path:`test-artifacts/chat-${width}x${height}.png`});
  await p.locator('.wr-close').click();assert.ok(await p.locator('.wr-fab').isVisible());
  assert.deepEqual(errors,[]);console.log('PASS',width,height,JSON.stringify(m));
  // A shared-script release must not restyle unrelated client embeds.
  await p.route('https://other.test/',r=>r.fulfill({contentType:'text/html',body:'<body><script src="https://widget.test/widget.js" data-api-base="https://api.test" data-business-id="synthetic-unrelated" data-website="https://other.test/" data-logo="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E"></script>'}));
  await p.goto('https://other.test/');await p.locator('.wr-title h3').filter({hasText:'KMC Spark Assistant'}).waitFor({state:'attached'});
  assert.equal(await p.locator('.wr-ai').getAttribute('data-client-theme'),null);
  assert.equal(await p.locator('.wr-ai').evaluate(e=>getComputedStyle(e).getPropertyValue('--accent').trim()),'#ff5722');
  await p.close();
 }
} finally {await browser.close();}
