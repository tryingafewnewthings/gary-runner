'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),boot=require('./helpers/headless.cjs');
const KEY='gary-eats-discovered-food-v1';
const fs=require('node:fs'),path=require('node:path');
function capture(f,name){const dir=path.join(__dirname,'../test-results/headless');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,name+'.png'),f.canvas().toBuffer('image/png'));}
async function play(f){f.w.document.getElementById('startBtn').click();f.w.document.getElementById('skipIntroBtn').click();f.w.__test.skipEntrance();assert.equal(f.w.__test.snapshot().state,'play');}
async function skipCutscene(w){
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(w.__test.snapshot().state,'cutscene');
 assert.ok(w.document.querySelector('.gc-skip'),'active cutscene skip control should be mounted');
 w.__test.skipDialogue();
 for(let i=0;i<120&&w.__test.snapshot().state==='cutscene';i++)w.__test.advance(1/60);
 assert.equal(w.__test.snapshot().state,'play','skipping the active cutscene should resume gameplay');
}
test('active engine: existing saves migrate; first pickups notify once and unread highlights survive reopen',async()=>{
 const f=await boot({[KEY]:JSON.stringify({kebab:{firstSeen:100,count:4}})});try{
 const {w}=f,cat=w.GaryFoodCatalogue;await play(f);
 w.__test.pickup('kebab');assert.equal(w.document.getElementById('garyDiscoveryToast').hidden,true);
 w.__test.pickup('fish');assert.equal(w.document.getElementById('garyDiscoveryToast').hidden,false);
 assert.equal(w.document.getElementById('garyDiscoveryName').textContent,'Fish & Chips');
 assert.match(w.document.getElementById('garyCatalogueBtn').textContent,/1 new/);
 w.__test.suspend();const paused=w.__test.snapshot();for(let i=0;i<300;i++)w.__test.advance(1/60);assert.deepEqual(w.__test.snapshot(),paused);
 assert.equal(w.document.getElementById('garyDiscoveryToast').hidden,true);
 w.__test.resume();assert.equal(w.document.getElementById('garyDiscoveryToast').hidden,false);
 w.__test.pickup('fish');cat.tick(2.7);assert.equal(w.document.getElementById('garyDiscoveryToast').hidden,true);
 w.dispatchEvent(new w.Event('pagehide'));
 const saved=JSON.parse(f.store.get(KEY));assert.equal(saved.fish.unread,true);assert.equal(saved.fish.count,2);assert.equal(saved.kebab.count,5);
 const again=await boot({[KEY]:JSON.stringify(saved)});try{
  again.w.GaryFoodCatalogue.open();assert.equal(again.w.document.querySelectorAll('.garyFoodTile.unread').length,1);
  assert.equal(again.w.document.querySelector('.garyFoodNew').textContent,'NEW');
  again.w.GaryFoodCatalogue.close();again.w.GaryFoodCatalogue.open();assert.equal(again.w.document.querySelectorAll('.garyFoodTile.unread').length,0);
 }finally{again.close();}
 }finally{f.close();}
});
test('active engine: bench animation, safe slowdown, pause, cutscene skip, idle and reset',async()=>{
 const f=await boot();try{
 const {w}=f;await play(f);w.__test.ending();w.__test.add('fork',0,-50);
 w.__test.advance(1/60);assert.equal(w.__test.snapshot().speed>=199,true);
 const seen=new Set();let paused=false,idleTicks=0,checkedGround=false,captured=false,cutsceneSeen=false;
 for(let i=0;i<2600;i++){
  w.__test.clear();w.__test.advance(1/60);let snap=w.__test.snapshot();
  if(snap.state==='cutscene'){cutsceneSeen=true;await skipCutscene(w);snap=w.__test.snapshot();}
  const bench=w.__test.bench();
  if(bench.foot>=0&&!checkedGround){
   const c=w.document.createElement('canvas');c.width=360;c.height=640;const g=c.getContext('2d');
   w.GaryRoadEvolution.drawCobbles(g,{x:0,y:0,w:105,h:640,distance:snap.distance});
   const pixels=g.getImageData(0,0,102,640).data;let covered=0;
   for(let k=3;k<pixels.length;k+=4)if(pixels[k]>=230)covered++;
   assert.ok(covered/(102*640)>.95,'ground must already swallow the cobbles before bench entry');checkedGround=true;
  }
  if(bench.foot>=196&&bench.foot<=640)seen.add(bench.frame);
  if(bench.frame>=6&&bench.foot>=196&&bench.foot<=640)idleTicks++;
  if(bench.frame===4&&!paused){
   w.__test.suspend();const before=w.__test.snapshot();for(let j=0;j<120;j++)w.__test.advance(1/60);
   assert.deepEqual(w.__test.snapshot(),before);w.__test.resume();paused=true;
  }
  if(!captured&&bench.frame===7&&bench.foot>350&&bench.foot<580){w.__test.render();capture(f,'bench');captured=true;}
  if(snap.mystery.passed){assert.equal(snap.objects,0);assert.equal(snap.state,'play');break;}
 }
 assert.deepEqual([...seen],[0,1,2,3,4,5,6,7]);assert.ok(idleTicks>=84,idleTicks+' idle ticks');assert.equal(paused,true);
 assert.equal(cutsceneSeen,true,'the real alignment trigger must enter the cutscene');assert.ok(Array.from(w.__test.snapshot().cutscene.played).includes('first-bench-meeting'));
 assert.equal(checkedGround,true);assert.equal(w.__test.snapshot().mystery.passed,true);assert.deepEqual(Array.from(w.__test.snapshot().errors),[]);
 w.__test.reset();assert.equal(w.__test.snapshot().mystery.started,false);assert.equal(w.__test.snapshot().mystery.emptyFrom,Infinity);
 }finally{f.close();}
});

