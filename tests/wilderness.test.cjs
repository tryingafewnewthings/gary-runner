'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createCanvas,loadImage}=require('@napi-rs/canvas'),World=require('../gary-wilderness.js'),Encounters=require('../gary-wilderness-encounters.js'),data=require('../gary-wilderness-data.js'),boot=require('./helpers/headless.cjs');
const root=path.join(__dirname,'..'),registration=require('../art/wilderness/registration.json');
async function artFixture(seed=12345){let allocations=0;const images={};await Promise.all(Object.entries(data.assets).map(async([name,d])=>{const im=await loadImage(path.join(root,'art/wilderness',d.path));im.ready=true;images[name]=im}));const encounters=Encounters.create({seed});const world=World.create({data,images,encounters,seed,makeCanvas:()=>{allocations++;return createCanvas(1,1)}});await world.prepare();return {world,encounters,allocations:()=>allocations};}
test('supplied asset audit preserves canonical names, source hashes, measured crops and full grass registration',async()=>{
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'GaryEats_Wilderness_Asset_Pack_DRAFT01.zip'))).digest('hex'),registration.archiveSha256);
 assert.equal(Object.keys(data.assets).length,38);
 const grass=Object.values(data.assets).filter(a=>a.role==='verge');assert.equal(grass.length,6);
 for(const [file,a] of Object.entries(registration.assets)){
  const bytes=fs.readFileSync(path.join(root,'art/wilderness',file));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),a.sha256);
  const def=data.assets[path.basename(file,'.png')];assert.equal(def.path,file);assert.equal(def.width,a.width);assert.equal(def.height,a.height);assert.deepEqual(def.anchor,a.anchor);assert.equal(def.role,a.role);if(a.role==='surface')assert.equal(def.drawHeight,512);else assert.ok(Math.abs(def.drawHeight-def.drawWidth*a.height/a.width)<.011);
  const im=await loadImage(bytes);assert.equal(im.width,a.width);assert.equal(im.height,a.height);assert.ok(a.anchor[0]>=0&&a.anchor[0]<im.width);assert.ok(a.anchor[1]>0&&a.anchor[1]<=im.height);
  if(a.role!=='surface'){const c=createCanvas(im.width,im.height),g=c.getContext('2d');g.drawImage(im,0,0);assert.equal(g.getImageData(0,0,1,1).data[3],0);assert.equal(g.getImageData(im.width-1,im.height-1,1,1).data[3],0);}
 }
 const log=registration.assets['hazards/fallen_log_large_01.png'];assert.ok(log.sourceRect[2]-log.sourceRect[0]>512,'whole log crosses proposed atlas cells and must not be blindly sliced');
 assert.equal(registration.assets['hazards/puddle_hazard_large_01.png'].role,'decal');assert.equal(registration.assets['hazards/muddy_ruts_hazard_01.png'].role,'decal');
});
test('encounters are seeded, cooldown-limited, pause/blocked-safe and wait for the hazard corridor',()=>{
 function run(seed){const events=[],s=Encounters.create({seed,config:{rarity:1,cooldown:2,initialDelay:0,minProgress:0},spawnFood:()=>{events.push('food');return true},onCue:()=>events.push('cue')});
  const w={progress:2000,distance:10000,hazardsClear:false,blocked:false};s.update(1/60,w);assert.equal(s.state.phase,'waiting');
  for(let i=0;i<200;i++)s.update(1/60,w);assert.equal(s.state.count,0);
  const before=s.snapshot();for(let i=0;i<100;i++)s.update(1/60,{...w,blocked:true});assert.deepEqual(s.snapshot(),before);
  w.hazardsClear=true;for(let i=0;i<10*60;i++){w.distance+=4;s.update(1/60,w)}
  assert.ok(s.state.count<=2);return {events,state:s.snapshot()};
 }
 for(let seed=1;seed<25;seed++)assert.deepEqual(run(seed),run(seed));
 const never=Encounters.create({config:{rarity:0,initialDelay:0,minProgress:0}});for(let i=0;i<2000;i++)never.update(1/60,{progress:5000,distance:10000,hazardsClear:true});assert.equal(never.state.count,0);
});
test('all rustle outcomes complete once; a full pickup pool retries without resampling or duplicate awards',()=>{
 for(const outcome of ['nothing','food','cue']){let attempts=0,foods=0,cues=0;const c=Encounters.create({spawnFood:()=>{attempts++;if(attempts<4)return false;foods++;return true},onCue:()=>cues++});
  c.preview(outcome,10000);for(let i=0;i<300;i++)c.update(1/60,{progress:3000,distance:10000,hazardsClear:true});
  assert.equal(c.state.phase,'idle');assert.equal(foods,outcome==='food'?1:0);assert.equal(cues,outcome==='cue'?1:0);assert.equal(c.state.cooldown>0,true);
  c.reset(17);assert.equal(c.state.phase,'idle');assert.equal(c.state.count,0);
 }
});
test('environment begins only beyond the bridge and passes through all four world-registered stages',async()=>{
 const {world}=await artFixture();const tick=(distance,bridge={phase:'dormant'})=>world.update(1/60,{distance,bridge,hazardsClear:true,blocked:false});
 tick(90000);assert.equal(world.active(),false);tick(10000,{phase:'approach',anchor:10000});assert.equal(world.origin(),10770);
 for(const [p,stage] of [[0,0],[1499,0],[1500,1],[3999,1],[4000,2],[8499,2],[8500,3],[40000,3]]){tick(10770+546+p,{phase:'done',anchor:10000});assert.equal(world.stage(),stage);}
 assert.ok(world.weather()<.1);world.reset(12345);assert.equal(world.active(),false);assert.equal(world.snapshot().encounter.count,0);assert.equal(world.ready(),true);
});
test('renderer stays deterministic and bounded; foliage never covers the three lanes; reset reuses caches',async()=>{
 const {world,allocations}=await artFixture();world.begin(0);const a=createCanvas(360,640),b=createCanvas(360,640),g=a.getContext('2d');const count=allocations();
 world.drawGround(g,10546,8);world.drawDecor(g,10546,8,false);world.drawDecor(g,10546,8,true);
 const before=a.toBuffer('image/png');world.reset(12345);world.begin(0);const h=b.getContext('2d');world.drawGround(h,10546,8);world.drawDecor(h,10546,8,false);world.drawDecor(h,10546,8,true);assert.equal(crypto.createHash('sha256').update(b.toBuffer('image/png')).digest('hex'),crypto.createHash('sha256').update(before).digest('hex'));
 g.clearRect(0,0,360,640);world.drawDecor(g,10546,8,false);world.drawDecor(g,10546,8,true);const road=g.getImageData(105,0,150,640).data;for(let i=3;i<road.length;i+=4)assert.equal(road[i],0);
 const snapshot=world.snapshot();for(let i=0;i<2;i++){world.drawGround(g,10546,8);world.drawDecor(g,10546,8,false);world.drawDecor(g,10546,8,true);g.getImageData(0,0,1,1)}assert.deepEqual(world.snapshot(),snapshot);assert.equal(allocations(),count);assert.equal(world.snapshot().cacheCount,11);
 g.clearRect(0,0,360,640);world.drawGround(g,400,8);assert.ok(g.getImageData(0,399,1,1).data[3]<4,'entrance banks feather over the old terrain');assert.equal(g.getImageData(0,100,1,1).data[3],255);
 assert.equal(world.covers(800),false,'old terrain remains behind the translucent entrance');assert.equal(world.covers(900),true);
 const registered=[...g.getImageData(0,180,1,1).data];g.clearRect(0,0,360,640);world.drawGround(g,480,8);assert.deepEqual([...g.getImageData(0,260,1,1).data],registered,'the same entrance world point moves exactly80 screen units');
});
test('real engine: natural hazard rows retain safe lanes and reaction budgets without urban barriers',async()=>{
 const f=await boot({},false,{urlSearch:'debug=1&bridgepreview=1&seed=12345'});try{const w=f.w;w.GaryWildernessPreview.start('dense');let rows=0,previousTime=-100;const seen=new Set(),hazards=new Set();
  for(let i=0;i<2400;i++){w.__test.clear();w.__test.advance(1/60);const s=w.__test.snapshot();const items=s.items.filter(o=>o.patternId!=='wilderness-rustle');
   if(items.length){const id=items[0].patternId;if(!seen.has(id)){seen.add(id);rows++;assert.ok(i/60-previousTime>.59);previousTime=i/60;const blocked=new Set(items.filter(o=>World.HAZARDS.includes(o.kind)).map(o=>o.lane));assert.ok(blocked.size<3);}
    for(const o of items){assert.notEqual(o.kind,'street_barrier');if(World.HAZARDS.includes(o.kind))hazards.add(o.kind);}
   }
  }
  assert.ok(rows>10);assert.equal(hazards.size,3);assert.equal(w.__test.bridge().collapse,false);
 }finally{f.close()}
});
test('real engine: rustle food uses real collection/catalogue; pause, collision, crash/restart and save isolation survive',async()=>{
 const saved={'garyBest':'40','gary-eats-discovered-food-v1':'{}','gary_difficulty_telemetry_v2':'[]'},f=await boot(saved,false,{urlSearch:'debug=1&bridgepreview=1&seed=12345'});try{const w=f.w;w.GaryWildernessPreview.start('rustle');w.__test.rustle('food');
  w.__test.suspend();const before=w.__test.snapshot();for(let i=0;i<100;i++)w.__test.advance(1/60);assert.deepEqual(w.__test.snapshot(),before);w.__test.resume();
  for(let i=0;i<180;i++)w.__test.advance(1/60);assert.equal(w.__test.snapshot().score,5);assert.equal(w.GaryFoodCatalogue.isDiscovered('custard_cream'),true);
  for(const kind of World.HAZARDS){w.GaryWildernessPreview.start('dense');w.__test.add(kind,1);w.__test.advance(1/60);assert.equal(w.__test.snapshot().state,'crash_m');for(let i=0;i<600&&w.__test.snapshot().state!=='over';i++)w.__test.advance(1/60);assert.equal(w.__test.snapshot().state,'over');}
  w.__test.reset();assert.equal(w.__test.wilderness().origin,null);assert.equal(w.__test.bridge().phase,'dormant');w.dispatchEvent(new w.Event('pagehide'));for(const [k,v] of Object.entries(saved))assert.equal(f.store.get(k),v,k);
 }finally{f.close()}
});
test('real story: completed stranger, fox and safe bridge precede natural wilderness activation',async()=>{
 const f=await boot({},false,{foxRandom:.1});try{const w=f.w;w.document.getElementById('startBtn').click();w.document.getElementById('skipIntroBtn').click();w.__test.skipEntrance();w.__test.ending();let cutscene=false,entered=false;
  for(let i=0;i<5000;i++){if(!w.__test.wilderness().origin)w.__test.clearOrdinary();w.__test.advance(1/60);let s=w.__test.snapshot();if(s.state==='cutscene'){cutscene=true;await new Promise(r=>setImmediate(r));w.__test.skipDialogue();continue;}
   if(s.wilderness.progress>=0&&s.wilderness.origin!==null){assert.equal(cutscene,true);assert.equal(s.fox.finished,true);assert.equal(s.bridge.phase,'exit');assert.ok(s.bridge.near>=1260);assert.equal(s.wilderness.stage,0);entered=true;break;}
  }
  assert.equal(entered,true);
 }finally{f.close()}
});
