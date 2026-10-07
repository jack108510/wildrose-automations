const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(process.env.PREVIEW_HTML||require('node:path').join(__dirname,'../ai-tool-mockup-final.html'),'utf8');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
const tick=async()=>{for(let i=0;i<20;i++)await Promise.resolve()};
function fixture(){
 const classes=new Set(),images=[],captures=[],scans=[],frames=[],timers=[];
 const classList={add:(...v)=>v.forEach(x=>classes.add(x)),remove:(...v)=>v.forEach(x=>classes.delete(x)),toggle:(v,on)=>on?classes.add(v):classes.delete(v)};
 const element=()=>({isConnected:true,classList,style:{setProperty(){}},append(){},appendChild(){},replaceChildren(){},remove(){this.isConnected=false},addEventListener(){},scrollIntoView(){},querySelector(){return null},getBoundingClientRect(){return {top:0}}});
 let container;
 const stage=element();Object.defineProperty(stage,'innerHTML',{set(value){if(container)container.isConnected=false;this.html=value;container=element();const status=element();container.querySelector=()=>status;container.children=[];container.appendChild=x=>container.children.push(x)}});stage.querySelector=()=>container;
 const build={disabled:false,textContent:'Build',dataset:{}},input={value:'https://first.example/'};
 const context={console,URL,URLSearchParams,Promise,Error,AbortController,API:'https://api.example',state:{data:null},stage,build,input,mock:element(),location:{search:'',href:'https://preview.example/'},embedMode:false,tools:{voice:{}},previewGeneration:0,
 document:{body:element(),documentElement:element(),querySelectorAll:()=>[],querySelector:()=>null,getElementById:()=>null,createElement(tag){const el=element();if(tag==='img'){el.decoding=deferred();el.decode=()=>el.decoding.promise;images.push(el)}return el}},
 postJson(url){const d=deferred();(url.endsWith('/api/site-mockup')?scans:captures).push(d);return d.promise},
 setTimeout(fn,ms){if(ms===3000){queueMicrotask(fn);return 0}const timer={fn,ms};timers.push(timer);return timer},clearTimeout(t){const i=timers.indexOf(t);if(i>=0)timers.splice(i,1)},requestAnimationFrame(fn){frames.push(fn)},
 $:()=>element(),cleanUrl:x=>x,host:x=>x,normalizeUrl:x=>x,chooseAccent:()=> '#123456',normalizeLogoList:()=>[],assistantName:()=> 'Rose',fallbackCards:()=>[],esc:x=>String(x||''),installRealRoseWidget(){},widgetClientId:()=> 'client',siteAssistantContext:()=> '',showToast(){},window:{scrollTo(){},scrollY:0,innerHeight:800}};
 vm.createContext(context);
 vm.runInContext(source.slice(source.indexOf('async function loadPreviewScreenshot'),source.indexOf("form.addEventListener('submit',generate)")),context);
 const data=url=>({url,brandName:'Business',preview:{mode:'screenshot'}});
 return {context,classes,images,captures,scans,frames,timers,build,input,stage,data,get container(){return container},paint:async()=>{assert.ok(frames.length,'must wait for a paint frame');frames.shift()();await tick()}};
}
test('scanning stage is paintable behind the opaque loading panel, not display:none',()=>{
 assert.match(source,/\.scanning \.stage\{display:block;position:absolute;inset:0 0 auto;pointer-events:none\}/);
 assert.match(source,/\.scanning #mockSection>\.wrap\{position:relative;overflow:hidden\}/);
 assert.match(source,/\.scanning \.loading-panel\{z-index:1\}/);
});
test('generate stays scanning through capture, image load, decode, insertion and two paint frames',async()=>{
 const f=fixture(),run=f.context.generate();f.scans[0].resolve(f.data(f.input.value));await tick();
 assert.ok(f.classes.has('scanning'),'capture pending must retain scanning');assert.equal(f.build.disabled,true);
 f.captures[0].resolve({assetUrl:'/api/site-screenshot/'+ 'a'.repeat(48)+'.png'});await tick();
 assert.ok(f.classes.has('scanning'),'image load pending must retain scanning');assert.equal(f.classes.has('ready'),false);
 f.images[0].onload();await tick();assert.ok(f.classes.has('scanning'),'decode pending must retain scanning');
 f.images[0].decoding.resolve();await tick();assert.ok(f.container.children.includes(f.images[0]),'decoded image inserted');assert.ok(f.classes.has('scanning'));
 await f.paint();assert.ok(f.classes.has('scanning'),'first frame is not a completed paint');await f.paint();await run;
 assert.equal(f.classes.has('scanning'),false);assert.ok(f.classes.has('ready'));assert.equal(f.build.disabled,false);
});
for(const failure of ['capture','load','decode','timeout'])test(failure+' failure exits scanning, reports error and permits retry',async()=>{
 const f=fixture(),run=f.context.generate();f.scans[0].resolve(f.data(f.input.value));await tick();
 if(failure==='capture')f.captures[0].reject(new Error('Capture failed'));
 else {f.captures[0].resolve({assetUrl:'/api/site-screenshot/'+ 'b'.repeat(48)+'.png'});await tick();if(failure==='load')f.images[0].onerror();else if(failure==='timeout'){const timer=f.timers.find(t=>t.ms===35000);assert.ok(timer,'image deadline');timer.fn()}else{f.images[0].onload();await tick();f.images[0].decoding.reject(new Error('Decode failed'))}}
 await run;assert.equal(f.classes.has('scanning'),false);assert.equal(f.build.disabled,false);assert.match(f.stage.html,/Could not build that preview/);assert.match(f.stage.html,/retryPreview/);
 const retry=f.context.generate();assert.equal(f.scans.length,2);f.scans[1].reject(new Error('Retry scan failed'));await retry;assert.equal(f.build.disabled,false);
});
test('stale screenshot cannot complete or overwrite a newer generation',async()=>{
 const f=fixture(),old=f.context.generate();f.scans[0].resolve(f.data(f.input.value));await tick();f.captures[0].resolve({assetUrl:'/api/site-screenshot/'+ 'c'.repeat(48)+'.png'});await tick();f.images[0].onload();await tick();
 f.input.value='https://second.example/';const newer=f.context.generate();f.images[0].decoding.resolve();await tick();while(f.frames.length)await f.paint();await old;
 assert.ok(f.classes.has('scanning'));assert.equal(f.classes.has('ready'),false);assert.equal(f.build.disabled,true);
 f.scans[1].reject(new Error('New scan failed'));await newer;assert.equal(f.build.disabled,false);
});
