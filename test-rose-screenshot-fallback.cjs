const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = __dirname;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==', 'base64');
const id = 'a'.repeat(48);

async function setup(mode, failCapture = false) {
  const server = http.createServer((req, res) => {
    const name = req.url.split('?')[0];
    if (name === '/ai-tool-mockup-final.html' || name === '/wildrose-widget-sandbox.js') {
      res.setHeader('Content-Type', name.endsWith('.js') ? 'application/javascript' : 'text/html');
      return res.end(fs.readFileSync(path.join(root, name.slice(1))));
    }
    res.statusCode = 404; res.end('Not found');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport:{width:1200,height:850}});
  let captures = 0;
  await page.route('**/api/site-mockup', route => route.fulfill({status:200, headers:{'Access-Control-Allow-Origin':'*','Content-Type':'application/json'},body:JSON.stringify({ok:true,url:'https://kmcspark.com/',brandName:'KMC Spark',businessName:'KMC Spark',accent:'#317cf6',industry:'electrician',services:['Electrical'],preview:{mode}})}));
  await page.route('**/api/site-screenshot', route => {captures++;return route.fulfill({status:failCapture?422:200,headers:{'Access-Control-Allow-Origin':'*','Content-Type':'application/json'},body:JSON.stringify(failCapture?{error:'Capture unavailable'}:{ok:true,assetUrl:`/api/site-screenshot/${id}.png`,width:1440,height:2100})})});
  await page.route('**/api/site-screenshot/*.png', route => route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*','Content-Type':'image/png'},body:png}));
  await page.goto(`http://127.0.0.1:${server.address().port}/ai-tool-mockup-final.html?website=kmcspark.com`);
  return {page, captures:()=>captures, async close(){await browser.close();await new Promise(resolve=>server.close(resolve))}};
}

test('blocked website shows its captured screenshot with Rose above it, not a blocked iframe', async () => {
  const app=await setup('screenshot');
  try {
    await app.page.locator('.site-frame .site-screenshot img').waitFor({timeout:12000});
    await app.page.waitForFunction(()=>document.querySelector('.site-screenshot img')?.naturalWidth>0);
    assert.equal(await app.page.locator('.site-frame iframe').count(),0);
    assert.equal(await app.page.locator('.site-frame .site-screenshot').isVisible(),true);
    assert.match(await app.page.locator('.browser .pill').innerText(),/site image.*Rose interactive/i);
    assert.equal(await app.page.locator('.wr-ai').isVisible(),true);
    assert.equal(app.captures(),1);
  } finally {await app.close()}
});

test('embeddable websites keep an iframe and do not trigger a screenshot capture', async () => {
  const app=await setup('unknown');
  try {
    await app.page.locator('.site-frame iframe').waitFor({timeout:12000});
    assert.equal(await app.page.locator('.site-screenshot').count(),0);
    assert.equal(app.captures(),0);
  } finally {await app.close()}
});

test('failed captures show an honest original-site link without hiding Rose', async () => {
  const app=await setup('screenshot',true);
  try {
    const link=app.page.getByRole('link',{name:'Open the original website'});
    await link.waitFor({timeout:12000});
    assert.equal(await link.getAttribute('href'),'https://kmcspark.com/');
    assert.equal(await app.page.locator('.site-screenshot img').count(),0);
    assert.equal(await app.page.locator('.wr-ai').isVisible(),true);
  } finally {await app.close()}
});
