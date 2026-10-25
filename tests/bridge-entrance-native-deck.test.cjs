'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Bridge=require('../gary-bridge-user.js');
function context(){
 const calls=[];
 return new Proxy({calls,drawImage(...args){calls.push(args)},createLinearGradient(){return {addColorStop(){}}}},{
  get(o,k){return k in o?o[k]:()=>{}}
 });
}
class ImageStub {
 constructor(){this.naturalWidth=0;this.naturalHeight=0;}
 set src(v){
  if(v.includes('entrance-seam')){this.naturalWidth=176;this.naturalHeight=88;}
  else{this.naturalWidth=174;this.naturalHeight=620;}
  this.onload?.();
 }
}
test('approved entrance is drawn as side masonry only; no 84-unit centre lip',()=>{
 const bridge=Bridge.create({ImageType:ImageStub,makeCanvas:()=>({getContext:context})});
 assert.equal(bridge.ready(),true);
 assert.equal(bridge.entranceReady(),true);
 const c=context();bridge.drawDeck(c,800);
 const a=c.calls.filter(x=>x.length===9&&x[1]===0&&x[3]===46&&x[4]===88);
 const b=c.calls.filter(x=>x.length===9&&x[1]===130&&x[3]===46&&x[4]===88);
 assert.equal(a.length,1);assert.equal(b.length,1);
 assert.deepEqual(a[0].slice(5),[92,787,46,88]);
 assert.deepEqual(b[0].slice(5),[222,787,46,88]);
 assert.ok(!c.calls.some(x=>x.length===5&&x[1]===92&&x[3]===176&&x[4]===88),'full overlay would restore mismatched lip');
 assert.ok(!c.calls.some(x=>x.length===9&&x[5]===138&&x[6]===800&&x[7]===84),'no separate entrance sill');
 assert.ok(c.calls.some(x=>x.length===5&&x[1]===93&&x[2]===180&&x[3]===174&&x[4]===620),'original bridge drawn at exact geometry');
});
