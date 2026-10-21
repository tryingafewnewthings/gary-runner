/* Active-time reusable encounter scheduler. No rendering, physics, audio or global randomness. */
(function(root){'use strict';
 const SPEC=Object.freeze({rarity:.35,cooldown:22,initialDelay:10,checkInterval:8,rustle:1.4,recovery:2.4,minProgress:1800});
 function create({seed=1,config={},spawnFood=()=>false,onCue=()=>{},onStart=()=>{}}={}){
  const cfg={...SPEC,...config};let rng=1;
  const s={phase:'idle',time:0,cooldown:cfg.initialDelay,outcome:null,depth:0,side:-1,count:0,checks:0,spawned:false};
  function random(){rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return (rng>>>0)/4294967296;}
  function reset(value=seed){rng=(value>>>0)||1;Object.assign(s,{phase:'idle',time:0,cooldown:cfg.initialDelay,outcome:null,depth:0,side:-1,count:0,checks:0,spawned:false});}
  const quiet=()=>s.phase!=='idle';
  function update(dt,w){
   if(!(dt>0)||w.blocked||w.progress<cfg.minProgress)return;
   if(s.phase==='idle'){
    s.cooldown=Math.max(0,s.cooldown-dt);if(s.cooldown>0)return;s.checks++;
    if(random()>=cfg.rarity){s.cooldown=cfg.checkInterval;return;}
    s.phase='waiting';s.time=0;return;
   }
   s.time+=dt;
   if(s.phase==='waiting'){
    if(!w.hazardsClear)return;
    const roll=random();s.outcome=roll<.6?'nothing':roll<.88?'food':'cue';s.side=random()<.5?-1:1;s.depth=w.distance-300;s.spawned=false;s.count++;s.time=0;s.phase='rustling';onStart(s.outcome);
   }else if(s.phase==='rustling'&&s.time>=cfg.rustle){
    if(s.outcome==='food'&&!s.spawned){if(!spawnFood('custard_cream',1,240))return;s.spawned=true;}
    if(s.outcome==='cue')onCue();s.phase='recovery';s.time=0;
   }else if(s.phase==='recovery'&&s.time>=cfg.recovery){s.phase='idle';s.time=0;s.cooldown=cfg.cooldown;}
  }
  reset();return Object.freeze({reset,update,quiet,state:s,snapshot:()=>({...s}),preview:(outcome,distance)=>{if(!['nothing','food','cue'].includes(outcome))throw Error('Invalid preview outcome');Object.assign(s,{phase:'rustling',time:.4,outcome,depth:distance-300,side:-1,spawned:false});onStart(outcome);}});
 }
 const api=Object.freeze({SPEC,create});if(typeof module==='object'&&module.exports)module.exports=api;else root.GaryWildernessEncounters=api;
})(typeof window==='object'?window:globalThis);
