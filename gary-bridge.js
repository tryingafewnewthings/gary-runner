/* Forgotten Bridge: fixed-camera geometry; simulation and cached paint are independent. */
(function(root){'use strict';
 const SPEC=Object.freeze({length:620,warningAt:-180,guideAt:350,releaseAt:1260,clearAt:1450,collapseEnabled:false});
 function create({collapseEnabled=false,biomeReady=()=>false}={}){
  let phase='dormant',anchor=0,near=-180,collapse=false;
  function reset(){phase='dormant';anchor=0;near=-180;collapse=false;}
  function update(dt,{distance,foxFinished,hazardsClear,dialogueActive=false}){
   if(!(dt>0)||!Number.isFinite(distance))return;
   if(phase==='dormant'){
    if(!foxFinished||!hazardsClear||dialogueActive)return;
    anchor=distance-SPEC.warningAt;phase='approach';
   }
   near=distance-anchor;
   if(near>=SPEC.clearAt)phase='done';
   else if(near>=SPEC.releaseAt)phase='exit';
   else if(near>=540)phase='crossing';
   else phase='approach';
  }
  const visible=()=>phase!=='dormant';
  return {reset,update,visible,quiet:()=>visible()&&phase!=='done',
   locked:()=>visible()&&near>=SPEC.guideAt&&near<SPEC.releaseAt,
   warning:()=>visible()&&near<540,
   nearAt:distance=>distance-anchor,
   // No destination, physics or item handover is activated without a shipped biome.
   requestCollapse:roll=>{if(collapse||!collapseEnabled||!biomeReady('underwater-cave')||!visible()||phase!=='crossing'||!(roll>=0&&roll<.01))return false;collapse=true;return true;},
   snapshot:()=>({phase,anchor,near,collapse})};
 }
 function renderer(makeCanvas){
  const W=360,H=1000,far=180,end=800;
  const canvas=()=>{const c=makeCanvas();c.width=W;c.height=H;return c;};
  const lower=canvas(),deck=canvas(),walls=canvas(),terrain=canvas();
  const poly=(c,p,fill,stroke)=>{c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1.4;c.stroke();}};
  const ellipse=(c,x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
  // Deterministic, bounded paint; no image generation or geometry allocation in draw().
  const t=terrain.getContext('2d');t.fillStyle='#465348';t.fillRect(0,0,W,H);
  for(let i=0;i<155;i++){
   const x=(i*137+17)%360,y=(i*193+31)%1000;
   if(x>99&&x<261)continue;
   t.fillStyle=i%3?'#505e47':'#394b40';t.beginPath();t.moveTo(x-15,y+2);t.bezierCurveTo(x-24,y-8,x-5,y-13,x+2,y-8);t.bezierCurveTo(x+18,y-15,x+27,y+1,x+15,y+6);t.bezierCurveTo(x+3,y+11,x-5,y+5,x-15,y+2);t.fill();
   if(i%5===0){for(let k=0;k<7;k++){const xx=x+(k*13)%27-13,yy=y+(k*7)%13-7;ellipse(t,xx,yy,8,5,k%2?'#657451':'#3b513e');}t.strokeStyle='#87956a';t.lineWidth=1;t.beginPath();t.moveTo(x-10,y-5);t.quadraticCurveTo(x-4,y-10,x+2,y-6);t.stroke();}
   if(i%4===0){ellipse(t,x+2,y+5,11,4,'#303e37');poly(t,[[x-10,y],[x-6,y-9],[x+5,y-11],[x+12,y-3],[x+9,y+3],[x-5,y+4]],'#737c6a','#3c483e');ellipse(t,x-1,y-7,6,2,'#82916b');}
   if(i%3===0){t.strokeStyle='#84915c';t.lineWidth=1.3;t.beginPath();t.moveTo(x,y);t.lineTo(x-4,y-8);t.moveTo(x,y);t.lineTo(x+3,y-11);t.stroke();}
  }
  const b=lower.getContext('2d');
  // Offset contact shadows tie the raised structure to the stream and banks.
  for(const [x,w] of [[105,44],[221,47]]){b.fillStyle='rgba(17,29,27,.36)';b.fillRect(x+5,far+27,w,end-far+15);}
  function masonry(x,w){
   const g=b.createLinearGradient(x,0,x+w,0);g.addColorStop(0,'#8b5140');g.addColorStop(.5,'#704235');g.addColorStop(1,'#4a3832');
   b.fillStyle=g;b.fillRect(x,far+16,w,end-far+20);
   b.save();b.beginPath();b.rect(x,far+16,w,end-far+20);b.clip();
   b.lineWidth=1;b.strokeStyle='#b17b5b';
   for(let y=far+16,row=0;y<end+40;y+=12,row++){
    b.beginPath();b.moveTo(x,y);b.lineTo(x+w,y);b.stroke();
    for(let xx=x-16+(row%2)*13;xx<x+w;xx+=26){b.beginPath();b.moveTo(xx,y);b.lineTo(xx,y+12);b.stroke();}
   }
   // Arches span ALONG the side plane, with height projected across its
   // shallow width. Upright screen-space windows would flatten the structure.
   const left=x<180,outer=left?x+1:x+w-1,inner=left?x+w-5:x+5,sign=left?1:-1;
   for(let y=far+48;y<end-20;y+=156){
    b.fillStyle='#223832';b.beginPath();b.moveTo(outer,y+12);b.lineTo(outer,y+130);
    b.bezierCurveTo(inner,y+119,inner,y+28,outer,y+12);b.closePath();b.fill();
    b.strokeStyle='#bb825e';b.lineWidth=6;b.beginPath();b.moveTo(outer,y+12);
    b.bezierCurveTo(inner,y+28,inner,y+119,outer,y+130);b.stroke();
    b.strokeStyle='#654535';b.lineWidth=1.3;
    for(let k=1;k<9;k++){
     const f=k/9,yy=y+12+118*f,xx=outer+sign*21*Math.sin(Math.PI*f);
     b.beginPath();b.moveTo(xx-sign*2,yy);b.lineTo(xx+sign*5,yy+(f-.5)*5);b.stroke();
    }
    b.strokeStyle='#142b29';b.lineWidth=3;b.beginPath();b.moveTo(outer+sign*3,y+23);
    b.bezierCurveTo(inner-sign*6,y+43,inner-sign*6,y+104,outer+sign*3,y+119);b.stroke();
    // Broad piers with a lit ledge and a short contact shadow in the water.
    poly(b,[[x-3,y+137],[x+w+2,y+137],[x+w+5,y+145],[x-1,y+145]],'#a37352','#513e32');
    b.fillStyle='#79513e';b.fillRect(x-1,y+145,w+6,12);
    ellipse(b,x+w/2,y+161,w*.75,5,'rgba(20,40,34,.45)');
    b.strokeStyle='#769486';b.lineWidth=1;b.beginPath();b.moveTo(outer-sign*6,y+91);b.lineTo(outer+sign*5,y+91);b.stroke();
   }
   b.restore();
  }
  masonry(101,32);masonry(227,32);
  const d=deck.getContext('2d');
  poly(d,[[105,0],[255,0],[255,far-150],[222,far],[222,end],[255,end+150],[255,H],[105,H],[105,end+150],[138,end],[138,far],[105,far-150]],'#777365');
  d.strokeStyle='#424b3d';d.lineWidth=1.4;
  for(const points of [[[105,0],[105,far-150],[138,far],[138,end],[105,end+150],[105,H]],[[255,0],[255,far-150],[222,far],[222,end],[255,end+150],[255,H]]]){d.beginPath();points.forEach(([x,y],i)=>i?d.lineTo(x,y):d.moveTo(x,y));d.stroke();}
  const dg=d.createLinearGradient(138,0,222,0);dg.addColorStop(0,'#9d9480');dg.addColorStop(.35,'#b1a58c');dg.addColorStop(1,'#918675');d.fillStyle=dg;d.fillRect(138,far,84,end-far);
  d.strokeStyle='rgba(63,60,49,.23)';d.lineWidth=1;
  for(let y=far+18;y<end;y+=24){d.beginPath();d.moveTo(140,y);d.quadraticCurveTo(180,y+3,220,y-1);d.stroke();}
  for(let i=0;i<100;i++){const x=145+(i*29)%70,y=far+(i*71)%620;ellipse(d,x,y,1.7,.65,i%2?'#c2b298':'#817968');}
  // Entrance/exit tapered margins retain all three lane positions on the approaches.
  for(const y of [far-130,end+25]){d.strokeStyle='#c1b69c';d.lineWidth=2;for(const x of [130,230]){d.beginPath();d.moveTo(x,y);d.lineTo(x,y+32);d.stroke();}}
  d.save();d.globalCompositeOperation='destination-out';const blend=d.createLinearGradient(0,end+60,0,H);blend.addColorStop(0,'rgba(0,0,0,0)');blend.addColorStop(1,'rgba(0,0,0,1)');d.fillStyle=blend;d.fillRect(0,end+60,360,H-end-60);d.restore();
  const p=walls.getContext('2d');
  function parapet(x){
   p.fillStyle='#533d35';p.fillRect(x,far+6,17,end-far+7);
   const g=p.createLinearGradient(x,0,x+17,0);g.addColorStop(0,'#ad7054');g.addColorStop(1,'#84503f');p.fillStyle=g;p.fillRect(x,far-12,17,end-far);
   p.strokeStyle='#c28d6b';p.lineWidth=.8;
   for(let y=far-6,row=0;y<end-12;y+=11,row++){p.beginPath();p.moveTo(x,y);p.lineTo(x+17,y);p.stroke();p.beginPath();p.moveTo(x+4+(row%2)*9,y);p.lineTo(x+4+(row%2)*9,y+11);p.stroke();}
   // Thick pale coping: lit top, dark inner edge and end faces.
   poly(p,[[x+11,far-13],[x+20,far-8],[x+20,end-8],[x+11,end-14]],'#86503e','#4b3830');
   p.strokeStyle='#b17c5a';p.lineWidth=.8;for(let y=far;y<end-12;y+=11){p.beginPath();p.moveTo(x+11,y);p.lineTo(x+20,y+4);p.stroke();}
   poly(p,[[x-2,far-17],[x+11,far-17],[x+16,far-13],[x+16,end-16],[x-2,end-16]],'#b2a18a','#524b3f');
   p.fillStyle='#827765';p.fillRect(x+12,far-12,4,end-far-4);
   p.strokeStyle='#776b5b';for(let y=far+9;y<end-12;y+=32){p.beginPath();p.moveTo(x-1,y);p.lineTo(x+14,y+2);p.stroke();}
   for(const y of [far-22,end-24]){
    poly(p,[[x-5,y+5],[x+23,y+5],[x+23,y+29],[x-5,y+29]],'#895b45','#4d4035');
    poly(p,[[x-7,y],[x+20,y],[x+25,y+6],[x-5,y+6]],'#c2ad8c','#5c5141');
    p.fillStyle='#62714b';p.fillRect(x-4,y+24,10,4);
   }
   for(let i=0;i<14;i++){const y=far+35+i*40;ellipse(p,x+3,y,4,2,i%2?'#637347':'#7d8050');}
  }
  parapet(117);parapet(223);
  for(const x of [87,273]){
   ellipse(p,x+3,end+118,10,3,'rgba(21,32,27,.4)');p.fillStyle='#77796a';p.fillRect(x-2,end+79,4,38);
   poly(p,[[x,end+49],[x-14,end+76],[x+14,end+76]],'#e6d9bb','#873f32');
   p.strokeStyle='#424b40';p.lineWidth=2;p.beginPath();p.moveTo(x-6,end+70);p.lineTo(x-3,end+65);p.lineTo(x-3,end+59);p.moveTo(x+6,end+70);p.lineTo(x+3,end+65);p.lineTo(x+3,end+59);p.stroke();
  }
  // Bank contours follow the same world registration as the structure.
  function banks(c,y){poly(c,[[0,y-18],[35,y-9],[66,y-15],[98,y],[101,y+27],[61,y+20],[32,y+28],[0,y+17]],'#59654b','#354b3e');poly(c,[[259,y],[291,y-15],[329,y-7],[360,y-20],[360,y+17],[321,y+25],[283,y+18],[259,y+27]],'#59654b','#354b3e');}
  banks(b,far+105);banks(b,end-115);
  return Object.freeze({
   drawWater(ctx,near,clock){
    const top=near-end;
    // Wilderness ground is tiled behind the bridge, continuing after its exit.
    const bottom=Math.min(760,near+260);
    if(bottom<=0)return;
    ctx.save();ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(360,0);ctx.lineTo(360,bottom-28);
    for(let x=360;x>=0;x-=20)ctx.lineTo(x,bottom-18-Math.sin(x*.13)*13);
    ctx.closePath();ctx.clip();

    const offset=((top%H)+H)%H;const solid=Math.min(640,Math.max(0,bottom-120));
    ctx.save();ctx.beginPath();ctx.rect(0,0,360,solid);ctx.clip();ctx.drawImage(terrain,0,offset-H);ctx.drawImage(terrain,0,offset);ctx.restore();
    for(let y=solid;y<Math.min(640,bottom);y+=16){ctx.save();ctx.beginPath();ctx.rect(0,y,360,16);ctx.clip();ctx.globalAlpha=Math.min(1,Math.max(0,(bottom-y)/120));ctx.drawImage(terrain,0,offset-H);ctx.drawImage(terrain,0,offset);ctx.restore();}
    const road=ctx.createLinearGradient(0,near+55,0,near+230);road.addColorStop(0,'#777365');road.addColorStop(1,'#252d3c');ctx.fillStyle=road;ctx.fillRect(105,0,150,bottom);
    const a=top+far+120,z=top+end-120;
    const water=ctx.createLinearGradient(0,a,0,z);water.addColorStop(0,'#314e4b');water.addColorStop(.45,'#52766c');water.addColorStop(1,'#2c4946');ctx.fillStyle=water;ctx.fillRect(0,a,360,z-a);
    ctx.fillStyle='rgba(15,29,27,.23)';ctx.fillRect(94,a,178,z-a);
    ctx.strokeStyle='rgba(168,199,170,.35)';ctx.lineWidth=1.2;
    for(let i=0;i<26;i++){const x=((i*97+clock*13)%400)-20,y=a+18+(i*73)%370;if(y>z-10)continue;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+9,y-3,x+20,y);ctx.stroke();}
    ctx.restore();
   },
   drawLower(ctx,near){ctx.drawImage(lower,0,near-end);},
   drawDeck(ctx,near){ctx.drawImage(deck,0,near-end);},
   drawForeground(ctx,near){ctx.drawImage(walls,0,near-end);},
   cacheCount:4
  });
 }
 const api=Object.freeze({SPEC,create,renderer});if(typeof module==='object'&&module.exports)module.exports=api;else root.GaryBridge=api;
})(typeof window==='object'?window:globalThis);
