'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const art=require('../gary-bridge-painted.js');
const root=path.resolve(__dirname,'..');
test('single painted atlas is decoded and source regions stay inside the 246x93 image',async()=>{
 const file=path.join(root,'art/bridge/painted/bridge-atlas.webp');
 const bytes=fs.readFileSync(file);
 assert.ok(bytes.length<25000,'must be mobile-size asset');
 const im=await loadImage(bytes);
 assert.equal(im.width,246);assert.equal(im.height,93);
 for(const [key,[x,y,w,h]] of Object.entries(art.SPEC.src)){
   assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=im.width&&y+h<=im.height,key);
 }
 const ctx=createCanvas(im.width,im.height).getContext('2d');
 ctx.drawImage(im,0,0);
 const data=ctx.getImageData(0,0,im.width,im.height).data;
 assert.ok(data.some((v,i)=>i%4===3&&v===0),'true transparent padding must survive encoding');
 assert.ok(data.some((v,i)=>i%4===3&&v>240),'visible painted pixels required');
});
test('bridge overlays use four cached draw surfaces, no per-frame allocations',()=>{
 let allocated=0;
 class FakeImage{
   naturalWidth=246;naturalHeight=93;
   set src(v){this.loaded=v;this.onload?.();}
 }
 const fakeContext={save(){},restore(){},beginPath(){},rect(){},clip(){},drawImage(){},fillRect(){},createLinearGradient(){return {addColorStop(){}}}};
 const makeCanvas=()=>{allocated++;return {width:1,height:1,getContext:()=>fakeContext};};
 const inst=art.create({makeCanvas,ImageType:FakeImage});
 assert.equal(inst.ready(),true);
 assert.equal(allocated,4);
 const g=fakeContext;
 for(let i=0;i<300;i++){
   assert.equal(inst.drawUnder(g,800),true);
   assert.equal(inst.drawLower(g,800),true);
   assert.equal(inst.drawDeck(g,800),true);
   assert.equal(inst.drawFront(g,800),true);
 }
 assert.equal(allocated,3);
});
test('failed image never blocks startup; old bridge stays available',()=>{
 class Absent{
   naturalWidth=0;naturalHeight=0;
   set src(v){this.onerror?.();}
 }
 const inst=art.create({makeCanvas:()=>createCanvas(1,1),ImageType:Absent});
 const g=createCanvas(360,640).getContext('2d');
 assert.equal(inst.ready(),false);
 assert.equal(inst.reason(),'asset unavailable');
 assert.equal(inst.drawDeck(g,800),false);
 assert.equal(inst.drawFront(g,800),false);
});
test('runtime preserves fixed bridge lane and draw ordering without touching story',()=>{
 const runtime=fs.readFileSync(path.join(root,'gary-difficulty-runtime.js'),'utf8');
 const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(index.indexOf('gary-bridge-painted.js')<index.indexOf('gary-difficulty-runtime.js'));
 assert.match(runtime,/const paintedBridge=bridgePaintedEnabled/);
 assert.match(runtime,/bridgePaint\.drawDeck\(ctx,n\);paintedBridge\?\.drawDeck\(ctx,n\)/);
 assert.match(runtime,/bridgePaint\.drawForeground\(ctx,n\);paintedBridge\?\.drawFront\(ctx,n\)/);
 assert.match(runtime,/bridgePaintedEnabled=!bridgePreviewSession\|\|/);
 assert.deepEqual(art.SPEC.lane,[138,222]);
});
