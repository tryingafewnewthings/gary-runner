'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {create,SPEC}=require('../gary-fox-encounter.js');
function fixture(random=()=>0){
 const events={spawn:0,theft:0,escape:0,complete:0};
 const world={afterBench:false,dialogueActive:false,hazardsClear:true,distance:10000};
 let food;
 const fox=create({images:Object.fromEntries(['approach','snatch','turn','return','bush'].map(k=>[k,{ready:true}])),random,
  spawnFood(l,y){events.spawn++;return food={t:'sausage_roll',l,y,d:0};},
  onTheft(){events.theft++;},onEscape(){events.escape++;},onComplete(){events.complete++;}});
 function tick(seconds){for(let i=0;i<Math.ceil(seconds*60);i++){
  fox.update(1/60,world);world.distance+=200/60;if(food)food.y+=200/60;
 }}
 return {fox,events,world,tick,get food(){return food;}};
}
test('fox waits for the bench, dialogue and safe corridor before spawning once',()=>{
 const f=fixture();f.tick(10);assert.equal(f.fox.snapshot().phase,'dormant');
 f.world.afterBench=true;f.world.dialogueActive=true;f.tick(10);assert.equal(f.events.spawn,0);
 f.world.dialogueActive=false;f.world.hazardsClear=false;f.tick(4);assert.equal(f.events.spawn,0);
 f.world.hazardsClear=true;f.tick(1/60);assert.equal(f.events.spawn,1);
 assert.equal(f.food.l,SPEC.foodLane);f.tick(20);assert.equal(f.events.spawn,1);
 assert.equal(f.events.complete,1);f.fox.reset();assert.equal(f.fox.snapshot().phase,'dormant');
});
for(const [name,randomValue] of [['theft',0.1],['spared',0.95]])test(`fox ${name}: outcome sampled once and callbacks complete once`,()=>{
 let samples=0;const f=fixture(()=>{samples++;return randomValue;});f.world.afterBench=true;
 f.tick(SPEC.delay-0.1);assert.equal(f.events.spawn,0);f.tick(20);
 assert.equal(samples,1);assert.equal(f.events.spawn,1);assert.equal(f.events.complete,1);
 assert.equal(f.fox.snapshot().finished,true);
 assert.equal(f.events.theft,name==='theft'?1:0);assert.equal(f.events.escape,name==='theft'?1:0);
 assert.equal(f.fox.snapshot().outcome,name==='theft'?'theft':'missed');
 f.tick(20);assert.equal(f.events.complete,1);assert.equal(samples,1);
});
