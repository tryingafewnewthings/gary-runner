'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const F=require('../gary-seam-factory.js'),R=require('../gary-seam-registry.json');
test('continuous corridor centers the actual world boundary',()=>{
 const c=F.corridor(320);assert.deepEqual(c,{top:{x:0,y:192,width:360,height:96},bottom:{x:0,y:352,width:360,height:96},mask:{x:0,y:96,width:360,height:64},width:360,height:256});
 assert.equal(F.corridor(300).top.y,172);assert.throws(()=>F.corridor(20));assert.throws(()=>F.corridor(320,{top:0}));
});
test('rejected, unregistered, missing bridge and successor pixels cannot be promoted',()=>{
 const reg={bridgeReady:true},snap={distance:20500,wilderness:{origin:20950}};
 assert.equal(F.eligibility(R.transitions[0],reg,snap),null);
 for(const t of R.transitions.slice(1))assert.ok(F.eligibility(t,reg,snap));
 assert.ok(F.eligibility(R.transitions[0],{bridgeReady:false},snap));
 assert.ok(F.eligibility(R.transitions[0],reg,{distance:21000,wilderness:{origin:20950}}));
 assert.ok(F.eligibility({...R.transitions[0],references:['art/wilderness/no.png']},reg,snap));
});
test('candidate is untrimmed 1:1 overlay with no reference pixels',()=>{
 const m={exportDimensions:{width:360,height:256},transparentMask:{x:0,y:96,width:360,height:64}};
 const pixels=new Uint8Array(360*256*4);pixels[(100*360+180)*4+3]=255;
 assert.equal(F.validateCandidate(pixels,360,256,m),true);assert.throws(()=>F.validateCandidate(pixels,180,128,m));
 pixels[3]=255;assert.throws(()=>F.validateCandidate(pixels,360,256,m),/outside/);
});
