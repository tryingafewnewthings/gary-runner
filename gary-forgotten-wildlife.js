/* Forgotten Road ambient wildlife — purely cosmetic, fixed-camera and world-anchored.
 * Uses the owner's six-frame hedgehog and the EXISTING fox bush source image.
 * Never modifies the fox encounter, collisions, RNG or spawning.
 */
(function(root){
 'use strict';
 const SPEC=Object.freeze({
  sheet:'art/forgotten-road/hedgehog-scurrying.png?v=1',cols:6,cellWidth:72,cellHeight:54,
  hedgehogWidth:40,hedgehogHeight:28,frameSeconds:.115,
  bush:'art/fox/fox-bush.png?v=fox2',ambientBush:'art/forgotten-road/fox-bush-verge.png',bushWidth:76,bushHeight:76,
  segmentHeight:360,roadLeft:105,roadRight:255,screenHeight:640,
  clearingSkip:1
 });
 const hash=(a,b)=>{let h=Math.imul(a+17,0x9e3779b1)^Math.imul(b+11,0x85ebca6b);h=Math.imul(h^(h>>>16),0x7feb352d);return (h^(h>>>15))>>>0;};
 function create({hedgehog,bush}={}){
  // Deterministic positions derived from world-segment index, not render FPS.
  // Avoid a second RNG that would change the fox's 90% event or row director.
  function draw(ctx,distance,clock,clearingStart,benchFoot,{foxActive=false,bridgeVisible=false,wildernessActive=false,readerVisible=false,benchSegment=Infinity}={}){
   if(!Number.isFinite(clearingStart)||!Number.isFinite(distance)||!Number.isFinite(clock)||bridgeVisible||wildernessActive)return;
   // The stranger's actual sprite spans the whole viewport while in frame;
   // enforce a margin on BOTH sides of that period, including his cutscene.
   if(readerVisible||(benchFoot>=-36&&benchFoot<=SPEC.screenHeight+136))return;
   const first=Math.floor((distance+304)/SPEC.segmentHeight)-2;
   const hedgehogReady=!!(hedgehog&&hedgehog.ready&&hedgehog.naturalWidth===SPEC.cols*SPEC.cellWidth&&hedgehog.naturalHeight===SPEC.cellHeight);
   const bushReady=!!(bush&&bush.ready&&bush.naturalWidth>0&&bush.naturalHeight>0);
   if(!hedgehogReady&&!bushReady)return;
   ctx.save();
   for(let segment=Math.max(first,clearingStart+SPEC.clearingSkip);segment<=first+6;segment++){
    // The bench itself remains an uncluttered narrative focal point.
    if(segment===benchSegment)continue;
    // No wildlife or extra background bush on the fox's reserved encounter.
    if(foxActive)continue;
    const h=hash(segment,42),base=distance-segment*SPEC.segmentHeight+304;
    if(base>SPEC.screenHeight+100||base<-450)continue;
    const side=h&1,center=side?308:52;
    // Draw sparse independent bushes (same fox PNG, no duplicated baked foliage).
    if(bushReady&&segment%3===0){
     const y=base+145;
     if(y>-30&&y<SPEC.screenHeight+95){
      const bx=side?281:5;
      ctx.drawImage(bush,bx,y-SPEC.bushHeight+7,SPEC.bushWidth,SPEC.bushHeight);
     }
    }
    if(!hedgehogReady||segment%2!==0)continue;
    const stride=clock*2.75+(h%31)*.14;
    const x=center+Math.sin(stride)*10;
    const y=base+178+Math.cos(stride*.55)*3;
    if(y< -40||y>SPEC.screenHeight+38)continue;
    const frame=(Math.floor(clock/SPEC.frameSeconds)+(h%SPEC.cols))%SPEC.cols;
    const facingRight=Math.cos(stride)>=0;
    ctx.save();
    // Sprite draw box remains fully inside the cobbled/overgrown 105px roadside.
    if(!facingRight){ctx.translate(2*x,0);ctx.scale(-1,1);}
    ctx.drawImage(hedgehog,frame*SPEC.cellWidth,0,SPEC.cellWidth,SPEC.cellHeight,
      x-SPEC.hedgehogWidth/2,y-SPEC.hedgehogHeight,SPEC.hedgehogWidth,SPEC.hedgehogHeight);
    ctx.restore();
   }
   ctx.restore();
  }
  return Object.freeze({draw});
 }
 const api=Object.freeze({SPEC,hash,create});
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.GaryForgottenWildlife=api;
})(typeof window==='object'?window:globalThis);
