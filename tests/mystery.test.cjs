'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {create,SPEC}=require('../gary-street-mystery.js');
const street=[{left:'Shop',right:'Cafe',leftObject:'bench',rightObject:'lamp'}];
function arm(){const s=create(street);s.update(1/60,10000,1,1,true,true);return s;}
test('cameo waits for rain, shutter closure and artwork readiness',()=>{
 for(const [rain,shutters,ready] of [[0,1,true],[1,0,true],[1,1,false]]){
  const s=create(street);s.update(1,10000,rain,shutters,true,ready);assert.equal(s.quiet(),false);
 }
 assert.equal(arm().quiet(),true);
});
test('only future shop segments empty and authored plans remain unchanged',()=>{
 const s=arm(),start=s.snapshot().emptyFrom;
 assert.equal(s.planFor(street[0],start-1),street[0]);
 assert.equal(s.planFor(street[0],start).left,'none');assert.equal(s.planFor(street[0],start).right,'Cafe');
 const end=s.planFor(street[0],start+1);assert.equal(end.right,'none');assert.equal(end.leftObject,'none');
 assert.equal(street[0].left,'Shop');assert.equal(s.footAt(10000)<-180,true);
});
test('opening waits until full sprite is visible, rainy and safe',()=>{
 const s=arm(),d=s.snapshot().benchSegment*360-544;
 s.update(1,d+100,1,1,true,true);assert.equal(s.snapshot().time,0);
 s.update(1,d+250,0,1,true,true);assert.equal(s.snapshot().time,0);
 s.update(1,d+250,1,1,false,true);assert.equal(s.snapshot().time,0);
 s.update(.1,d+250,1,1,true,true);assert.equal(s.snapshot().started,true);
});
test('plays first six frames once, then loops exactly the last two',()=>{
 const s=arm(),d=s.snapshot().benchSegment*360-544+250,frames=[];
 for(let i=0;i<600;i++){s.update(1/60,d,1,1,true,true);frames.push(s.frame());}
 assert.deepEqual([...new Set(frames)], [0,1,2,3,4,5,6,7]);
 assert.ok(frames.slice(200).every(f=>f===6||f===7));
 const saved=s.snapshot().time;assert.equal(s.snapshot().time,saved); // render/query has no clock mutation
 s.update(1,d,0,1,true,true);assert.equal(s.snapshot().time,saved);
});
test('slowdown is forbidden until hazards clear; reset allows one new cameo',()=>{
 const s=arm(),d=s.snapshot().benchSegment*360-544+250;
 assert.equal(s.slow(d,false),false);assert.equal(s.slow(d,true),true);
 s.update(.1,d+1000,1,1,true,true);assert.equal(s.quiet(),false);assert.equal(s.slow(d,true),false);
 s.update(1,50000,1,1,true,true);assert.equal(s.snapshot().passed,true);
 s.reset();assert.equal(s.quiet(),false);s.update(.1,10000,1,1,true,true);assert.equal(s.quiet(),true);
});
for(const normal of [200,300])test('at '+normal+' speed the full sequence and idle loop remain on screen',()=>{
 const s=create(street);let distance=10000,speed=normal;const seen=new Set();let idleVisible=0;
 for(let i=0;i<6000;i++){
  const dt=1/60;s.update(dt,distance,1,1,true,true);
  const goal=s.slow(distance,true)?SPEC.slowSpeed:normal;
  speed+=(goal-speed)*Math.min(1,dt*.7);distance+=speed*dt;
  const foot=s.footAt(distance);if(foot>=SPEC.height+60&&foot<=640){seen.add(s.frame());if(s.frame()>=6)idleVisible+=dt;}
  if(s.snapshot().passed)break;
 }
 assert.deepEqual([...seen],[0,1,2,3,4,5,6,7]);assert.ok(idleVisible>=1.4,idleVisible+' seconds idle');
});
