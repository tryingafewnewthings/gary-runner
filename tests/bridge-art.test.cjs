'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas'),art=require('../gary-bridge-art.js'),pack=require('../gary-bridge-art-contract.json'),camera=require('../gary-camera-contract.json'),boot=require('./helpers/headless.cjs');
const makeCanvas=()=>createCanvas(1,1),env={drawWater(){}};
test('art registration preserves the measured camera footprint and explicit unapproved projection',()=>{
 assert.equal(art.validatePack(pack),true);assert.equal(pack.candidate.heightProjection,-camera.profiles['raised-architecture'].heightAxis[1]);
 for(const near of [560,850,1210]){const f=art.layout(pack,near);assert.deepEqual(f.deck,{x:138,y:near-620,w:84,h:620});assert.equal(f.depth,64);assert.deepEqual(f.anchor,{x:180,y:near});}
 for(const key of Object.keys(art.REGISTRATION)){const bad=structuredClone(pack);bad.registration[key]++;assert.throws(()=>art.validatePack(bad),/registration/);}
 const shifted=structuredClone(pack);shifted.layers.deck.anchor[1]--;assert.throws(()=>art.validatePack(shifted),/registration/);
 const wrongSource=structuredClone(pack);wrongSource.layers.lower.sourceWidth--;assert.throws(()=>art.validatePack(wrongSource),/registration/);
 const approved=structuredClone(pack);approved.approved=true;assert.throws(()=>art.validatePack(approved),/unapproved/);
});
test('registered transparent templates have stable alpha, empty backgrounds and unchanged export bytes',async()=>{
 const r=art.create({makeCanvas,pack,environment:env});
 const report=require('../art/bridge/templates/registration-report.json');
 for(const key of [...art.KEYS,'water-occlusion-mask']){
  const file=path.join(__dirname,'..',key==='water-occlusion-mask'?'art/bridge/templates/water-occlusion-mask.png':pack.layers[key].path);
  const bytes=fs.readFileSync(file);assert.deepEqual(bytes,(key==='water-occlusion-mask'?r.waterMask:r.templates[key]).toBuffer('image/png'));
  assert.equal(require('node:crypto').createHash('sha256').update(bytes).digest('hex'),report.files[key].sha256);
  const im=await loadImage(file),c=createCanvas(720,2000),g=c.getContext('2d');g.drawImage(im,0,0);
  const px=g.getImageData(0,0,720,2000).data;let clear=0,solid=0;
  for(let i=3;i<px.length;i+=4){if(px[i]===0)clear++;if(px[i]>0)solid++;}
  assert.ok(clear>720*2000*.6);assert.ok(solid>1000);
  for(const [x,y] of [[0,0],[719,1999],[30,900],[690,900]])assert.equal(px[(y*720+x)*4+3],0,'no environment baked into structural layer');
  if(key!=='deck')assert.equal(px[(900*720+360)*4+3],0,'actor corridor remains empty');
 }
});
test('professional layers replace independently, reject bad registration, and are clipped to masks once',()=>{
 let alloc=0;const solid=createCanvas(720,2000),s=solid.getContext('2d');s.fillStyle='#ff00ff';s.fillRect(0,0,720,2000);
 const r=art.create({makeCanvas:()=>{alloc++;return makeCanvas()},pack,images:{lower:solid},environment:env});
 const c=createCanvas(360,1000),g=c.getContext('2d');r.drawLower(g,800);
 assert.equal(g.getImageData(0,450,1,1).data[3],0);assert.equal(g.getImageData(110,400,1,1).data[0],255);
 const original=art.create({makeCanvas,pack,environment:env});assert.deepEqual(r.templates.deck.toBuffer('image/png'),original.templates.deck.toBuffer('image/png'));
 for(let i=0;i<100;i++){r.drawLower(g,850);r.drawWaterOcclusion(g,850,i/60);r.drawDeck(g,850);r.drawForeground(g,850)}
 assert.equal(alloc,5);assert.throws(()=>art.create({makeCanvas,pack,images:{lower:createCanvas(2,2)},environment:env}),/wrong-size/);
 assert.throws(()=>art.create({makeCanvas,pack,images:{water:solid},environment:env}),/Unknown/);
});
test('water occludes the submerged pier feet and stays outside the playable deck',()=>{
 const r=art.create({makeCanvas,pack,environment:env}),c=createCanvas(360,1000),g=c.getContext('2d');
 r.drawLower(g,800);const p=r.contacts[0],before=g.getImageData(p.x+10,p.y+2,1,1).data.slice();
 r.drawWaterOcclusion(g,800,0);const after=g.getImageData(p.x+10,p.y+2,1,1).data;
 assert.notDeepEqual(after,before);assert.ok(after[2]/after[0]>before[2]/before[0],'water colour replaces the warm brick base');
 assert.equal(g.getImageData(180,450,1,1).data[3],0);assert.deepEqual(art.ORDER,['terrain-stream-banks','lower','water-occlusion','deck','actors-items','foreground']);
 const runtime=fs.readFileSync(path.join(__dirname,'../gary-difficulty-runtime.js'),'utf8');
 const pos=['bridgePaint.drawWater(ctx','bridgePaint.drawLower(ctx','bridgePaint.drawWaterOcclusion?.(ctx','bridgePaint.drawDeck(ctx','drawPlayer();','bridgePaint.drawForeground(ctx'].map(s=>runtime.indexOf(s,runtime.indexOf('function render(')));
 assert.ok(pos.every((n,i)=>n>=0&&(i===0||n>pos[i-1])));
});
test('real engine artwork preview is opt-in, atomic, and cannot change story, lanes or saves',async()=>{
 const f=await boot({},false,{urlSearch:'debug=1&bridgepreview=1&seed=12345'});try{
  const w=f.w;w.GaryBridgePreview.start('middle');const before=w.__test.snapshot();assert.equal(w.GaryBridgePreview.artworkMode(),'legacy');
  const p=w.JSON.parse(JSON.stringify(pack));w.GaryBridgePreview.artwork(p);assert.equal(w.GaryBridgePreview.artworkMode(),'UNAPPROVED_BLOCKOUT');
  assert.deepEqual(w.__test.snapshot(),before);w.__test.move(-1);assert.equal(w.__test.snapshot().target,1);
  assert.throws(()=>w.GaryBridgePreview.artwork(p,{deck:makeCanvas()}),/wrong-size/);assert.equal(w.GaryBridgePreview.artworkMode(),'UNAPPROVED_BLOCKOUT');
  w.GaryBridgePreview.artwork(null);assert.equal(w.GaryBridgePreview.artworkMode(),'legacy');
  w.GaryBridgePreview.artwork(p);w.__test.suspend();const paused=w.__test.snapshot();for(let i=0;i<90;i++)w.__test.advance(1/60);assert.deepEqual(w.__test.snapshot(),paused);
  w.__test.resume();for(let i=0;i<300;i++)w.__test.advance(1/60);assert.equal(w.__test.bridge().phase,'done');assert.equal(w.__test.bridge().collapse,false);
  w.__test.reset();assert.equal(w.__test.bridge().phase,'dormant');assert.equal(f.store.size,0);
 }finally{f.close()}
 const normal=await boot();try{assert.throws(()=>normal.w.GaryBridgePreview.artwork(pack),/isolated/)}finally{normal.close()}
});

