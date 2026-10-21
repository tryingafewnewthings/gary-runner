'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const model=require('../gary-camera-model.js');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const contract=JSON.parse(read('gary-camera-contract.json'));
const data=read('gary-difficulty-data.js');
const bridge=read('gary-bridge.js');
const runtime=read('gary-difficulty-runtime.js');
const actual=(src,key)=>{
 const m=src.match(new RegExp('\\b'+key+'\\s*:\\s*([0-9.]+)\\b'));
 assert.ok(m,'Missing '+key+' in live source');return Number(m[1]);
};
test('camera reference is internally consistent and does not claim artistic approval',()=>{
 const verdict=model.validate(contract);assert.deepEqual(verdict,{ok:true,errors:[]});
 assert.equal(contract.profiles['ground-plane'].status,'CODE_LOCKED');
 assert.equal(contract.profiles['raised-architecture'].status,'PROVISIONAL_NEEDS_VISUAL_APPROVAL');
 assert.equal(contract.approvals.lockedProfile,null);
 assert.equal(contract.approvals.geometry,'UNVERIFIED_VISUAL');
 const broken=structuredClone(contract);broken.bridge.deck.width=100;
 assert.equal(model.validate(broken).ok,false);
});
test('the camera contract tracks the ACTUAL loaded difficulty WORLD rather than stale legacy files',()=>{
 for(const key of ['width','height','roadWidth','pavementWidth','playerY','playerHeight','playerFootOffset','cobbleCell'])
   assert.equal(actual(data,key),contract.world[key],key);
 const roadLeft=(contract.world.width-contract.world.roadWidth)/2;
 assert.equal(contract.world.roadLeft,roadLeft);
 assert.equal(contract.world.roadRight,roadLeft+contract.world.roadWidth);
 for(let i=0;i<3;i++)assert.equal(contract.world.laneCentres[i],roadLeft+contract.world.roadWidth*(i+.5)/3);
});
test('bridge measured dimensions, lower support, deck and parapets still match the PR implementation',()=>{
 const b=contract.bridge;
 assert.match(bridge,/const W=360,H=1000,far=180,end=800;/);
 assert.match(bridge,/d\.fillRect\(138,far,84,end-far\)/);
 assert.match(bridge,/masonry\(101,32\);masonry\(227,32\)/);
 assert.match(bridge,/parapet\(117\);parapet\(223\)/);
 assert.equal(b.deck.left,138);assert.equal(b.deck.right,222);
 assert.equal(b.masonry[0].left,101);assert.equal(b.masonry[1].left,227);
 assert.equal(b.parapets[0].left,117);assert.equal(b.parapets[1].left,223);
 assert.match(runtime,/approach:210,enter:560,middle:850,exit:1210/);
});
test('screen-parallel projection NEVER skews or perspective-shrinks the road',()=>{
 assert.deepEqual(model.screenPoint(130,540,0),{x:130,y:540});
 assert.deepEqual(model.screenPoint(230,540,0),{x:230,y:540});
 assert.deepEqual(model.screenPoint(180,540,20,.8),{x:180,y:524});
 assert.throws(()=>model.screenPoint(180,10,1,99),RangeError);
 assert.throws(()=>model.screenPoint(NaN,10,1,.8),RangeError);
});
test('geometry tracks all four PR #4 real-engine preview positions',()=>{
 for(const [name,near] of Object.entries(contract.bridge.viewNear)){
  const f=model.bridgeFrame(contract,near);
  assert.equal(f.end-f.start,620,name);
  assert.equal(f.deck.x,138);assert.equal(f.deck.w,84);
  assert.equal(f.parapets[0].x,117);assert.equal(f.parapets[1].x,223);
  assert.equal(f.masonry[0].x,101);assert.equal(f.masonry[1].x,227);
  const ps=model.prism(f.parapets[0],14,.8);
  assert.equal(ps.roof[0][1],f.parapets[0].y-11.2);
 }
});
test('studio is same-origin and makes no edits to the real game configuration',()=>{
 const html=read('gary-camera-lab.html');
 assert.match(html,/gary-camera-contract\.json/);
 assert.match(html,/gary-camera-model\.js/);
 assert.match(html,/index\.html\?debug=1&amp;bridgepreview=1&amp;seed=12345/);
 assert.match(html,/schema:'gary-camera-candidate-v1',approved:false/);
 assert.match(html,/separate|projection|overlay/i);
 assert.doesNotMatch(html,/github\.com\/repos\/|Authorization:|fetch\(.+PUT/);
});
