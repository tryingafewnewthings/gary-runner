'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {FixedStepClock,ObjectPool,sweptContact}=require('../game-core.js');
for (const hz of [30,60,90,120,144]) {
  test(`identical 10-second simulation at ${hz} Hz rendering`,()=>{
    const clock=new FixedStepClock(); let distance=0;
    clock.frame(0,dt=>{distance+=200*dt;});
    for(let frame=1;frame<=hz*10;frame++)clock.frame(frame*1000/hz,dt=>{distance+=200*dt;});
    assert.equal(clock.ticks,600); assert.ok(Math.abs(distance-2000)<1e-8);
  });
}
test('long stalls are bounded; reset discards background time',()=>{
  const clock=new FixedStepClock();let calls=0;
  clock.frame(0,()=>calls++);clock.frame(10000,()=>calls++);
  assert.equal(calls,6);assert.ok(clock.droppedSeconds>9.8);
  clock.reset();clock.frame(60000,()=>calls++);assert.equal(calls,6);
  clock.frame(60000+1000/60,()=>calls++);assert.equal(calls,7);
});
test('pool reuses identities, preserves active order and stays bounded over 10000 cycles',()=>{
  let made=0;const pool=new ObjectPool(8,()=>({id:made++,keep:true}));
  const originals=new Set(pool.free);
  for(let cycle=0;cycle<10000;cycle++){
    for(let i=0;i<8;i++)assert.ok(originals.has(pool.acquire()));
    assert.equal(pool.acquire(),null);
    pool.active[2].keep=false;const kept=pool.active.filter(x=>x.keep);
    pool.retain(x=>x.keep);assert.deepEqual(pool.active,kept);
    pool.clear();for(const x of pool.free)x.keep=true;
    assert.equal(pool.free.length,8);assert.equal(pool.active.length,0);
  }
  assert.equal(made,8);assert.equal(pool.peak,8);
});
test('swept collisions catch crossings but reject the empty corners of a swept bounding rectangle',()=>{
  assert.ok(sweptContact(0,-40,0,40,20,20));
  assert.ok(sweptContact(50,0,-50,0,20,20));
  assert.ok(sweptContact(0,0,0,0,20,20));
  assert.equal(sweptContact(21,-40,21,40,20,20),false);
  assert.equal(sweptContact(-40,0,0,100,10,10),false);
  assert.equal(sweptContact(40,40,60,60,20,20),false);
});
