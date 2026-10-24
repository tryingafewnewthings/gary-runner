'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Bridge=require('../gary-bridge-user.js');

const bankDrawCalls=[];
class ImageStub {
 constructor(){this.naturalWidth=174;this.naturalHeight=620;}
 set src(s){this.source=s;this.onload?.();}
}
function makeContext(){
 const entries=[],ctx={
  entries,
  createLinearGradient(){return {addColorStop(){}};},
  drawImage(...args){entries.push({kind:'image',args});},
  rect(...args){entries.push({kind:'rect',args});},
  clip(){entries.push({kind:'clip'});}
 };
 return new Proxy(ctx,{get(target,key){return key in target?target[key]:()=>{};}});
}
test('bridge waterbank textures never paint opaque 360px strips over the road',()=>{
 const contexts=[];
 const bridge=Bridge.create({ImageType:ImageStub,makeCanvas:()=>({getContext(){const ctx=makeContext();contexts.push(ctx);return ctx;}})});
 assert.equal(bridge.ready(),true);
 const ctx=makeContext();
 bridge.drawWater(ctx,800,0);
 const firstBankImage=ctx.entries.findIndex(x=>x.kind==='image'&&x.args[0]!==undefined);
 assert.ok(firstBankImage>=0);
 const preceding=ctx.entries.slice(0,firstBankImage);
 const bankClips=preceding.filter(x=>x.kind==='rect');
 assert.deepEqual(bankClips.map(x=>x.args.slice(0,1)),[[0],[256],[0],[256]]);
 assert.ok(preceding.some(x=>x.kind==='clip'));
});
test('existing bridge dimensions and slim thresholds remain stable',()=>{
 const s=Bridge.SPEC;
 assert.equal(s.sourceWidth,174);assert.equal(s.sourceHeight,620);
 assert.deepEqual(s.deck,[138,222]);assert.equal(s.threshold,26);
 assert.equal(s.wingLength,52);
});
