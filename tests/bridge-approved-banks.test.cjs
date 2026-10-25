'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const bridge=require('../gary-bridge-user.js');
const calls=[];
const ctx=()=>new Proxy({drawImage(...args){calls.push(args)},createLinearGradient(){return {addColorStop(){}}}}, {get(o,k){return k in o?o[k]:()=>{}}});
class Img {
 constructor(){this.naturalWidth=0;this.naturalHeight=0;this.loaded=false;}
 set src(path){
  this.path=path;
  const bank=/riverbank_approved/.test(path);
  this.naturalWidth=bank?110:/entrance-seam/.test(path)?176:174;
  this.naturalHeight=bank?245:/entrance-seam/.test(path)?88:620;
  this.onload?.();
 }
}
test('native geometry and world-locked 2-bank render, independent of player physics',()=>{
 const b=bridge.create({ImageType:Img,makeCanvas:()=>({getContext:ctx})});
 assert.equal(b.ready(),true);
 assert.equal(b.drawBanks(ctx(),800),true);
 const banks=calls.filter(a=>a.length===5&&a[3]===110&&a[4]===245);
 assert.deepEqual(banks.map(a=>a.slice(1)),[[0,569,110,245],[250,569,110,245]]);
 assert.deepEqual(b.SPEC.deck,[138,222]);
 assert.deepEqual(b.SPEC.road,[105,255]);
});
test('riverbank sprites are optional and cannot block bridge drawing',()=>{
 class MissingBank extends Img {set src(path){if(/riverbank_approved/.test(path)){this.onerror?.();return}super.src=path}}
 const b=bridge.create({ImageType:MissingBank,makeCanvas:()=>({getContext:ctx})});
 assert.equal(b.ready(),true);
 assert.equal(b.drawBanks(ctx(),800),false);
 assert.equal(b.drawDeck(ctx(),800),true);
});
