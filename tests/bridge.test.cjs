'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {create,renderer}=require('../gary-bridge.js');
const boot=require('./helpers/headless.cjs');
const tick=(b,distance,extra={})=>b.update(1/60,{distance,foxFinished:true,hazardsClear:true,...extra});
test('bridge waits for fox completion, clear hazards and dialogue; progresses once, resets',()=>{
 const b=create();for(const extra of [{foxFinished:false},{hazardsClear:false},{dialogueActive:true}])tick(b,100,extra);
 assert.equal(b.snapshot().phase,'dormant');tick(b,100);const anchor=b.snapshot().anchor;
 assert.equal(b.warning(),true);assert.equal(b.locked(),false);
 tick(b,anchor+350);assert.equal(b.locked(),true);
 tick(b,anchor+850);assert.equal(b.snapshot().phase,'crossing');
 tick(b,anchor+1260);assert.equal(b.locked(),false);assert.equal(b.snapshot().phase,'exit');
 tick(b,anchor+1450);assert.equal(b.quiet(),false);tick(b,anchor+5000);assert.equal(b.snapshot().anchor,anchor);
 b.reset();assert.equal(b.visible(),false);tick(b,100);assert.equal(b.snapshot().near,-180);
});
test('collapse requires explicit opt-in, shipped biome, crossing and rare outcome',()=>{
 for(const [enabled,ready] of [[false,false],[true,false],[false,true],[true,true]]){
  const b=create({collapseEnabled:enabled,biomeReady:name=>ready&&name==='underwater-cave'});tick(b,0);
  assert.equal(b.requestCollapse(0),false);tick(b,b.snapshot().anchor+850);
  assert.equal(b.requestCollapse(.1),false);assert.equal(b.requestCollapse(-1),false);
  assert.equal(b.requestCollapse(0),enabled&&ready);
  assert.equal(b.requestCollapse(0),false,'collapse branch can be selected only once');
 }
});
test('cached rendering is pure and bounded',()=>{
 const {createCanvas}=require('@napi-rs/canvas');let allocations=0;
 const r=renderer(()=>{allocations++;return createCanvas(1,1)}),c=createCanvas(360,640).getContext('2d');
 for(let i=0;i<100;i++){r.drawWater(c,850,i/60);r.drawLower(c,850);r.drawDeck(c,850);r.drawForeground(c,850)}
 assert.equal(allocations,4);assert.equal(r.cacheCount,4);
});
test('real engine: guided lane, suppressed hazards, pause/resume, reset and complete crossing',async()=>{
 const f=await boot();try{
  const {w}=f;assert.equal(w.GaryBridgePreview.start('approach'),true);
  w.__test.move(-1);for(let i=0;i<30;i++)w.__test.advance(1/60);assert.equal(w.__test.snapshot().target,0);
  let locked=false;
  for(let i=0;i<500;i++){
   w.__test.advance(1/60);const s=w.__test.snapshot();
   if(s.bridge.near>=350&&s.bridge.near<1260){locked=true;w.__test.move(-1);w.__test.move(1);assert.equal(w.__test.snapshot().target,1);if(s.bridge.near>500)assert.equal(s.lane,1);}
   assert.equal(s.items.some(o=>['fork','mushroom','wide'].includes(o.kind)),false);
   if(s.bridge.near>900)break;
  }
  assert.equal(locked,true);w.__test.suspend();const before=w.__test.snapshot();
  for(let i=0;i<120;i++)w.__test.advance(1/60);assert.deepEqual(w.__test.snapshot(),before);
  w.__test.resume();for(let i=0;i<160;i++)w.__test.advance(1/60);
  assert.equal(w.__test.bridge().phase,'done');assert.equal(w.__test.bridge().collapse,false);
  w.__test.move(-1);assert.equal(w.__test.snapshot().target,0);
  w.__test.reset();assert.equal(w.__test.bridge().phase,'dormant');
 }finally{f.close()}
});
for(const outcome of ['theft','spared'])test('real story: bridge follows '+outcome+' fox once and returns to fair ordinary spawning',async()=>{
 const f=await boot({},false,{foxRandom:outcome==='theft'?.1:.95});try{
  const {w}=f;w.document.getElementById('startBtn').click();w.document.getElementById('skipIntroBtn').click();w.__test.skipEntrance();w.__test.ending();
  let sawScene=false,sawFox=false,crossed=false,anchor;
  for(let i=0;i<5500;i++){
   // Only the old street fixture clears items. The crossing itself runs untouched.
   if(!w.__test.bridge().phase||w.__test.bridge().phase==='dormant')w.__test.clearOrdinary();
   w.__test.advance(1/60);let s=w.__test.snapshot();
   if(s.state==='cutscene'){sawScene=true;await new Promise(r=>setImmediate(r));w.__test.skipDialogue();continue;}
   if(!s.fox.finished)assert.equal(s.bridge.phase,'dormant');
   if(s.bridge.phase!=='dormant'){
    sawFox=true;assert.equal(sawScene,true);assert.equal(s.fox.finished,true);
    anchor??=s.bridge.anchor;assert.equal(s.bridge.anchor,anchor);
    assert.equal(s.performance.collisions,0);
    if(s.bridge.phase!=='done')assert.equal(s.items.some(o=>['fork','m','street_barrier'].includes(o.kind)),false);
    if(s.bridge.phase==='done'){crossed=true;break;}
   }
  }
  assert.equal(sawFox,true);assert.equal(crossed,true);
  w.__test.advance(1/60);assert.equal(w.__test.snapshot().items.length,0,'no queued hazard release on exit');
  for(let i=0;i<90;i++)w.__test.advance(1/60);
  assert.ok(w.__test.snapshot().items.length>0,'ordinary rows resume with advance approach space');
  assert.equal(w.__test.snapshot().state,'play');
  assert.equal(w.__test.bridge().anchor,anchor);w.__test.reset();assert.equal(w.__test.bridge().phase,'dormant');
 }finally{f.close()}
});
test('debug preview crash/replay cannot change real discoveries, best score or difficulty telemetry',async()=>{
 const original={'garyBest':'10','gary-eats-discovered-food-v1':'{}','gary_difficulty_telemetry_v2':'[]'};
 const f=await boot(original,false,{urlSearch:'debug=1&bridgepreview=1&seed=12345'});try{
  const {w}=f;w.GaryBridgePreview.start('middle');w.__test.add('roast',1);w.__test.advance(1/60);
  w.__test.add('fork',1);w.__test.advance(1/60);assert.equal(w.__test.snapshot().state,'crash_fork');
  for(let i=0;i<600&&w.__test.snapshot().state!=='over';i++)w.__test.advance(1/60);
  assert.equal(w.__test.snapshot().state,'over');w.dispatchEvent(new w.Event('pagehide'));
  for(const [k,v] of Object.entries(original))assert.equal(f.store.get(k),v,k);
  assert.equal(f.store.get('gary-bridge-preview-best'),'25');
  assert.equal(JSON.parse(f.store.get('gary-eats-bridge-preview-food-v1')).roast.count,1);
  assert.equal(w.GaryBridgePreview.start('enter'),true);assert.equal(w.__test.snapshot().state,'play');
 }finally{f.close()}
});
