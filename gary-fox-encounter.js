/* Gary Eats! Fox encounter V2. Active-time state machine, once per run. */
(function(root){'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
 const SPEC=Object.freeze({delay:3.5,probability:.9,minSpeedRatio:.8,foodLane:0,foodX:130,startY:-60,bushX:12,bushSize:224,bushGroundOffset:12,bushAlphaBase:365/512,foxStartX:33,foxEndX:103,foxSize:80,cell:256,baseline:220,axis:128,lead:.45,approach:.55,snatch:.36,turn:.16,retreat:.55,cooldown:2.5});
 function create({images={},spawnFood=()=>null,onTheft=()=>{},onEscape=()=>{},onComplete=()=>{},random=Math.random,forced=null}={}){
  const s={phase:'dormant',time:0,age:0,depth:0,theft:false,food:null,taken:false,finished:false,outcome:'pending'};let requestMade=false;
  const quiet=()=>!['dormant','done'].includes(s.phase);
  function go(phase){s.phase=phase;s.time=0;}
  function reset(){Object.assign(s,{phase:'dormant',time:0,age:0,depth:0,theft:false,food:null,taken:false,finished:false,outcome:'pending'});requestMade=false;}
  function ready(){return ['approach','snatch','turn','return','bush'].every(k=>images[k]?.ready!==false&&images[k]);}
  function update(dt,w){
   if(!Number.isFinite(dt)||dt<=0||s.phase==='done')return;dt=Math.min(dt,.1);
   if(s.phase==='dormant'){if(!w.afterBench||w.dialogueActive||!ready())return;go('waiting');}
   s.time+=dt;s.age+=dt;
   if(s.phase==='waiting'){
    if(s.time<SPEC.delay||!w.hazardsClear||w.dialogueActive)return;
    if(!requestMade){s.theft=forced==='theft'||(forced!=='spared'&&random()<SPEC.probability);requestMade=true;}
    const food=spawnFood(SPEC.foodLane,SPEC.startY);if(!food)return;
    s.food=food;s.depth=w.distance-SPEC.startY;s.outcome=s.theft?'theft':'spared';go('lead');return;
   }
   if(s.phase==='cooldown'){if(s.time>=SPEC.cooldown){go('done');s.finished=true;onComplete(s.outcome);}return;}
   // A collected/passed pickup is never removed or awarded for a second time.
   if(s.food?.d&&!s.taken){s.outcome='collected';go('cooldown');return;}
   if(!s.theft){if(s.food?.y>700){s.outcome='missed';go('cooldown');}return;}
   if(s.phase==='lead'&&s.time>=SPEC.lead&&s.food.y>=100)go('approach');
   else if(s.phase==='approach'&&s.time>=SPEC.approach)go('snatch');
   else if(s.phase==='snatch'){
    if(!s.taken&&s.time>=SPEC.snatch*.5){
     if(!s.food||s.food.d){s.outcome='collected';go('cooldown');return;}
     s.food.d=1;s.taken=true;onTheft();
    }
    if(s.time>=SPEC.snatch)go('turn');
   }else if(s.phase==='turn'&&s.time>=SPEC.turn)go('retreat');
   else if(s.phase==='retreat'&&s.time>=SPEC.retreat){onEscape();go('cooldown');}
  }
  // No simulation or random draws happen in render.
  function draw(ctx,distance,alpha=1,clock=0){
   if(['dormant','waiting'].includes(s.phase))return;
   const food=s.food,groundY=distance-s.depth+4;if(s.phase==='done'&&groundY>740)return;
   const bush=images.bush,cell=SPEC.cell;let x=SPEC.foxStartX,kind=null,frame=0;
   if(s.theft){
    if(s.phase==='approach'){kind='approach';x=lerp(SPEC.foxStartX,SPEC.foxEndX,smooth(s.time/SPEC.approach));frame=Math.floor(s.time*10)%6;}
    else if(s.phase==='snatch'){kind='snatch';x=SPEC.foxEndX;frame=Math.min(3,Math.floor(s.time/SPEC.snatch*4));}
    else if(s.phase==='turn'){kind='turn';x=SPEC.foxEndX;frame=Math.min(2,Math.floor(s.time/SPEC.turn*3));}
    else if(s.phase==='retreat'){kind='return';x=lerp(SPEC.foxEndX,SPEC.foxStartX,smooth(s.time/SPEC.retreat));frame=Math.floor(s.time*11)%6;}
   }
   ctx.save();
   if(kind&&images[kind]){
    const im=images[kind],size=SPEC.foxSize;
    ctx.drawImage(im,frame*cell,0,cell,cell,x-SPEC.axis/cell*size,groundY-SPEC.baseline/cell*size,size,size);
   }
   if(bush){
    const rustle=s.phase==='retreat'?Math.max(0,(s.time/SPEC.retreat-.65)/.35):s.phase==='cooldown'&&s.taken?Math.max(0,1-s.time/.5):0;
    const sway=Math.sin(clock*34)*1.2*rustle;
    ctx.drawImage(bush,SPEC.bushX-SPEC.bushSize/2+sway,groundY+SPEC.bushGroundOffset-SPEC.bushAlphaBase*SPEC.bushSize,SPEC.bushSize,SPEC.bushSize);
   }
   ctx.restore();
  }
  return {reset,update,draw,quiet,ready,slow:()=>['lead','approach','snatch','turn','retreat'].includes(s.phase),snapshot:()=>({...s,food:s.food?{t:s.food.t,y:s.food.y,d:s.food.d}:null})};
 }
 const api={SPEC,create};if(typeof module==='object'&&module.exports)module.exports=api;else root.GaryFoxEncounter=Object.freeze(api);
})(typeof window==='object'?window:globalThis);
