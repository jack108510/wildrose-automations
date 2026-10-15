const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(new URL('../rose-funnel-client.js',`file://${__filename}`),'utf8');
test('client sends only anonymous milestone, source and ad content',async()=>{
 const posts=[];const store=new Map();
 const context={window:{},document:{currentScript:{dataset:{apiBase:'https://rose-publisher.wildeautomations.com'}}},location:{href:'https://wildroseautomations.ca/ai-tool-mockup-final.html?utm_source=facebook&utm_content=c01_voice&email=private@example.com',pathname:'/ai-tool-mockup-final.html',search:'?utm_source=facebook&utm_content=c01_voice&email=private@example.com'},sessionStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},crypto:{randomUUID:()=> 'a'.repeat(32)},fetch:async(url,opts)=>{posts.push({url,opts});return {ok:true}},URL,URLSearchParams};
 vm.runInNewContext(source,context);
 context.window.wrFunnel('landing');await Promise.resolve();
 assert.equal(posts.length,1);
 const body=JSON.parse(posts[0].opts.body);
 assert.deepEqual(Object.keys(body).sort(),['event','sessionId','source','content','campaign','group','page'].sort());
 assert.equal(body.source,'facebook');assert.equal(body.content,'c01_voice');assert.equal(body.event,'landing');
 assert.doesNotMatch(JSON.stringify(body),/private@example/);
});

test('engaged visit requires visible time and a trusted interaction',async()=>{
 const posts=[];const handlers={};let tick;let now=0;
 const context={window:{},document:{currentScript:{dataset:{apiBase:'https://rose-publisher.wildeautomations.com'}},visibilityState:'visible',addEventListener:(type,fn)=>{handlers[type]=fn}},location:{pathname:'/',search:'?utm_medium=reachr&reachr_campaign=rose-test&reachr_group=group-a'},sessionStorage:{getItem:()=>null,setItem:()=>{}},crypto:{randomUUID:()=> 'a'.repeat(32)},fetch:async(_url,opts)=>{posts.push(JSON.parse(opts.body));return {ok:true}},URLSearchParams,Date:class extends Date{static now(){return now}},setInterval:fn=>{tick=fn;return 1},clearInterval:()=>{}};
 vm.runInNewContext(source,context);
 for(let i=0;i<8;i++){now+=1000;tick()}
 assert.equal(posts.length,0);
 handlers.pointerdown({isTrusted:false});
 assert.equal(posts.length,0);
 handlers.pointerdown({isTrusted:true});
 assert.equal(posts.length,1);
 assert.equal(posts[0].event,'engaged_visit');
 handlers.keydown({isTrusted:true});
 assert.equal(posts.length,1);
});