test('arcade has transparent openings, solid soffit thickness and continuous connected spandrels',()=>{
 const r=art.create({makeCanvas,pack,environment:env}),g=r.templates.lower.getContext('2d');
 const alpha=(side,u,z)=>{const [x,y]=art.sidePoint(pack,side,u,z);return g.getImageData(Math.round(x*2),Math.round(y*2),1,1).data[3];};
 for(const side of [-1,1]){
  for(const [a,b] of [[236,384],[416,564],[596,744]]){
   const middle=(a+b)/2;
   assert.equal(alpha(side,middle,40),0,'water is genuinely visible through the opening');
   assert.ok(alpha(side,middle,20)>240,'separate soffit band has visible thickness');
  }
  for(let u=190;u<790;u+=4)assert.ok(alpha(side,u,3)>240,'spandrel joins every span without a detached stub');
  for(const u of [208,400,580,772])assert.ok(alpha(side,u,40)>240,'solid pier joins the span to its foundation');
 }
});
test('submerged support and water mask stay registered through scrolling without filling arch voids',()=>{
 const r=art.create({makeCanvas,pack,environment:env});
 for(const near of [560,650,740,850,960,1100,1210]){
  const c=createCanvas(360,1000),g=c.getContext('2d');r.drawLower(g,near);
  for(const p of r.contacts){const x=Math.round(p.sample.x),y=Math.round(p.sample.y+near-800);if(y<0||y>999)continue;
   assert.ok(g.getImageData(x,y,1,1).data[3]>200,'solid submerged base before water pass');
  }
  r.drawWaterOcclusion(g,near,1);
  for(const p of r.contacts){const x=Math.round(p.sample.x),y=Math.round(p.sample.y+near-800);if(y<0||y>999)continue;
   const px=g.getImageData(x,y,1,1).data;assert.ok(px[2]>px[0],'water overlaps the same world-registered base at every scroll position');
  }
  const [x,y]=art.sidePoint(pack,-1,490,40),screenY=y+near-800;
  if(screenY>=0&&screenY<1000)assert.equal(g.getImageData(Math.round(x),Math.round(screenY),1,1).data[3],0,'opening never receives a rectangular water/brick wipe');
 }
});

