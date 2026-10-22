/* Gary Eats! painted bridge: optional texture overlay on exact existing bridge geometry.
 * One 328×124 RGBA WebP atlas, one preload, three cached render passes. No gameplay changes.
 * If image missing/incompatible the entire renderer safely falls back to the current procedural bridge.
 */
(function(root){'use strict';
 const VERSION='bridge-painted-20261022-v1';
 const SRC='art/bridge/painted/bridge-atlas.webp?v='+VERSION;
 const SPEC=Object.freeze({
   atlas:[328,124],tileHeight:96,far:180,end:800,
   src:{leftBank:[0,0,105,96],deck:[105,0,84,96],rightBank:[189,0,105,96],
     leftWall:[294,0,17,96],rightWall:[311,0,17,96],lip:[105,99,84,22]},
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
     if(!img.naturalWidth||img.naturalWidth!==328||img.naturalHeight!==124){
       reason='invalid atlas dimensions';return;
     }
     try{
       const under=canvas(),deck=canvas(),front=canvas();
       const u=under.getContext('2d'),d=deck.getContext('2d'),f=front.getContext('2d');
       drawStrip(u,'leftBank',0,138);drawStrip(u,'rightBank',222,138);
       drawStrip(d,'deck',138,84);
       drawStrip(f,'leftWall',117,17);drawStrip(f,'rightWall',223,17);
       // Two short masonry seam details mark entry/exit, without covering Gary's lane.
       const [sx,sy,sw,sh]=SPEC.src.lip;
       f.drawImage(img,sx,sy,sw,sh,138,166,84,16);
       f.drawImage(img,sx,sy,sw,sh,138,800,84,16);
       caches={under,deck,front};ready=true;reason='ready';onReady?.();
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
     drawDeck:(ctx,near)=>draw('deck',ctx,near),
     drawFront:(ctx,near)=>draw('front',ctx,near)});
 }
 const api=Object.freeze({SPEC,create});
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.GaryBridgePainted=api;
})(typeof window==='object'?window:globalThis);
