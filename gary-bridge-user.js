/* Gary Eats! owner-approved stone bridge; independent cross-stream, banks and entrance. */
(function(root){'use strict';
const SPEC=Object.freeze({source:'art/candidates/bridge/bridge-user-supplied.webp?v=20261024',sourceWidth:174,sourceHeight:620,far:180,end:800,deck:[138,222],road:[105,255],x:93,width:174,waterLeft:[0,101],waterRight:[259,360],tileHeight:256,threshold:26,wingLength:52});
function create({makeCanvas,ImageType}={}){
 if(typeof makeCanvas!=='function'||typeof ImageType!=='function')throw Error('Bridge dependencies unavailable');
 const image=new ImageType();let loaded=false,reason='pending';
 // Owner-approved road-to-bridge masonry, extracted from the approved 24 Oct
 // 2026 entrance composition. This is a world-locked 1:1 game-unit overlay,
 // never a stretched or whole-scene replacement. Old sill/wings are fallback.
 const entranceImage=new ImageType();let entranceReady=false;
 entranceImage.onload=()=>{entranceReady=entranceImage.naturalWidth===176&&entranceImage.naturalHeight===88;};
 entranceImage.onerror=()=>{entranceReady=false;};
 entranceImage.src='art/bridge/entrance/entrance-seam.png?v=20261025a';
 // Independently registered transparent shoreline sprites cut from the owner-
 // approved bridge composition. Exact world anchors are shared with near.
 const bankImages=['left','right'].map(side=>{
  const art=new ImageType();art.loaded=false;
  art.onload=()=>{art.loaded=art.naturalWidth===110&&art.naturalHeight===245;};
  art.onerror=()=>{art.loaded=false;};
  art.src='art/bridge/approved-shore/'+side+'_riverbank_approved.png?v=20261025b';
  return art;
 });
 function drawBanks(ctx,near){
  if(!loaded||!Number.isFinite(near))return false;
  for(let i=0;i<2;i++){
   const art=bankImages[i];
   if(art.loaded)ctx.drawImage(art,i===0?0:250,near-231,110,245);
  }
  return bankImages.every(art=>art.loaded);
 }
 const canvas=(width,height)=>{const c=makeCanvas();c.width=width;c.height=height;return c;};
 // All textured passes are built once. No image allocations in gameplay frames.
 const water=canvas(360,256),w=water.getContext('2d');
 // A restrained, cached painted-water texture. Its colour and broad current
 // shapes use the owner-approved teal river as their reference. It remains a
 // standalone moving water pass; NO shoreline or masonry is baked into it.
 const g=w.createLinearGradient(0,0,360,0);
 g.addColorStop(0,'#194e65');g.addColorStop(.22,'#286d80');
 g.addColorStop(.53,'#24677d');g.addColorStop(.80,'#287187');g.addColorStop(1,'#1c5267');
 w.fillStyle=g;w.fillRect(0,0,360,256);
 // Broad washes underneath narrow animated ripples, all prerendered.
 for(let i=0;i<70;i++){
  const x=(i*157+11)%382-11,y=(i*73+41)%256,rx=17+(i*19)%48;
  w.strokeStyle=i%3===0?'rgba(139,199,199,.085)':'rgba(13,56,76,.085)';
  w.lineWidth=2+(i%4)*1.2;w.beginPath();w.moveTo(x-rx,y+1);
  w.bezierCurveTo(x-rx*.36,y-3,x+rx*.3,y+4,x+rx,y-1);w.stroke();
 }
 // Submerged slate stones are intentionally low-contrast and few in number.
 // Paint them once into the moving-water cache (not a separate game obstacle).
 for(let i=0;i<14;i++){
  const x=(i*137+37)%356,y=(i*89+49)%252,rx=4+(i*3)%10,ry=2.4+(i%4)*1.4;
  const shade=w.createRadialGradient(x-1,y-1,1,x,y,rx*1.9);
  shade.addColorStop(0,'rgba(100,140,149,.27)');
  shade.addColorStop(.55,'rgba(62,105,121,.19)');
  shade.addColorStop(1,'rgba(18,76,98,0)');
  w.fillStyle=shade;w.beginPath();w.ellipse(x,y,rx*1.9,ry*2.2,0,0,Math.PI*2);w.fill();
  w.fillStyle='rgba(75,116,130,.31)';w.beginPath();w.ellipse(x,y,rx,ry,-.15,0,Math.PI*2);w.fill();
  w.strokeStyle='rgba(144,193,191,.23)';w.lineWidth=.8;
  w.beginPath();w.ellipse(x-1,y-1,rx,ry,-.15,Math.PI*1.08,Math.PI*1.89);w.stroke();
 }
 for(let i=0;i<360;i++){
  const x=(i*97+17)%360,y=(i*71+33)%256,rx=4+(i*13)%30;
  w.lineWidth=i%7===0?1.4:.7;
  w.strokeStyle=i%11===0?'rgba(204,231,222,.36)':i%3===0?'rgba(136,193,197,.23)':'rgba(10,62,84,.19)';
  w.beginPath();w.moveTo(x-rx/2,y);w.quadraticCurveTo(x,y-2.4,x+rx/2,y);w.stroke();
 }
 const shore=canvas(360,100),s=shore.getContext('2d');
 const soil=s.createLinearGradient(0,0,0,100);
 // Muted wet-earth contact is an unobtrusive substrate, NOT wilderness art.
 soil.addColorStop(0,'#3c4d4d');soil.addColorStop(.5,'#56594f');soil.addColorStop(1,'#626052');
 s.fillStyle=soil;s.fillRect(0,0,360,100);
 for(let i=0;i<230;i++){
  const x=(i*83+29)%360,y=(i*61+11)%100;
  s.fillStyle=i%7===0?'#89877a':i%3===0?'#3b4e49':i%2?'#696c5b':'#49564e';
  s.beginPath();s.ellipse(x,y,1.5+(i%5),1+(i%3),0,0,Math.PI*2);s.fill();
 }
 // One small cached 80-unit earth-toning wash. This gently breaks up the last
 // original cobbles near the shoreline without importing rejected wilderness
 // pixels or allocating gradients on each frame.
 const wear=canvas(1,80),wc=wear.getContext('2d');
 const wg=wc.createLinearGradient(0,0,0,80);
 wg.addColorStop(0,'rgba(53,57,52,.21)');
 wg.addColorStop(.44,'rgba(53,57,52,.075)');
 wg.addColorStop(1,'rgba(53,57,52,0)');
 wc.fillStyle=wg;wc.fillRect(0,0,1,80);
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
  // Shore texture lives ONLY on the two verges. Never paint a 360px
  // opaque green band over the road or over the bridge's narrow stone deck.
  ctx.save();ctx.beginPath();
  // The approved transparent bank replaces the old green shoreline at
  // this end. Keep the old strip only as a fallback if its image fails.
  for(const [x,width,side] of [[0,104,0],[256,104,1]]){
   ctx.rect(x,top-96,width,96);
   if(!bankImages[side].loaded)ctx.rect(x,bottom,width,96);
  }
  ctx.clip();
  ctx.drawImage(shore,0,top-92,360,100);
  ctx.save();ctx.translate(0,bottom+92);ctx.scale(1,-1);ctx.drawImage(shore,0,0,360,100);ctx.restore();
  ctx.restore();
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
   for(const [left,right,side] of [[0,101,0],[259,360,1]]){
    // The photographed bank PNG already owns its own contact foam: adding the
    // former straight game-water line below it creates a visible artificial rim.
    if(!isTop&&bankImages[side].loaded)continue;
    ctx.beginPath();
    for(let x=left;x<=right;x+=6){
     const y=(isTop?top:bottom)+edge(x,isTop);
     if(x===left)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.stroke();
   }
  }
  ctx.restore();
  return true;
 }
 // The original first-biome cobble texture and road remain authoritative
 // until their exact shared river/bridge contact line. This pass is drawn AFTER
 // the water, BELOW the unchanged bridge picture, using the same near value.
 // No separate scrolling offsets, warped pixels, new image or extra physics.
 function drawStreetTail(ctx,near,{drawCobbles,drawPavements,drawRoad}={}){
  if(!loaded||!Number.isFinite(near))return false;
  if(near>=640||near+100<=0)return true;
  if(typeof drawCobbles!=='function'||typeof drawPavements!=='function'||typeof drawRoad!=='function')return false;
  // Below near=500 the standard street already exists underneath the water.
  // Repaint only the 100-unit shoreline zone to avoid redundant full-screen
  // street texturing. Above 500 the main renderer skips the full high street:
  // extend this EXACT SAME native street through the bottom of the screen.
  const top=Math.max(0,Math.floor(near-16));
  const end=Math.min(640,near>=500?640:Math.ceil(near+102));
  if(end<=top)return true;
  const bank=(left,right)=>{
   ctx.save();ctx.beginPath();
   // Preserve a variable 3–9-unit strip of wet earth between running water
   // and paving, then very gently tone the next 80 units of original cobbles.
   // When the approved shoreline image is present, extend the ORIGINAL
   // street cobbles slightly behind its feathered lower edge. Otherwise the
   // former river-water cutoff shines through as a turquoise horizontal seam.
   const hasArt=bankImages[0].loaded&&bankImages[1].loaded;
   const landEdge=x=>hasArt
     ?near-14+edge(x,false)*.22+2*Math.sin(x*.093+2.7)
     :near+edge(x,false)+6+3*Math.sin(x*.093+2.7);
   ctx.moveTo(left,end);ctx.lineTo(left,landEdge(left));
   for(let x=left+6;x<right;x+=6)ctx.lineTo(x,landEdge(x));
   ctx.lineTo(right,landEdge(right));ctx.lineTo(right,end);
   ctx.closePath();ctx.clip();
   drawCobbles(left,top,right-left,end-top,'base');
   ctx.drawImage(wear,left,near+5,right-left,80);
   ctx.restore();
  };
  bank(0,SPEC.road[0]);bank(SPEC.road[1],360);
  // The 150-unit original asphalt reaches the stone sill; never paint a
  // tapering cobblestone carpet across it. Two narrow kerbs stay registered.
  const asphaltY=Math.max(0,Math.floor(near));
  if(asphaltY<end){
   ctx.save();ctx.beginPath();ctx.rect(SPEC.road[0]-3,asphaltY,156,end-asphaltY);ctx.clip();
   drawPavements();drawRoad();
   ctx.restore();
   // Bridge entrance curb stones continue the real high-street stone edges.
   // They are deliberately OUTSIDE x105..255, never across the walkable road.
   const stoneStart=Math.max(asphaltY,near+3);
   for(const x of [99,255]){
    ctx.save();ctx.beginPath();ctx.rect(x,stoneStart,6,Math.max(0,end-stoneStart));ctx.clip();
    ctx.fillStyle='#777772';ctx.fillRect(x,stoneStart,6,end-stoneStart);
    ctx.fillStyle='rgba(31,38,40,.3)';ctx.fillRect(x+5,stoneStart,1,end-stoneStart);
    ctx.fillStyle='rgba(212,204,179,.19)';ctx.fillRect(x,stoneStart,1,end-stoneStart);
    const phase=Math.floor((stoneStart-near)/27);
    for(let k=phase-1;k<phase+26;k++){
     const yy=near+k*27;
     ctx.fillStyle='rgba(23,28,29,.56)';ctx.fillRect(x,yy,6,1.4);
     ctx.fillStyle='rgba(173,170,150,.19)';ctx.fillRect(x,yy+2,5,1);
    }
    ctx.restore();
   }
   // A dusting of fine stone grit under the abutment, not a cobbled ramp.
   ctx.save();ctx.beginPath();ctx.rect(105,near-3,150,17);ctx.clip();
   for(let i=0;i<92;i++){
    const xx=106+(i*43)%147,yy=near+(i*17)%15-2;
    const dx=Math.min(Math.abs(xx-138),Math.abs(xx-222));
    if(xx>142&&xx<218&&i%5!==0)continue;
    ctx.fillStyle=i%4===0?'rgba(165,153,130,.3)':'rgba(22,30,34,.22)';
    ctx.fillRect(xx,yy,.6+(i%3)*.45,.6+(i%2)*.6);
   }
   ctx.restore();
  }
  return true;
 }
 // Only two SHORT 26-unit stone sills. Existing asphalt stays asphalt beyond
 // each sill; no 150-unit cropped-cobble trapezoids or stretched bridge pixels.
 function drawSill(ctx,top,isExit){
  const y=isExit?top-SPEC.threshold:top+620;
  ctx.save();
  ctx.fillStyle='rgba(27,34,34,.17)';
  ctx.fillRect(138,y+SPEC.threshold-3,84,6);
  // Sample the same original bridge image instead of inventing a new stone scale.
  ctx.drawImage(image,45,228,84,28,138,y,84,SPEC.threshold);
  ctx.strokeStyle='rgba(32,38,37,.33)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(138,y+.5);ctx.lineTo(222,y+.5);ctx.stroke();
  ctx.restore();
 }
 // Two compact architectural wing-walls, beneath the existing bridge picture.
 // They occupy outer margins only: the straight x138..222 gameplay deck never
 // narrows further and the central asphalt is not replaced with cobblestones.
 function drawWingPair(ctx,top,isExit){
  const seam=isExit?top:top+620,dir=isExit?-1:1,far=seam+dir*SPEC.wingLength;
  for(const right of [false,true]){
   const p=right
    ?[[224,seam-dir*7],[222,seam+dir*5],[253,far],[261,far],[243,seam+dir*3]]
    :[[136,seam-dir*7],[138,seam+dir*5],[107,far],[99,far],[117,seam+dir*3]];
   ctx.save();ctx.beginPath();
   for(let i=0;i<p.length;i++)i?ctx.lineTo(p[i][0],p[i][1]):ctx.moveTo(p[i][0],p[i][1]);
   ctx.closePath();ctx.clip();
   const bx=right?222:99,by=Math.min(seam,far)-8;
   ctx.fillStyle='#696d64';ctx.fillRect(bx,by,40,SPEC.wingLength+16);
   ctx.drawImage(image,right?130:26,303,20,66,bx,by,40,SPEC.wingLength+16);
   ctx.restore();
   ctx.save();ctx.strokeStyle='rgba(36,40,38,.57)';ctx.lineWidth=1.1;
   ctx.beginPath();for(let i=0;i<p.length;i++)i?ctx.lineTo(p[i][0],p[i][1]):ctx.moveTo(p[i][0],p[i][1]);ctx.closePath();ctx.stroke();ctx.restore();
  }
 }
 // Existing bridge is the single authoritative source of walkway stones.
 // The entrance image contains a foreign cobblestone lip across the road.
 // Retain ONLY its outer masonry at x92..138 and x222..268, aligned to
 // the SAME near coordinate, and never draw its central x138..222 portion.
 function drawEntranceMasonry(ctx,near){
  if(!entranceReady)return false;
  ctx.save();
  // Side sections of the 176x88 source share the fixed 360-unit coordinates.
  // No centre strip, no scale, no new stone material, no screen-space drift.
  ctx.drawImage(entranceImage,0,0,46,88,92,near-13,46,88);
  ctx.drawImage(entranceImage,130,0,46,88,222,near-13,46,88);
  ctx.restore();
  return true;
 }
 function drawDeck(ctx,near){
  if(!loaded)return false;const top=topY(near);
  if(!entranceReady)drawWingPair(ctx,top,false);
  drawWingPair(ctx,top,true);
  ctx.drawImage(image,SPEC.x,top,SPEC.width,620);
  if(entranceReady)drawEntranceMasonry(ctx,near);
  // Preserve a stone-free centre contact at the end of the original deck.
  // The native asphalt is already drawn below through drawStreetTail().
  // Exit retains its previous short sill until a separate exit treatment
  // is designed and validated against the wilderness ground.
  drawSill(ctx,top,true);
  return true;
 }
 function drawFront(ctx,near){
  if(!loaded)return false;const top=topY(near);
  ctx.save();ctx.beginPath();ctx.rect(0,top,138,620);ctx.rect(222,top,138,620);ctx.clip();
  ctx.drawImage(image,SPEC.x,top,SPEC.width,620);ctx.restore();return true;
 }
 return Object.freeze({ready:()=>loaded,reason:()=>reason,entranceReady:()=>entranceReady,banksReady:()=>bankImages.every(art=>art.loaded),drawWater,drawStreetTail,drawBanks,drawDeck,drawFront,SPEC});
}
const api=Object.freeze({SPEC,create});if(typeof module==='object'&&module.exports)module.exports=api;else root.GaryUserBridge=api;
})(typeof window==='object'?window:globalThis);
