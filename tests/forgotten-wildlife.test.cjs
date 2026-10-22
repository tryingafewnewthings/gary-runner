'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const api=require('../gary-forgotten-wildlife.js');
const hedgehog={ready:true,naturalWidth:432,naturalHeight:54};
const bush={ready:true,naturalWidth:512,naturalHeight:512};
function scene(distance=5600,foot=-1000,opts={}){
 const calls=[],ctx={save(){},restore(){},translate(){},scale(){},drawImage(...args){calls.push(args);}};
 api.create({hedgehog,bush}).draw(ctx,distance,8,10,foot,opts);
 return calls;
}
test('sprite source is six equal 72 by 54 cells, exact view is stationary fixed-camera',()=>{
 assert.equal(api.SPEC.cols,6);assert.equal(api.SPEC.cellWidth,72);assert.equal(api.SPEC.cellHeight,54);
 const a=scene(6500,-200),b=scene(6500,-200);
 assert.deepEqual(a,b);
});
test('no wildlife in daylight or before reader-zone clearing',()=>{
 assert.deepEqual(scene(0,-Infinity),[]);
 assert.deepEqual(scene(2000,-1000),[]);
 assert.deepEqual(scene(6500,-1000,{bridgeVisible:true}),[]);
 assert.deepEqual(scene(6500,-1000,{wildernessActive:true}),[]);
});
test('wildlife is present during early decay clearing, before the reader is scheduled',()=>{
 const visible=scene(4000,-Infinity);
 assert.ok(visible.some(c=>c.length===9),'hedgehog should appear well before bench scheduling');
 const withoutBenchSegment=scene(4000,-Infinity,{benchSegment:14});
 assert.ok(withoutBenchSegment.filter(c=>c.length===9).length<visible.filter(c=>c.length===9).length,
   'the bench segment itself must remain free of hedgehogs');
});
test('hide all ambient decorations while reader in shot, including cutscene margins',()=>{
 for(const foot of [-30,0,320,640,770])assert.deepEqual(scene(6500,foot),[]);
 assert.deepEqual(scene(6500,-1000,{readerVisible:true}),[]);
});
test('preserve fox event as focal point and do not draw ambient fauna during its encounter',()=>{
 assert.deepEqual(scene(6500,-1000,{foxActive:true}),[]);
});
test('hedgehogs never occupy traffic lanes and animated sprites slice legal frames',()=>{
 let animals=0,bushes=0;
 for(let distance=4750;distance<9500;distance+=150){
  for(const call of scene(distance,-1000)){
   if(call.length===9){
    animals++;const [,sx,sy,sw,sh,x,y,w,h]=call;
    assert.equal(sy,0);assert.equal(sw,72);assert.equal(sh,54);
    assert.equal(sx%72,0);assert.ok(sx>=0&&sx<432);
    assert.equal(w,40);assert.equal(h,28);
    assert.ok(x+w<=105||x>=255,'no hedge may overlap the road');
   }else if(call.length===5){
    bushes++;const [,x,y,w,h]=call;assert.equal(w,76);assert.equal(h,76);
    assert.ok(x+w<=105||x>=255,'no bush may overlap road');
   }else assert.fail('unexpected renderer call');
  }
 }
 assert.ok(animals>2);assert.ok(bushes>0);
});
test('standalone ambient bush source bytes match original fox hiding bush exactly',()=>{
 const a=fs.readFileSync(path.join(__dirname,'../art/fox/fox-bush.png'));
 const b=fs.readFileSync(path.join(__dirname,'../art/forgotten-road/fox-bush-verge.png'));
 assert.deepEqual(a,b);
});
test('hedgehog PNG header matches six-by-one cell contract',()=>{
 const file=fs.readFileSync(path.join(__dirname,'../art/forgotten-road/hedgehog-scurrying.png'));
 assert.equal(file.subarray(1,4).toString(),'PNG'); 
 assert.equal(file.readUInt32BE(16),432);assert.equal(file.readUInt32BE(20),54);
});
test('does not alter fox controller, score or item pools',()=>{
 const script=fs.readFileSync(path.join(__dirname,'../gary-forgotten-wildlife.js'),'utf8');
 assert.doesNotMatch(script,/itemPool|spawnFood|onTheft|localStorage|score\s*=/);
});
