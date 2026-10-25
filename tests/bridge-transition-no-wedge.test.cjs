'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Bridge=require('../gary-bridge-user.js');

class ImageStub {
 constructor(){this.naturalWidth=174;this.naturalHeight=620;this.onload=null;}
 set src(value){this.currentSrc=value;this.onload?.();}
}
function context(){
 const calls=[];
 const api={
  calls,
  drawImage(...args){calls.push(args);},
  createLinearGradient(){return {addColorStop(){}};},
 };
 return new Proxy(api,{get(target,key){
  if(key in target)return target[key];
  return ()=>{};
 }});
}
function bridgeInstance(){
 const b=Bridge.create({ImageType:ImageStub,makeCanvas:()=>({getContext:()=>context()})});
 assert.equal(b.ready(),true);
 return b;
}
test('source bridge remains 174×620 and straight deck is 84 units',()=>{
 const b=bridgeInstance();
 assert.deepEqual(b.SPEC.deck,[138,222]);
 assert.equal(b.SPEC.sourceWidth,174);
 assert.equal(b.SPEC.sourceHeight,620);
 assert.equal(b.SPEC.threshold,26);
 assert.equal(b.SPEC.wingLength,52);
 assert.equal(b.SPEC.approach,undefined);
});
test('no 150-unit repeating cobbles; exit keeps a SHORT stone sill but entrance uses original deck',()=>{
 const b=bridgeInstance(),ctx=context();
 assert.equal(b.drawDeck(ctx,800),true);
 const calls=ctx.calls;
 const original=calls.filter(a=>a.length===5&&a[1]===93&&a[2]===180&&a[3]===174&&a[4]===620);
 assert.equal(original.length,1,'original bridge image is drawn once, unmodified');
 const scaled=calls.filter(a=>a.length===9);
 const sills=scaled.filter(a=>a[5]===138&&a[7]===84&&a[8]===26);
 assert.deepEqual(sills.map(a=>a[6]).sort((a,b)=>a-b),[154]);
 assert.ok(!scaled.some(a=>a[5]===138&&a[6]===800&&a[7]===84),'no nonmatching entrance strip');
 assert.ok(!scaled.some(a=>a[7]>=100&&a[8]>=100),'no wide stretched cobblestone carpet');
});
test('no art or physics changes occur on unready image',()=>{
 class MissingImage extends ImageStub {set src(value){this.onerror?.();}}
 const b=Bridge.create({ImageType:MissingImage,makeCanvas:()=>({getContext:()=>context()})});
 assert.equal(b.ready(),false);
 const ctx=context();
 assert.equal(b.drawDeck(ctx,800),false);
 assert.equal(ctx.calls.length,0);
});
