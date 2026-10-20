/* Registered bridge artwork pipeline. Blockouts are review geometry, never production art. */
(function(root){'use strict';
 const REGISTRATION=Object.freeze({width:720,height:2000,drawWidth:360,drawHeight:1000,anchorX:180,anchorY:800,far:180,length:620,deckLeft:138,deckRight:222});
 const KEYS=Object.freeze(['lower','deck','foreground']);
 const ORDER=Object.freeze(['terrain-stream-banks','lower','water-occlusion','deck','actors-items','foreground']);
 function validatePack(pack){
  if(!pack||pack.schema!=='gary-bridge-art-pack-v1')throw Error('Unsupported bridge artwork pack');
  const r=pack.registration;
  for(const key of Object.keys(REGISTRATION))if(r?.[key]!==REGISTRATION[key])throw Error('Bridge registration mismatch: '+key);
  const p=pack.candidate;
  if(pack.approved!==false||p?.approved!==false||p?.status!=='PROVISIONAL_NEEDS_VISUAL_APPROVAL')throw Error('Candidate must remain unapproved');
  if(p.sideFaceTop?.join(',')!=='112,248')throw Error('Invalid provisional side-face placement');
  if(!Number.isFinite(p.sideFaceOutset)||p.sideFaceOutset<20||p.sideFaceOutset>44)throw Error('Invalid provisional side-face outset');
  if(p.structureRevision!=='connected-arcade-v2'||JSON.stringify(p.archSpans)!=='[[236,384],[416,564],[596,744]]'||p.soffitInset!==8)throw Error('Invalid structural candidate metadata');
  if(!Number.isFinite(p.heightProjection)||p.heightProjection<.1||p.heightProjection>1.6||!Number.isFinite(p.supportHeight)||p.supportHeight<32||p.supportHeight>96||!Number.isFinite(p.parapetHeight)||p.parapetHeight<0||p.parapetHeight>28)throw Error('Invalid blockout projection');
  for(const key of KEYS){const l=pack.layers?.[key];if(!l||l.sourceWidth!==720||l.sourceHeight!==2000||l.anchor?.join(',')!=='360,1600'||l.alpha!==true)throw Error('Layer registration mismatch: '+key);}
  return true;
 }
 async function loadImages(pack,ImageType){
  validatePack(pack);const images={};
  await Promise.all(KEYS.map(key=>new Promise((resolve,reject)=>{
   const im=new ImageType();im.onload=async()=>{try{await im.decode?.();if(im.naturalWidth!==720||im.naturalHeight!==2000)throw Error('Wrong-size artwork: '+key);images[key]=im;resolve();}catch(e){reject(e);}};
   im.onerror=()=>reject(Error('Artwork unavailable: '+key));im.src=pack.layers[key].path;
  })));
  return images;
 }
 // Side elevations share a single affine face map. No lane or ground projection changes.
 const SPANS=Object.freeze([[236,384],[416,564],[596,744]].map(Object.freeze));
 const SUPPORTS=Object.freeze([[180,236],[384,416],[564,596],[744,800]].map(Object.freeze));
 function sidePoint(pack,side,u,z){
  const depth=pack.candidate.supportHeight*pack.candidate.heightProjection;
  return [side<0?pack.candidate.sideFaceTop[0]-z/depth*pack.candidate.sideFaceOutset:pack.candidate.sideFaceTop[1]+z/depth*pack.candidate.sideFaceOutset,u+z];
 }
 function archPoints(pack,side,start,end,inset=0){
  const h=pack.candidate.supportHeight*pack.candidate.heightProjection,a=start+inset,b=end-inset;
  const spring=h*.72+inset*.25,crown=h*.24+inset;
  const pts=[sidePoint(pack,side,a,h+1),sidePoint(pack,side,a,spring)];
  for(let i=0;i<=32;i++){const angle=Math.PI*i/32,u=(a+b)/2-(b-a)/2*Math.cos(angle),z=spring-(spring-crown)*Math.sin(angle);pts.push(sidePoint(pack,side,u,z));}
  pts.push(sidePoint(pack,side,b,h+1));return pts;
 }
 function wingPoints(pack,side,u,direction){
  const height=pack.candidate.supportHeight*pack.candidate.heightProjection,inner=side<0?138:222;
  return [[inner,u],[inner+side*17,u+direction*44],sidePoint(pack,side,u+direction*36,height*.65),sidePoint(pack,side,u,height)];
 }
 function layout(pack,near=800){
  validatePack(pack);if(!Number.isFinite(near))throw Error('Invalid world position');
  const offset=near-800,depth=pack.candidate.supportHeight*pack.candidate.heightProjection;
  const piers=[];
  for(const side of [-1,1])for(const [a,b] of SUPPORTS){
   const points=[sidePoint(pack,side,a,0),sidePoint(pack,side,b,0),sidePoint(pack,side,b,depth),sidePoint(pack,side,a,depth)].map(([x,y])=>[x,y+offset]);
   piers.push({side,start:a,end:b,points,x:Math.min(...points.map(p=>p[0])),y:a+offset,w:pack.candidate.sideFaceOutset,h:b-a+depth});
  }
  return {deck:{x:138,y:near-620,w:84,h:620},depth,piers,spans:SPANS,
   returns:[-1,1].flatMap(side=>[[180,-1],[800,1]].map(([u,direction])=>wingPoints(pack,side,u,direction).map(([x,y])=>[x,y+offset]))),anchor:{x:180,y:near}};
 }
 function drawGuides(ctx,pack,near){
  const f=layout(pack,near);ctx.save();ctx.lineWidth=1;ctx.setLineDash([3,3]);
  ctx.strokeStyle='#f8d082';ctx.strokeRect(f.deck.x,f.deck.y,f.deck.w,f.deck.h);
  ctx.strokeStyle='#f7a08b';for(const p of f.piers){ctx.beginPath();p.points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.stroke();}
  for(const points of f.returns){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.stroke();}
  ctx.strokeStyle='#8cf3da';ctx.beginPath();ctx.moveTo(174,f.anchor.y);ctx.lineTo(186,f.anchor.y);ctx.moveTo(180,f.anchor.y-6);ctx.lineTo(180,f.anchor.y+6);ctx.stroke();ctx.restore();
 }
 function create({makeCanvas,pack,images={},environment}){
  validatePack(pack);
  for(const key of Object.keys(images))if(!KEYS.includes(key))throw Error('Unknown artwork layer: '+key);
  // Validate the entire pack before allocating; a bad partial replacement cannot shift geometry.
  for(const key of KEYS){const im=images[key];if(im&&((im.naturalWidth||im.width)!==720||(im.naturalHeight||im.height)!==2000||im.complete===false))throw Error('Undecoded or wrong-size artwork: '+key);}
  const canvases={},layers={},height=pack.candidate.supportHeight*pack.candidate.heightProjection,lift=pack.candidate.parapetHeight*pack.candidate.heightProjection;
  const canvas=()=>{const c=makeCanvas();c.width=720;c.height=2000;return c;};
  const poly=(c,points,color)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();};
  for(const key of KEYS){const c=canvas();canvases[key]=c;const g=c.getContext('2d');g.scale(2,2);
   if(key==='lower'){
    // One continuous spandrel per side. Three true cut-through openings share
    // connected crowns and piers; no detached rectangles are stacked on the face.
    for(const side of [-1,1]){
     const point=(u,z)=>sidePoint(pack,side,u,z);
     poly(g,[point(180,0),point(800,0),point(800,height),point(180,height)],side<0?'#926553':'#785247');
     for(const [a,b] of SPANS){
      const outer=archPoints(pack,side,a,b),inner=archPoints(pack,side,a,b,8);
      // Recess band is actual soffit area, with a transparent interior behind it.
      poly(g,outer,'#3e3431');
      g.save();g.globalCompositeOperation='destination-out';poly(g,inner,'#000');g.restore();
      g.beginPath();outer.slice(1,-1).forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.strokeStyle='#bd9275';g.lineWidth=2.5;g.stroke();
     }
     const deckEdge=side<0?138:222,facadeEdge=side<0?112:248;
     poly(g,[[deckEdge,180],[deckEdge,800],[facadeEdge,800],[facadeEdge,180]],'#9c7c63');
     // Continuous string course joins the arch crowns immediately under the deck.
     poly(g,[point(180,0),point(800,0),point(800,7),point(180,7)],'#b18b70');
     // Battered foundations and pointed cutwaters grow from the same pier map.
     for(const [a,b] of SUPPORTS){
      const topA=point(a,height-7),topB=point(b,height-7),baseB=point(b+3,height+8),nose=point((a+b)/2,height+11),baseA=point(a-3,height+8);
      nose[0]+=side*5;poly(g,[topA,topB,baseB,nose,baseA],side<0?'#745446':'#5e453d');
      poly(g,[topA,topB,point(b,height-3),point(a,height-3)],'#a17c60');
     }
     // End abutment returns flare into the banks, connecting the wing to the span.
     for(const [u,direction] of [[180,-1],[800,1]]){
      poly(g,wingPoints(pack,side,u,direction),side<0?'#89634f':'#6c4e42');
     }
    }
   }else if(key==='deck'){
    poly(g,[[105,0],[255,0],[255,30],[222,180],[222,800],[255,950],[255,1000],[105,1000],[105,950],[138,800],[138,180],[105,30]],'#9a9282');
    g.fillStyle='#c3b69e';g.fillRect(138,180,84,620);
    g.strokeStyle='#817969';g.lineWidth=1;
    for(let y=180;y<=800;y+=52){g.beginPath();g.moveTo(139,y);g.lineTo(221,y);g.stroke();}
    g.strokeRect(138.5,180.5,83,619);
   }else{
    for(const x of [117,223]){
     g.fillStyle='#885547';g.fillRect(x,180-lift,15,620+lift);
     poly(g,[[x+12,180-lift],[x+20,180],[x+20,800],[x+12,800-lift]],'#593d36');
     poly(g,[[x-2,180-lift],[x+12,180-lift],[x+17,184-lift],[x+17,800-lift],[x-2,800-lift]],'#d0c1a5');
     for(const y of [180,788]){g.fillStyle='#895746';g.fillRect(x-4,y-lift,25,lift+12);g.fillStyle='#ddceb2';g.fillRect(x-6,y-lift-5,29,7);}
    }
   }
   if(images[key]){g.save();g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='source-in';g.drawImage(images[key],0,0);g.restore();}
   layers[key]=c;
  }
  // Environment masks are NEVER delivered as structural artwork.
  const water=canvas(),banks=canvas(),wc=water.getContext('2d'),bc=banks.getContext('2d');wc.scale(2,2);bc.scale(2,2);
  for(const y of [285,685])for(const [x,w] of [[0,101],[259,101]]){bc.fillStyle='#56624a';bc.fillRect(x,y,w,22);}
  const contacts=[];
  for(const side of [-1,1])for(const [a,b] of SUPPORTS){
   if(a+height<300||b+height>680)continue;
   const point=(u,z)=>sidePoint(pack,side,u,z),mid=(a+b)/2;
   // The waterline follows the sloping foundation instead of a rectangular wipe.
   // Cached depth bands cover the submerged plinth; contact highlights stay outside.
   for(let i=0;i<8;i++){
    const z0=height-13+i*3,z1=z0+3,at=mid+(z0+z1)/2;
    const t=(at-300)/380,first=t<=.45,f=first?t/.45:(t-.45)/.55;
    const colA=first?[49,78,75]:[82,118,108],colB=first?[82,118,108]:[44,73,70];
    const rgb=colA.map((v,k)=>Math.round(v+(colB[k]-v)*f)).join(',');
    const p0=point(a-5,z0),p1=point(b+5,z0),p2=point(b+5,z1),p3=point(a-5,z1);
    p0[0]+=side*5;p1[0]+=side*5;p2[0]+=side*5;p3[0]+=side*5;
    poly(wc,[p0,p1,p2,p3],'rgba('+rgb+','+Math.min(1,(i+1)/4)+')');
   }
   const sample=point(mid,height+4);sample[0]+=side*2;
   const p=point(a,height-4),q=point(b,height-4);p[0]+=side*3;q[0]+=side*3;
   contacts.push(Object.freeze({side,start:a,end:b,x:sample[0]-10,y:sample[1]-2,w:22,sample:Object.freeze({x:sample[0],y:sample[1]}),edge:Object.freeze([p,q])}));
  }
  const blit=(ctx,image,near)=>ctx.drawImage(image,0,near-800,360,1000);
  return Object.freeze({
   mode:'UNAPPROVED_BLOCKOUT',registration:REGISTRATION,order:ORDER,cacheCount:5,
   templates:Object.freeze(canvases),waterMask:water,contacts:Object.freeze(contacts),
   drawWater(ctx,near,clock){environment.drawWater(ctx,near,clock);blit(ctx,banks,near);},
   drawLower(ctx,near){blit(ctx,layers.lower,near);},
   drawWaterOcclusion(ctx,near,clock){blit(ctx,water,near);ctx.save();ctx.strokeStyle='rgba(156,185,167,.5)';ctx.lineWidth=1;const shift=Math.sin(clock*2)*1.5;for(const p of contacts){const x=p.sample.x+shift,y=p.sample.y+near-800;ctx.beginPath();ctx.moveTo(x-6,y);ctx.quadraticCurveTo(x,y+2,x+6,y);ctx.stroke();}ctx.restore();},
   drawDeck(ctx,near){blit(ctx,layers.deck,near);},
   drawForeground(ctx,near){blit(ctx,layers.foreground,near);}
  });
 }
 const api=Object.freeze({REGISTRATION,KEYS,ORDER,validatePack,loadImages,layout,sidePoint,archPoints,drawGuides,create});if(typeof module==='object'&&module.exports)module.exports=api;else root.GaryBridgeArt=api;
})(typeof window==='object'?window:globalThis);
