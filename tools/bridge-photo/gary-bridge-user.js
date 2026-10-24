/* Gary Eats! supplied bridge with independent animated river. Candidate only until approved. */
(function(root){'use strict';
const SPEC=Object.freeze({source:'art/bridge/user/bridge-user-supplied.webp?v=20261024',sourceWidth:174,sourceHeight:620,cacheHeight:1000,far:180,end:800,deck:[138,222],road:[105,255],x:93,width:174,waterLeft:[0,101],waterRight:[259,360],tileHeight:256});
function create({makeCanvas,ImageType,environment}={}){
 if(typeof makeCanvas!=='function'||typeof ImageType!=='function')throw Error('Bridge dependencies unavailable');
 const image=new ImageType();let loaded=false,reason='pending';
 const canvas=(w,h)=>{const c=makeCanvas();c.width=w;c.height=h;return c;};
 const water=canvas(103,256),w=water.getContext('2d');
 const grad=w.createLinearGradient(0,0,103,0);
 grad.addColorStop(0,'#304d51');grad.addColorStop(.18,'#466b6c');grad.addColorStop(.54,'#416467');grad.addColorStop(.83,'#4a7272');grad.addColorStop(1,'#273e44');
 w.fillStyle=grad;w.fillRect(0,0,103,256);
 for(let i=0;i<85;i++){
  const x=6+((i*41+19)%91),y=(i*73+29)%256,width=5+(i*11)%24;
  w.strokeStyle=i%5===0?'rgba(179,205,185,.22)':i%3===0?'rgba(109,158,151,.25)':'rgba(27,61,67,.19)';
  w.lineWidth=i%7===0?1.6:.8;w.beginPath();w.moveTo(x-width/2,y);w.quadraticCurveTo(x,y-2,x+width/2,y);w.stroke();
 }
 const bank=canvas(360,1000),b=bank.getContext('2d');
 function bankStrip(x,dir){
  b.fillStyle='#3d554b';b.fillRect(x,180,9,620);b.fillStyle='#62745a';b.fillRect(x+(dir>0?0:5),180,4,620);
  for(let i=0;i<38;i++){const yy=185+(i*67)%610,xx=x+(i*7)%8;
   b.fillStyle=i%3===0?'#8a9180':i%2?'#566b53':'#748264';
   b.beginPath();b.ellipse(xx,yy,1.6+(i%3),2+(i%4),0,0,Math.PI*2);b.fill();}
 }
 bankStrip(0,1);bankStrip(351,-1);
 image.onload=()=>{loaded=image.naturalWidth===SPEC.sourceWidth&&image.naturalHeight===SPEC.sourceHeight;reason=loaded?'ready':'invalid dimensions';};
 image.onerror=()=>{loaded=false;reason='artwork unavailable';};image.src=SPEC.source;
 function drawWater(ctx,near,clock){
  if(!loaded)return false;const y=near-SPEC.end+SPEC.far;if(y>=640||y+620<=0)return true;
  const offset=((clock*13)%256+256)%256;ctx.save();
  for(const [x,width] of [[0,101],[259,101]]){
   ctx.save();ctx.beginPath();ctx.rect(x,y,width,620);ctx.clip();
   ctx.fillStyle='#35595e';ctx.fillRect(x,y,width,620);
   for(let yy=y-256+offset;yy<y+620;yy+=256)ctx.drawImage(water,0,0,103,256,x,yy,width,256);
   ctx.restore();
  }
  ctx.drawImage(bank,0,near-SPEC.end);
  ctx.save();ctx.beginPath();ctx.rect(9,y,92,620);ctx.rect(259,y,92,620);ctx.clip();
  ctx.strokeStyle='rgba(170,201,187,.21)';ctx.lineWidth=1.15;const shift=(clock*19)%80;
  for(let k=0;k<11;k++){const yy=y+(k*80+shift)%620;for(const x of [24,279]){
   ctx.beginPath();ctx.moveTo(x,yy);ctx.quadraticCurveTo(x+13,yy-3,x+27,yy);ctx.stroke();
  }}ctx.restore();ctx.restore();return true;
 }
 function drawDeck(ctx,near){
  if(!loaded)return false;const base=near-SPEC.end;
  if(environment?.drawDeck){ctx.save();ctx.beginPath();ctx.rect(0,base,360,180);ctx.rect(0,base+800,360,200);ctx.clip();environment.drawDeck(ctx,near);ctx.restore();}
  ctx.drawImage(image,SPEC.x,base+SPEC.far,SPEC.width,620);return true;
 }
 function drawFront(ctx,near){
  if(!loaded)return false;const y=near-SPEC.end+SPEC.far;
  ctx.save();ctx.beginPath();ctx.rect(0,y,138,620);ctx.rect(222,y,138,620);ctx.clip();
  ctx.drawImage(image,SPEC.x,y,SPEC.width,620);ctx.restore();return true;
 }
 return Object.freeze({ready:()=>loaded,reason:()=>reason,drawWater,drawDeck,drawFront,SPEC});
}
const api=Object.freeze({SPEC,create});if(typeof module==='object'&&module.exports)module.exports=api;else root.GaryUserBridge=api;
})(typeof window==='object'?window:globalThis);
