'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createCanvas}=require('@napi-rs/canvas');
const {SPEC,create}=require('../gary-bridge-user.js');
test('owner bridge uses fixed 84-unit deck and bounded side-water',()=>{
 assert.deepEqual(SPEC.deck,[138,222]);assert.deepEqual(SPEC.waterLeft,[0,101]);assert.deepEqual(SPEC.waterRight,[259,360]);
 assert.equal(SPEC.sourceWidth,174);assert.equal(SPEC.sourceHeight,620);
});
test('bridge renders cached moving water and never allocates per frame',()=>{
 let allocations=0;
 class FakeImage{naturalWidth=174;naturalHeight=620;set src(v){this.onload?.();}}
 const bridge=create({makeCanvas:()=>{allocations++;return createCanvas(1,1)},ImageType:FakeImage});
 assert.equal(bridge.ready(),true);assert.equal(allocations,2);
 const ctx=createCanvas(360,640).getContext('2d');
 for(let i=0;i<100;i++){bridge.drawWater(ctx,850,i/60);}
 assert.equal(allocations,2);
});
test('artwork exists and has correct native alpha and dimensions',async()=>{
 const {loadImage}=require('@napi-rs/canvas');
 const im=await loadImage(fs.readFileSync(path.join(__dirname,'../art/candidates/bridge/bridge-user-supplied.webp')));
 assert.equal(im.width,174);assert.equal(im.height,620);
 const ctx=createCanvas(174,620).getContext('2d');ctx.drawImage(im,0,0);
 assert.equal(ctx.getImageData(0,100,1,1).data[3],0);
 assert.ok(ctx.getImageData(87,300,1,1).data[3]>230);
});

test('river crosses the full canvas, meets textured banks and has no rectangular cutoff',()=>{
 class FakeImage{naturalWidth=174;naturalHeight=620;set src(v){this.onload?.();}}
 const bridge=create({makeCanvas:()=>createCanvas(1,1),ImageType:FakeImage});
 const c=createCanvas(360,640),ctx=c.getContext('2d');
 // Bridge image spans y=-80..540, so the lower shoreline must cross near y=540.
 assert.equal(bridge.drawWater(ctx,540,1),true);
 const pixel=(x,y)=>Array.from(ctx.getImageData(x,y,1,1).data);
 assert.ok(pixel(25,300)[3]>200,'water on left');
 assert.ok(pixel(330,300)[3]>200,'water on right');
 assert.ok(pixel(25,560)[3]>200,'natural bank after river');
 assert.ok(pixel(330,560)[3]>200,'natural bank after river');
 assert.equal(pixel(25,638)[3],0,'bank ends and underlying world resumes');
});
test('bridge approach and river span retain fixed world registration',()=>{
 assert.equal(SPEC.end-SPEC.far,SPEC.sourceHeight);
 assert.equal(SPEC.approach,150);
 assert.deepEqual(SPEC.road,[105,255]);
});
