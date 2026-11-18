import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.ROSE_PLAYWRIGHT_MODULE || 'playwright');
const folder=dirname(fileURLToPath(import.meta.url));
const output=join(folder,'artifacts/direct-glow');await mkdir(output,{recursive:true});
const widget=await readFile(join(folder,'wildrose-widget.js'),'utf8');
const logo=await readFile(join(folder,'logos/wildrose.png'));
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
try {
  await page.route('**/rose-widget.js?**',route=>route.abort());
  await page.route('**/logos/wildrose.png',route=>route.fulfill({status:200,contentType:'image/png',body:logo}));
  await page.goto('https://jack108510.github.io/rose-agent-configurator/install-test/',{waitUntil:'domcontentloaded'});
  await page.addScriptTag({content:widget});
  await page.locator('.wr-fab').click();await page.locator('.wr-tab[data-view="chat"]').click();
  await page.locator('.wr-input').fill('Where is the wholesale bread info?');await page.locator('.wr-send').click();
  await page.locator('.rose-direct-spotlight').waitFor();
  assert.match(await page.locator('.rose-direct-spotlight').getAttribute('data-rose-target'),/Made to celebrate|wholesale/i);
  assert.ok(await page.locator('.bake-card').filter({hasText:'wholesale bread'}).count());
  await page.screenshot({path:join(output,'direct-bakery-wholesale.png')});console.log('PASS direct live bakery wholesale glow');
  await page.locator('.wr-input').fill('Show me your hours');await page.locator('.wr-send').click();
  await page.locator('.rose-direct-spotlight[data-rose-target="Opening hours"]').waitFor();
  assert.ok(page.url().includes('/install-test/'));
  await page.screenshot({path:join(output,'direct-bakery-hours.png')});console.log('PASS direct live bakery hours glow, no navigation');
}finally{await browser.close();}
