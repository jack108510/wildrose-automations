const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(new URL('../rose-funnel-client.js',`file://${__filename}`),'utf8');
test('client sends only anonymous milestone, source and ad content',async()=>{
 const posts=[];const store=new Map();
 const context={window:{},document:{currentScript:{dataset:{apiBase:'https://rose-analytics.wildeautomations.com'}}},location:{href:'https://wildroseautomations.ca/ai-tool-mockup-final.html?utm_source=facebook&utm_content=c01_voice&email=private@example.com',pathname:'/ai-tool-mockup-final.html',search:'?utm_source=facebook&utm_content=c01_voice&email=private@example.com'},sessionStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},crypto:{randomUUID:()=> 'a'.repeat(32)},fetch:async(url,opts)=>{posts.push({url,opts});return {ok:true}},URL,URLSearchParams};
 vm.runInNewContext(source,context);
 context.window.wrFunnel('landing');await Promise.resolve();
 assert.equal(posts.length,1);
 const body=JSON.parse(posts[0].opts.body);
 assert.deepEqual(Object.keys(body).sort(),['event','sessionId','source','content','page'].sort());
 assert.equal(body.source,'facebook');assert.equal(body.content,'c01_voice');assert.equal(body.event,'landing');
 assert.doesNotMatch(JSON.stringify(body),/private@example/);
});
