/* Gary Eats! painted bridge: optional texture overlay on exact existing bridge geometry.
 * One 246×93 RGBA WebP atlas, one preload, four cached render passes. No gameplay changes.
 * If image missing/incompatible the entire renderer safely falls back to the current procedural bridge.
 */
(function(root){'use strict';
 const VERSION='bridge-painted-20261022-v1';
 const SRC='art/bridge/painted/bridge-atlas.webp?v='+VERSION;
 const SPEC=Object.freeze({
   atlas:[246,93],tileHeight:96,far:180,end:800,
   src:{leftBank:[0,0,79,72],deck:[79,0,63,72],rightBank:[142,0,79,72],
     leftWall:[221,0,13,72],rightWall:[234,0,12,72],lip:[79,74,63,17]},
   road:[105,255],lane:[138,222],walls:[[117,17],[223,17]]
 });
 function create({makeCanvas,ImageType,onReady}={}){
   if(typeof makeCanvas!=='function'||typeof ImageType!=='function')throw Error('Bridge texture dependencies missing');
   let ready=false,reason='pending';let caches=null;
   const img=new ImageType();
   const canvas=()=>{const c=makeCanvas();c.width=360;c.height=1000;return c;};
   function drawStrip(c,name,x,width){
     const [sx,sy,sw,sh]=SPEC.src[name];
     c.save();c.beginPath();c.rect(x,SPEC.far,width,SPEC.end-SPEC.far);c.clip();
     for(let y=SPEC.far;y<SPEC.end;y+=SPEC.tileHeight)
       c.drawImage(img,sx,sy,sw,sh,x,y,width,SPEC.tileHeight);
     c.restore();
   }
   function build(){
     if(!img.naturalWidth||img.naturalWidth!==246||img.naturalHeight!==93){
       reason='invalid atlas dimensions';return;
     }
     try{
       const under=canvas(),lower=canvas(),deck=canvas(),front=canvas();
       const u=under.getContext('2d'),m=lower.getContext('2d'),d=deck.getContext('2d'),f=front.getContext('2d');
       // Keep dark water outside masonry, not behind the player's deck.
       drawStrip(u,'leftBank',0,103);drawStrip(u,'rightBank',257,103);
       // Fade both stream endpoints into the existing river terrain rather
       // than revealing a horizontal rectangular tile boundary.
       u.save();u.globalCompositeOperation='destination-in';
       const fade=u.createLinearGradient(0,SPEC.far,0,SPEC.end);
       fade.addColorStop(0,'rgba(0,0,0,0)');fade.addColorStop(.09,'rgba(0,0,0,1)');
       fade.addColorStop(.90,'rgba(0,0,0,1)');fade.addColorStop(1,'rgba(0,0,0,0)');
       u.fillStyle=fade;u.fillRect(0,SPEC.far,360,SPEC.end-SPEC.far);u.restore();
       // Texture over old detached arches: continuous parallel bridge side
       // masonry, with independent foreground parapets and centre walkway.
       drawStrip(m,'leftWall',101,37);drawStrip(m,'rightWall',222,37);
       drawStrip(d,'deck',138,84);
       drawStrip(f,'leftWall',117,17);drawStrip(f,'rightWall',223,17);
       // Two short masonry seam details mark entry/exit, without covering Gary's lane.
       const [sx,sy,sw,sh]=SPEC.src.lip;
       f.drawImage(img,sx,sy,sw,sh,138,166,84,16);
       f.drawImage(img,sx,sy,sw,sh,138,800,84,16);
       caches={under,lower,deck,front};ready=true;reason='ready';onReady?.();
     }catch(e){ready=false;reason=String(e?.message||e);}
   }
   img.onload=build;
   img.onerror=()=>{ready=false;reason='asset unavailable';};
   img.src=SRC;
   function draw(which,ctx,near){
     if(!ready||!Number.isFinite(near)||!caches||!caches[which])return false;
     ctx.drawImage(caches[which],0,near-SPEC.end);return true;
   }
   return Object.freeze({ready:()=>ready,reason:()=>reason,source:SRC,
     drawUnder:(ctx,near)=>draw('under',ctx,near),
     drawLower:(ctx,near)=>draw('lower',ctx,near),
     drawDeck:(ctx,near)=>draw('deck',ctx,near),
     drawFront:(ctx,near)=>draw('front',ctx,near)});
 }
 const api=Object.freeze({SPEC,create});
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.GaryBridgePainted=api;
})(typeof window==='object'?window:globalThis);
