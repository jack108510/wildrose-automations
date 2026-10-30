const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import fs from 'node:fs/promises';
const source=await fs.readFile(new URL('../wildrose-widget-sandbox.js',import.meta.url),'utf8');
const live=process.argv.includes('--live');
const b=await chromium.launch({headless:true});
try {for(const [width,height] of [[390,760],[1440,900]]) {
 const p=await b.newPage({viewport:{width,height},reducedMotion:'reduce'});
 if(!live)await p.route('**/wildrose-widget-sandbox.js*',r=>r.fulfill({contentType:'application/javascript',body:source}));
 await p.goto('https://kmcspark.com',{waitUntil:'domcontentloaded'});
 await p.mouse.click(5,300);await p.locator('.wr-fab').waitFor({state:'attached',timeout:30000});
 if(width<520) await p.evaluate(()=>scrollTo(0,1100));
 await p.locator('.wr-fab').waitFor({state:'visible',timeout:30000});await p.locator('.wr-fab').click();
 await p.waitForTimeout(500);
 await p.screenshot({path:`/tmp/kmc-${live?'live':'fixed'}-${width}.png`});
 console.log(width,await p.locator('.wr-panel').evaluate(e=>({height:e.offsetHeight,theme:e.closest('.wr-ai').dataset.clientTheme,accent:getComputedStyle(e).getPropertyValue('--accent')})));
 await p.close();
}} finally {await b.close();}