test('legacy preview: Safari shortcuts use the isolated preview save',async()=>{
 const f=await boot({[KEY]:JSON.stringify({kebab:{firstSeen:10,count:9}})},true);try{
  const {w}=f;assert.equal(w.GaryLastOrdersPreview.ending(),true);
  assert.equal(w.__test.snapshot().state,'play');
  assert.equal(w.__test.snapshot().mystery.emptyFrom<Infinity,true);
  assert.equal(w.GaryLastOrdersPreview.discover(),true);
  w.dispatchEvent(new w.Event('pagehide'));
  assert.equal(JSON.parse(f.store.get(KEY)).kebab.count,9);
  const discoveries=Object.values(JSON.parse(f.store.get('gary-eats-last-orders-preview-food-v1')));
  assert.equal(discoveries.length,1);assert.equal(discoveries[0].count,1);
 }finally{f.close();}
});

test('active engine: natural decay starts clean, develops for 30 seconds, pauses and resets',async()=>{
 const f=await boot();try{
  const {w}=f,road=w.GaryRoadEvolution;await play(f);
  for(let i=0;i<1200;i++){w.__test.clear();w.__test.advance(1/60);}
  assert.equal(road.snapshot().elapsed,0);assert.equal(w.__test.snapshot().mystery.emptyFrom,Infinity);
  let saved=false;const captured=new Set(),closures=new Map();
  for(let i=0;i<9000;i++){
   w.__test.clear();w.__test.advance(1/60);
   if(w.__test.snapshot().state==='cutscene')await skipCutscene(w);
   const ground=road.snapshot(),shops=w.__test.snapshot().shops;
   assert.ok(shops.entries.length<=6);
   for(const entry of shops.entries){const identity=JSON.stringify([entry.segment,entry.side,entry.time]);if(closures.has(entry.name))assert.equal(identity,closures.get(entry.name),'a shop must close only once');else closures.set(entry.name,identity);}
   if(ground.elapsed>0)assert.equal(shops.closed,true,'decay waits for completed shop closures');
   if(ground.elapsed>0&&ground.elapsed<23.9)assert.equal(w.__test.snapshot().mystery.emptyFrom,Infinity);
   if(ground.elapsed>10&&!saved){w.__test.suspend();const before=road.snapshot();for(let j=0;j<300;j++)w.__test.advance(1/60);assert.deepEqual(road.snapshot(),before);w.__test.resume();saved=true;}
   for(const t of [0,10,20,30])if(!captured.has(t)&&ground.elapsed>=t){w.__test.render();capture(f,'decay-'+t);captured.add(t);}
   if(ground.elapsed===30)break;
  }
  assert.equal(closures.size,6);assert.ok(w.__test.snapshot().shops.entries.every(entry=>entry.progress===1));
  assert.equal(road.snapshot().elapsed,30);assert.equal(saved,true);assert.equal(captured.size,4);
  w.__test.render();const before=road.snapshot();for(let i=0;i<5;i++)w.__test.render();assert.deepEqual(road.snapshot(),before);
  w.__test.reset();assert.equal(road.snapshot().elapsed,0);assert.equal(road.snapshot().progress,0);assert.equal(w.__test.snapshot().shops.entries.length,0);
 }finally{f.close();}
});