test('provisional projection slider extremes keep water outside the actor corridor',()=>{
 for(const heightProjection of [.1,1.6])for(const supportHeight of [32,96]){
  const candidate=structuredClone(pack);Object.assign(candidate.candidate,{heightProjection,supportHeight});
  const r=art.create({makeCanvas,pack:candidate,environment:env}),data=r.waterMask.getContext('2d').getImageData(276,0,168,2000).data;
  for(let i=3;i<data.length;i+=4)assert.equal(data[i],0,'water cannot cross the fixed deck even at the slider limits');
  for(const side of [-1,1])for(const [u,v] of candidate.candidate.archSpans){const points=art.archPoints(candidate,side,u,v,8);assert.ok(points.every(p=>p.every(Number.isFinite)));}
 }
});

test('supplied review PNGs are byte-identical to delivery, contained without clipping, and keep true arch voids',async()=>{
 const review=require('../gary-bridge-art-review.json'),supplied=require('../art/bridge/production/supplied-qc.json');
 const images={};for(const key of art.KEYS){
  const bytes=fs.readFileSync(path.join(__dirname,'..',review.layers[key].path));
  assert.equal(require('node:crypto').createHash('sha256').update(bytes).digest('hex'),supplied.assets[key].sha256);
  images[key]=await loadImage(bytes);
 }
 const r=art.create({makeCanvas,pack:review,images,environment:env,cacheScale:1});
 assert.equal(r.mode,'UNAPPROVED_ART_REVIEW');assert.equal(r.cacheBytes,7200000);
 for(const key of art.KEYS){
  const c=createCanvas(360,1000),g=c.getContext('2d');g.drawImage(images[key],0,0,360,1000);
  assert.deepEqual(r.templates[key].getContext('2d').getImageData(0,key==='deck'?36:0,360,key==='deck'?928:1000).data,g.getImageData(0,key==='deck'?36:0,360,key==='deck'?928:1000).data,'cached painting is identical to a single registered draw: '+key);
 }
 for(const x of [80,280])for(const y of [310,490,670]){
  assert.equal(r.templates.lower.getContext('2d').getImageData(x,y,1,1).data[3],0);
  assert.equal(r.waterMask.getContext('2d').getImageData(x,y,1,1).data[3],0,'water mask never fills arch interiors');
 }
 for(const [x,y] of [[120,280],[120,380],[120,460],[120,560],[240,280],[240,560]])assert.ok(r.templates.lower.getContext('2d').getImageData(x,y,1,1).data[3]>240,'connected inner spandrel/piers');
});

