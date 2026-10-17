'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),boot=require('./helpers/headless.cjs');
const KEY='gary-eats-discovered-food-v1';
async function play(f){f.w.document.getElementById('startBtn').click();f.w.document.getElementById('skipIntroBtn').click();f.w.__test.skipEntrance();assert.equal(f.w.__test.snapshot().state,'play');}
test('existing saves migrate; first pickups notify once, unread highlights survive reopen',async()=>{
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
test('actual engine: safe slowdown, all eight visible frames, pause, idle, restart',async()=>{
 const f=await boot();try{
 const {w}=f;await play(f);w.__test.ending();w.__test.hazard();
 w.__test.advance(1/60);assert.equal(w.__test.snapshot().speed>=199,true);
 const seen=new Set();let paused=false,idleTicks=0;
 for(let i=0;i<2600;i++){
  w.__test.advance(1/60);const snap=w.__test.snapshot(),bench=w.__test.bench();
  if(bench.foot>=196 && bench.foot<=640)seen.add(bench.frame);
  if(bench.frame>=6 && bench.foot>=196 && bench.foot<=640)idleTicks++;
  if(bench.frame===4&&!paused){
   w.__test.suspend();const before=w.__test.snapshot();for(let j=0;j<120;j++)w.__test.advance(1/60);
   assert.deepEqual(w.__test.snapshot(),before);w.__test.resume();paused=true;
  }
  if(bench.frame===7 && bench.foot>350 && bench.foot<580){w.__test.render();require('node:fs').writeFileSync('/tmp/gary-last-orders-render.png',f.canvas().toBuffer('image/png'));}
  if(snap.mystery.passed){assert.equal(snap.objects,0);assert.equal(snap.state,'play');break;}
 }
 assert.deepEqual([...seen],[0,1,2,3,4,5,6,7]);assert.ok(idleTicks>=84,idleTicks+' idle ticks');assert.equal(paused,true);
 assert.equal(w.__test.snapshot().mystery.passed,true);assert.deepEqual(Array.from(w.__test.snapshot().errors),[]);
 w.__test.reset();assert.equal(w.__test.snapshot().mystery.started,false);assert.equal(w.__test.snapshot().mystery.emptyFrom,Infinity);
 }finally{f.close();}
});


test('Safari preview shortcuts use the staged engine and an isolated food save',async()=>{
 const f=await boot({[KEY]:JSON.stringify({kebab:{firstSeen:10,count:9}})},true);try{
  const {w}=f;assert.equal(w.GaryLastOrdersPreview.ending(),true);
  assert.equal(w.__test.snapshot().state,'play');
  assert.equal(w.__test.snapshot().mystery.emptyFrom<Infinity,true);
  assert.equal(w.GaryLastOrdersPreview.discover(),true);
  w.dispatchEvent(new w.Event('pagehide'));
  assert.equal(JSON.parse(f.store.get(KEY)).kebab.count,9);
  assert.equal(JSON.parse(f.store.get('gary-eats-last-orders-preview-food-v1')).kebab.count,1);
 }finally{f.close();}
});
