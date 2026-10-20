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
 function layout(pack,near=800){
  validatePack(pack);if(!Number.isFinite(near))throw Error('Invalid world position');
  const offset=near-800,depth=pack.candidate.supportHeight*pack.candidate.heightProjection;
  return {deck:{x:138,y:near-620,w:84,h:620},depth,
   piers:[180,370,526,682,800].flatMap(y=>[{x:98,y:y+offset,w:43,h:depth},{x:219,y:y+offset,w:43,h:depth}]),
   fascia:{x:138,y:near,w:84,h:depth},anchor:{x:180,y:near}};
 }
 function drawGuides(ctx,pack,near){
  const f=layout(pack,near);ctx.save();ctx.lineWidth=1;ctx.setLineDash([3,3]);
  ctx.strokeStyle='#f8d082';ctx.strokeRect(f.deck.x,f.deck.y,f.deck.w,f.deck.h);
  ctx.strokeStyle='#f7a08b';for(const p of f.piers)ctx.strokeRect(p.x,p.y,p.w,p.h);
  ctx.strokeRect(f.fascia.x,f.fascia.y,f.fascia.w,f.fascia.h);
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
    // Deep side faces and repeated piers. Flat diagnostic colours, no brick texture.
    for(const [x,w] of [[101,37],[222,37]]){
     g.fillStyle='#785248';g.fillRect(x,180,w,620+height);
     // Exterior arch recesses are cut from the side silhouette, not filled with scenery.
     for(let y=214;y<750;y+=156){
      const outer=x<180?x:x+w,inner=x<180?x+w-7:x+7;
      g.save();g.globalCompositeOperation='destination-out';g.beginPath();g.moveTo(outer,y+height);g.lineTo(outer,y+114+height);g.bezierCurveTo(inner,y+100+height,inner,y+14+height,outer,y+height);g.closePath();g.fill();g.restore();
      g.strokeStyle='#bc8b70';g.lineWidth=5;g.beginPath();g.moveTo(outer,y+height);g.bezierCurveTo(inner,y+14+height,inner,y+100+height,outer,y+114+height);g.stroke();
     }
     for(const y of [180,370,526,682,800]){
      g.fillStyle='#4d3934';g.fillRect(x-3,y,w+6,height);
      poly(g,[[x-3,y],[x+w+3,y],[x+w,y-6],[x,y-6]],'#b88c72');
      g.fillStyle='#91634f';g.fillRect(x-3,y,7,height);
     }
    }
    // Exposed near fascia extends BELOW the deck; its outline remains a candidate.
    g.fillStyle='#63473f';g.fillRect(138,800,84,height);g.fillStyle='#98705a';g.fillRect(138,800,84,8);
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
  for(const y of [180,370,526,682,800]){
   const foot=y+height;if(foot<300||foot>680)continue;
   for(const [x,w] of [[98,43],[219,43]]){
    const t=(foot-300)/380,first=t<=.45,f=first?t/.45:(t-.45)/.55;
    const a=first?[49,78,75]:[82,118,108],b=first?[82,118,108]:[44,73,70];
    const rgb=a.map((v,i)=>Math.round((v+(b[i]-v)*f)*.77+[15,29,27][i]*.23)).join(',');
    const fade=wc.createLinearGradient(0,foot-16,0,foot+4);fade.addColorStop(0,'rgba('+rgb+',0)');fade.addColorStop(.65,'rgba('+rgb+',.85)');fade.addColorStop(1,'rgb('+rgb+')');wc.fillStyle=fade;wc.fillRect(x,foot-16,w,20);contacts.push(Object.freeze({x,y:foot,w}));
   }
  }
  const blit=(ctx,image,near)=>ctx.drawImage(image,0,near-800,360,1000);
  return Object.freeze({
   mode:'UNAPPROVED_BLOCKOUT',registration:REGISTRATION,order:ORDER,cacheCount:5,
   templates:Object.freeze(canvases),waterMask:water,contacts:Object.freeze(contacts),
   drawWater(ctx,near,clock){environment.drawWater(ctx,near,clock);blit(ctx,banks,near);},
   drawLower(ctx,near){blit(ctx,layers.lower,near);},
   drawWaterOcclusion(ctx,near,clock){blit(ctx,water,near);ctx.save();ctx.strokeStyle='#9cb9a7';ctx.lineWidth=1;const shift=Math.sin(clock*2)*2;for(const p of contacts){const y=near-800+p.y;ctx.beginPath();ctx.moveTo(p.x+4+shift,y);ctx.quadraticCurveTo(p.x+p.w/2,y+2,p.x+p.w-4+shift,y);ctx.stroke();}ctx.restore();},
   drawDeck(ctx,near){blit(ctx,layers.deck,near);},
   drawForeground(ctx,near){blit(ctx,layers.foreground,near);}
  });
 }
 const api=Object.freeze({REGISTRATION,KEYS,ORDER,validatePack,loadImages,layout,drawGuides,create});if(typeof module==='object'&&module.exports)module.exports=api;else root.GaryBridgeArt=api;
})(typeof window==='object'?window:globalThis);
