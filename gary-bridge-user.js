/* Gary Eats! owner-approved stone bridge; independent cross-stream, banks and entrance. */
(function(root){'use strict';
const SPEC=Object.freeze({source:'art/candidates/bridge/bridge-user-supplied.webp?v=20261024',sourceWidth:174,sourceHeight:620,far:180,end:800,deck:[138,222],road:[105,255],x:93,width:174,waterLeft:[0,101],waterRight:[259,360],tileHeight:256,approach:150});
function create({makeCanvas,ImageType}={}){
 if(typeof makeCanvas!=='function'||typeof ImageType!=='function')throw Error('Bridge dependencies unavailable');
 const image=new ImageType();let loaded=false,reason='pending';
 const canvas=(width,height)=>{const c=makeCanvas();c.width=width;c.height=height;return c;};
 // All textured passes are built once. No image allocations in gameplay frames.
 const water=canvas(360,256),w=water.getContext('2d');
 const g=w.createLinearGradient(0,0,360,0);
 g.addColorStop(0,'#244b59');g.addColorStop(.26,'#356977');g.addColorStop(.53,'#2e5d70');g.addColorStop(.77,'#3a7180');g.addColorStop(1,'#254e5e');
 w.fillStyle=g;w.fillRect(0,0,360,256);
 for(let i=0;i<310;i++){
  const x=(i*97+17)%360,y=(i*71+33)%256,rx=4+(i*13)%30;
  w.lineWidth=i%7===0?1.7:.8;
  w.strokeStyle=i%9===0?'rgba(206,232,224,.33)':i%3===0?'rgba(129,184,185,.27)':'rgba(15,61,78,.27)';
  w.beginPath();w.moveTo(x-rx/2,y);w.quadraticCurveTo(x,y-2.4,x+rx/2,y);w.stroke();
 }
 const shore=canvas(360,100),s=shore.getContext('2d');
 const soil=s.createLinearGradient(0,0,0,100);
 soil.addColorStop(0,'#35483e');soil.addColorStop(.5,'#526449');soil.addColorStop(1,'#647053');
 s.fillStyle=soil;s.fillRect(0,0,360,100);
 for(let i=0;i<230;i++){
  const x=(i*83+29)%360,y=(i*61+11)%100;
  s.fillStyle=i%7===0?'#929184':i%3===0?'#344d3e':i%2?'#78845a':'#45583f';
  s.beginPath();s.ellipse(x,y,1.5+(i%5),1+(i%3),0,0,Math.PI*2);s.fill();
 }
 image.onload=()=>{loaded=image.naturalWidth===SPEC.sourceWidth&&image.naturalHeight===SPEC.sourceHeight;reason=loaded?'ready':'invalid dimensions';};
 image.onerror=()=>{loaded=false;reason='artwork unavailable';};image.src=SPEC.source;
 const topY=near=>near-SPEC.end+SPEC.far; // near-620, image top
 const edge=(x,top)=>((Math.sin(x*.061+(top?1.4:3.2))*6)+(Math.sin(x*.143+(top?0:2.5))*3));
 // Banks are perpendicular to the route: water runs left-to-right beneath the bridge.
 function drawWater(ctx,near,clock){
  if(!loaded)return false;
  const top=topY(near),bottom=top+620;
  if(top>740||bottom< -100)return true;
  ctx.save();
  // Softly painted banks replace the previous abrupt rectangular water cut-off.
  // Their vertical texture remains fixed to the bridge's world position.
  ctx.drawImage(shore,0,top-92,360,100);
  ctx.save();ctx.translate(0,bottom+92);ctx.scale(1,-1);ctx.drawImage(shore,0,0,360,100);ctx.restore();
  ctx.beginPath();ctx.moveTo(0,top+edge(0,true));
  for(let x=8;x<=360;x+=8)ctx.lineTo(x,top+edge(x,true));
  for(let x=360;x>=0;x-=8)ctx.lineTo(x,bottom+edge(x,false));
  ctx.closePath();ctx.clip();
  ctx.fillStyle='#2e6170';ctx.fillRect(0,top-12,360,644);
  // Flow travels horizontally across the bridge, not vertically along its length.
  const drift=((clock*18)%360+360)%360;
  for(let y=top-256;y<bottom+256;y+=256){
   for(let x=-360+drift;x<360;x+=360)ctx.drawImage(water,x,y,360,256);
  }
  // Subtle current and shoreline foam. Strokes never extend beyond the water mask.
  ctx.lineCap='round';
  for(let i=0;i<48;i++){
   const yy=top+((i*53+29)%620),xx=((i*107+clock*(11+i%3*3))%430+430)%430-35;
   ctx.strokeStyle=i%4===0?'rgba(199,229,217,.38)':'rgba(121,184,190,.19)';
   ctx.lineWidth=i%7===0?1.5:.9;
   ctx.beginPath();ctx.moveTo(xx,yy);ctx.quadraticCurveTo(xx+10,yy-2,xx+23,yy);ctx.stroke();
  }
  ctx.restore();
  // A narrow, irregular foamy contact edge, with no hard horizontal seam.
  ctx.save();ctx.lineWidth=2;ctx.strokeStyle='rgba(169,204,189,.5)';
  for(const isTop of [true,false]){
   ctx.beginPath();
   for(let x=0;x<=360;x+=8){
    const y=(isTop?top:bottom)+edge(x,isTop);
    if(!x)ctx.moveTo(x,y);else ctx.lineTo(x,y);
   }
   ctx.stroke();
  }
  ctx.restore();
  return true;
 }
 // Reuse the bridge's OWN cobblestone pixels for its entry and exit.
 // This replaces the flat grey legacy trapezoid with a matching stone path.
 function drawApproach(ctx,top,isExit){
  const start=isExit?top+620:top-SPEC.approach;
  const srcX=45,srcW=84,srcY=228,srcH=76;
  ctx.save();ctx.beginPath();
  if(isExit){ctx.moveTo(138,start);ctx.lineTo(222,start);ctx.lineTo(255,start+150);ctx.lineTo(105,start+150);}
  else{ctx.moveTo(105,start);ctx.lineTo(255,start);ctx.lineTo(222,start+150);ctx.lineTo(138,start+150);}
  ctx.closePath();ctx.clip();
  ctx.fillStyle='#6d716b';ctx.fillRect(105,start,150,150);
  for(let i=0;i<13;i++){
   const yy=start+i*12;
   ctx.drawImage(image,srcX,srcY+(i*11)%srcH,srcW,12,105,yy,150,12.5);
  }
  // Side shading tapers into the existing 150-unit road without painted guide lines.
  ctx.restore();
 }
 function drawDeck(ctx,near){
  if(!loaded)return false;const top=topY(near);
  drawApproach(ctx,top,false);
  drawApproach(ctx,top,true);
  ctx.drawImage(image,SPEC.x,top,SPEC.width,620);
  return true;
 }
 function drawFront(ctx,near){
  if(!loaded)return false;const top=topY(near);
  ctx.save();ctx.beginPath();ctx.rect(0,top,138,620);ctx.rect(222,top,138,620);ctx.clip();
  ctx.drawImage(image,SPEC.x,top,SPEC.width,620);ctx.restore();return true;
 }
 return Object.freeze({ready:()=>loaded,reason:()=>reason,drawWater,drawDeck,drawFront,SPEC});
}
const api=Object.freeze({SPEC,create});if(typeof module==='object'&&module.exports)module.exports=api;else root.GaryUserBridge=api;
})(typeof window==='object'?window:globalThis);
