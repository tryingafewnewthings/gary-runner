'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const Bridge=require('../gary-bridge-user.js');

class ImageStub {
 constructor(){this.naturalWidth=174;this.naturalHeight=620;}
 set src(value){this.currentSrc=value;this.onload?.();}
}
function fakeContext(){
 const calls=[];
 const methods={
  calls,
  rect(...args){calls.push({op:'rect',args});},
  clip(){calls.push({op:'clip'});},
  drawImage(...args){calls.push({op:'image',args});},
  moveTo(...args){calls.push({op:'move',args});},
  lineTo(...args){calls.push({op:'line',args});},
  createLinearGradient(){return {addColorStop(){}};}
 };
 return new Proxy(methods,{get(target,key){return key in target?target[key]:()=>{};}});
}
function readyBridge(){
 const bridge=Bridge.create({ImageType:ImageStub,makeCanvas:()=>({getContext:()=>fakeContext()})});
 assert.equal(bridge.ready(),true);
 return bridge;
}
function groundAt(bridge,near){
 const c=fakeContext(),tiles=[],road=[],pavements=[];
 const answer=bridge.drawStreetTail(c,near,{
  drawCobbles:(...args)=>tiles.push(args),
  drawRoad:()=>road.push(true),drawPavements:()=>pavements.push(true)
 });
 return {answer,c,tiles,road,pavements};
}
test('screen-aligned original stone and road preserve measured geometry',()=>{
 const bridge=readyBridge();
 for(const near of [20,420,499,500,560,639]){
  const a=groundAt(bridge,near);
  assert.equal(a.answer,true);
  assert.equal(a.tiles.length,2);
  assert.deepEqual(a.tiles.map(x=>[x[0],x[2],x[4]]),[[0,105,'base'],[255,105,'base']]);
  assert.equal(a.road.length,1);
  assert.equal(a.pavements.length,1);
  const roadClip=a.c.calls.filter(x=>x.op==='rect'&&x.args[0]===102&&x.args[2]===156).at(-1).args;
  assert.equal(roadClip[0],102);
  assert.equal(roadClip[2],156);
  assert.equal(roadClip[1],Math.max(0,Math.floor(near)));
 }
});
test('old street 500-unit handover cannot erase the tail',()=>{
 const bridge=readyBridge(),a=groundAt(bridge,499),b=groundAt(bridge,500);
 assert.equal(a.tiles[0][1],483);
 assert.equal(b.tiles[0][1],484);
 assert.equal(a.tiles[0][3],102+499-483);
 assert.equal(b.tiles[0][3],640-484);
 assert.equal(a.road.length,b.road.length);
 assert.ok(b.c.calls.filter(c=>c.op==='clip').length>=3);
});
test('bridge culls invisible tail and never modifies the collision/road baseline',()=>{
 const bridge=readyBridge();
 for(const near of [-150,-101,640,800]){
  const r=groundAt(bridge,near);
  assert.equal(r.answer,true);
  assert.equal(r.tiles.length,0);
  assert.equal(r.road.length,0);
 }
 assert.deepEqual(Bridge.SPEC.road,[105,255]);
 assert.deepEqual(Bridge.SPEC.deck,[138,222]);
 assert.equal(Bridge.SPEC.threshold,26);
});
test('riverbank overlays are explicitly clipped to the outer verges',()=>{
 const bridge=readyBridge(),ctx=fakeContext();
 bridge.drawWater(ctx,560,1);
 const clip=ctx.calls.findIndex(c=>c.op==='clip');
 assert.ok(clip>=0);
 const rects=ctx.calls.slice(0,clip).filter(c=>c.op==='rect').map(c=>c.args);
 assert.equal(rects.length,4);
 assert.deepEqual(rects.map(r=>[r[0],r[2]]),[[0,104],[0,104],[256,104],[256,104]]);
});
test('main runtime paints native street tail after water and before the bridge picture',()=>{
 const src=fs.readFileSync(path.join(__dirname,'..','gary-difficulty-runtime.js'),'utf8');
 const water=src.indexOf('userBridge.drawWater(ctx,n,view.clock)');
 const street=src.indexOf('userBridge.drawStreetTail(ctx,n,{drawCobbles,drawPavements,drawRoad})');
 const deck=src.indexOf('userBridge.drawDeck(ctx,n)');
 assert.ok(water>=0&&street>water&&deck>street);
 assert.match(src,/if\(wilderness\.active\(\)\|\|bridgeCoversWorld\)/,
  'bridge scene must clear its background even during frozen preview');
 assert.ok(!src.includes("ctx.fillStyle='#465348';ctx.fillRect(0,0,W,H);"));
});