test('calibrated foundations are submerged at every crossing position, never across the playable corridor',async()=>{
 const review=require('../gary-bridge-art-review.json'),images={};for(const key of art.KEYS)images[key]=await loadImage(path.join(__dirname,'..',review.layers[key].path));
 let allocations=0;const r=art.create({makeCanvas:()=>{allocations++;return makeCanvas()},pack:review,images,environment:env,cacheScale:1});
 const water=r.waterMask.getContext('2d').getImageData(138,0,84,1000).data;for(let i=3;i<water.length;i+=4)assert.equal(water[i],0);
 const c=createCanvas(360,1000),g=c.getContext('2d');
 for(const near of [210,350,560,700,850,1000,1210,1260,1450]){
  g.clearRect(0,0,360,1000);r.drawLower(g,near);
  for(const {sample:p} of r.contacts){const y=Math.round(p.y+near-800);if(y<0||y>999)continue;
   const before=[...g.getImageData(p.x,y,1,1).data];assert.ok(before[0]>before[2],'painted pier before water');
  }
  r.drawWaterOcclusion(g,near,1);
  for(const {sample:p} of r.contacts){const y=Math.round(p.y+near-800);if(y<0||y>999)continue;const after=g.getImageData(p.x,y,1,1).data;assert.ok(after[2]>after[0],'water replaces submerged foundation');}
 }
 assert.equal(allocations,5);
});

test('supplied review geometry and separate masks reproduce their committed exports',()=>{
 const review=require('../gary-bridge-art-review.json'),report=require('../art/bridge/review-masks/registration-report.json');
 const r=art.create({makeCanvas,pack:review,environment:env});
 for(const [key,c] of [...Object.entries(r.templates),['water-occlusion-mask',r.waterMask]]){
  const bytes=fs.readFileSync(path.join(__dirname,'..',report.files[key+'Mask'].path));assert.deepEqual(bytes,c.toBuffer('image/png'));
 }
 const invalid=structuredClone(review);invalid.candidate.silhouettes.lower[0][2]=-1;assert.throws(()=>art.validatePack(invalid),/silhouette/);
 const approved=structuredClone(review);approved.approved=true;assert.throws(()=>art.validatePack(approved),/unapproved/);
});

test('actual engine accepts supplied draft atomically, preserves pause/saves, food and safe completion',async()=>{
 const f=await boot({'garyBest':'123'},false,{urlSearch:'debug=1&bridgepreview=1&seed=12345'});try{
  const {w}=f,review=w.JSON.parse(fs.readFileSync(path.join(__dirname,'../gary-bridge-art-review.json'),'utf8'));
  const images=await w.GaryBridgeArt.loadImages(review,w.Image);w.GaryBridgePreview.start('middle');
  const before=w.__test.snapshot();assert.equal(w.GaryBridgePreview.artwork(review,images),'UNAPPROVED_ART_REVIEW');assert.deepEqual(w.__test.snapshot(),before);
  w.__test.add('roast',1);w.__test.advance(1/60);assert.ok(w.__test.snapshot().score>0);
  w.__test.suspend();const paused=w.__test.snapshot();for(let i=0;i<60;i++)w.__test.advance(1/60);assert.deepEqual(w.__test.snapshot(),paused);
  w.__test.resume();for(let i=0;i<300;i++)w.__test.advance(1/60);
  assert.equal(w.__test.bridge().phase,'done');assert.equal(w.__test.bridge().collapse,false);assert.equal(f.store.get('garyBest'),'123');
  w.__test.reset();assert.equal(w.__test.bridge().phase,'dormant');
 }finally{f.close()}
});

test('normal-play painted bridge loads the exact registered artwork without changing its lane geometry',async()=>{
 const f=await boot({},false,{urlSearch:'seed=12345'});
 try{
  let status=f.w.__test.bridgeArtwork();
  for(let i=0;i<160&&status.status==='procedural';i++){
   await new Promise(resolve=>setTimeout(resolve,20));
   status=f.w.__test.bridgeArtwork();
  }
  assert.equal(status.status,'painted-review');
  assert.equal(status.mode,'UNAPPROVED_ART_REVIEW');
  f.w.document.getElementById('startBtn').click();f.w.document.getElementById('skipIntroBtn').click();f.w.__test.skipEntrance();
  assert.equal(f.w.__test.bridge().phase,'dormant');
  f.w.__test.reset();
  assert.equal(f.w.__test.bridgeArtwork().mode,'UNAPPROVED_ART_REVIEW');
  assert.equal(f.w.__test.snapshot().lane,1);
 }finally{f.close();}
});