test('active engine: index.html startup, lane input, food collision scores, crash and restart',async()=>{
 const f=await boot();try{
  const {w}=f;
  const expected=[...w.document.querySelectorAll('script[src]')].map(script=>new URL(script.src).pathname.slice(1));
  assert.deepEqual(f.scripts,expected);assert.equal(f.scripts.at(-1),'gary-difficulty-runtime.js');
  assert.equal(w.__test.ready(),true);assert.equal(w.document.getElementById('startBtn').disabled,false);
  await play(f);
  for(const [key,lane] of [['ArrowLeft',0],['ArrowRight',1],['ArrowRight',2],['ArrowLeft',1]]){
   w.dispatchEvent(new w.KeyboardEvent('keydown',{key}));
   for(let i=0;i<30;i++){w.__test.clear();w.__test.advance(1/60);}
   assert.equal(w.__test.snapshot().lane,lane);
  }
  let expectedScore=0;
  for(const [kind,points] of [['roast',25],['fish',10],['kebab',5]]){
   w.__test.clear();w.__test.add(kind,1);w.__test.advance(1/60);expectedScore+=points;
   assert.equal(w.__test.snapshot().score,expectedScore);assert.equal(w.GaryFoodCatalogue.isDiscovered(kind),true);
   for(let i=0;i<120;i++){w.__test.clear();w.__test.advance(1/60);}
  }
  w.__test.clear();w.__test.add('fork',1);w.__test.advance(1/60);
  assert.equal(w.__test.snapshot().state,'crash_fork');assert.equal(w.__test.snapshot().performance.collisions,1);
  for(let i=0;i<600&&w.__test.snapshot().state!=='over';i++)w.__test.advance(1/60);
  assert.equal(w.__test.snapshot().state,'over');w.document.getElementById('againBtn').click();
  assert.equal(w.__test.snapshot().state,'menu');assert.equal(w.__test.snapshot().score,0);
  assert.equal(w.GaryFoodCatalogue.isDiscovered('roast'),true);await play(f);
  assert.equal(w.__test.snapshot().performance.collisions,0);
 }finally{f.close();}
});

for(const outcome of ['theft','spared'])test('active engine: fox '+outcome+' after bench dialogue, pause and reset',async()=>{
 const f=await boot({},false,{foxRandom:outcome==='theft'?0.1:0.95});try{
  const {w}=f;await play(f);w.__test.ending();
  let sceneSeen=false,paused=false,spawned=false;const phases=new Set();
  for(let i=0;i<5000;i++){
   w.__test.clearOrdinary();w.__test.advance(1/60);
   let snap=w.__test.snapshot();
   if(snap.state==='cutscene'){sceneSeen=true;await skipCutscene(w);snap=w.__test.snapshot();}
   if(!snap.mystery.passed)assert.equal(snap.fox.phase,'dormant');
   phases.add(snap.fox.phase);
   if(snap.fox.food){
    spawned=true;assert.equal(sceneSeen,true);assert.ok(snap.fox.age>=3.5);
    assert.equal(snap.fox.theft,outcome==='theft');
    if(outcome==='spared'&&snap.fox.food.y<400&&snap.target!==0)w.__test.move(-1);
   }
   if(snap.fox.phase==='approach'||snap.fox.phase==='lead'){
    assert.equal(snap.items.some(item=>['fork','m','street_barrier'].includes(item.kind)),false);
    if(!paused){w.__test.suspend();const before=w.__test.snapshot();for(let j=0;j<120;j++)w.__test.advance(1/60);assert.deepEqual(w.__test.snapshot(),before);w.__test.resume();paused=true;}
   }
   if(snap.fox.finished)break;
  }
  const end=w.__test.snapshot();assert.equal(spawned,true);assert.equal(paused,true);assert.equal(end.fox.finished,true);
  assert.equal(end.fox.outcome,outcome==='theft'?'theft':'collected');assert.equal(end.score,outcome==='theft'?0:10);
  assert.equal(end.performance.collisions,0);assert.equal(end.performance.foodSpawned,outcome==='theft'?0:1);
  assert.equal(w.GaryFoodCatalogue.isDiscovered('sausage_roll'),outcome==='spared');
  if(outcome==='theft')for(const phase of ['approach','snatch','turn','retreat'])assert.ok(phases.has(phase));
  w.__test.render();capture(f,'fox-'+outcome);
  for(let i=0;i<600;i++){w.__test.clearOrdinary();w.__test.advance(1/60);}
  assert.equal(w.__test.snapshot().fox.phase,'done');
  w.__test.reset();assert.equal(w.__test.snapshot().fox.phase,'dormant');
 }finally{f.close();}
});
