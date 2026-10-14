const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('landing and widget milestones are wired to first-party funnel',()=>{
 const html=fs.readFileSync(new URL('../ai-tool-mockup-final.html',`file://${__filename}`),'utf8');
 const widget=fs.readFileSync(new URL('../wildrose-widget-sandbox.js',`file://${__filename}`),'utf8');
 assert.match(html,/rose-funnel-client\.js/);
 assert.match(html,/wildrose-widget-sandbox\.js\?v=front-desk-2/);
 for(const event of ['landing','preview_attempt','preview_ready','preview_error','purchase_view']) assert.match(html,new RegExp(`wrFunnel\\?\\.\\(['"]${event}['"]`));
 for(const event of ['widget_open','chat_send','voice_attempt']) assert.match(widget,new RegExp(`wrFunnel\\?\\.\\(['"]${event}['"]`));
});
