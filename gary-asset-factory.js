/* Gary Eats! Asset Factory — pure reusable silhouette/projection registration.
   Browser preview is a design overlay, never a gameplay renderer or art approval. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.GaryAssetFactory=api;
})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  const finite=n=>typeof n==='number'&&Number.isFinite(n);
  const point=(w,h,x,y)=>[w*x,h*y];
  const poly=(w,h,points)=>points.map(([x,y])=>point(w,h,x,y));
  function geometry(spec){
    const w=spec.draw.width,h=spec.draw.height;
    if(!(w>0&&h>0))throw Error('Invalid draw dimensions');
    let solids=[],guides=[];
    switch(spec.id){
      case 'victorian-frontage':
        solids=[
          poly(w,h,[[.07,.05],[.93,.05],[.96,.10],[.96,.975],[.04,.975],[.04,.10]]),
          poly(w,h,[[.12,.018],[.88,.018],[.94,.05],[.06,.05]])];
        guides=[
          poly(w,h,[[.15,.18],[.85,.18],[.85,.28],[.15,.28]]),
          poly(w,h,[[.16,.34],[.48,.34],[.48,.78],[.16,.78]]),
          poly(w,h,[[.56,.34],[.84,.34],[.84,.78],[.56,.78]]),
          poly(w,h,[[.39,.81],[.63,.81],[.63,.975],[.39,.975]])];
        break;
      case 'stone-bridge-pier':
        solids=[
          poly(w,h,[[.13,.045],[.87,.045],[.92,.095],[.92,.975],[.08,.975],[.08,.095]]),
          poly(w,h,[[.06,.038],[.83,.038],[.94,.085],[.13,.085]])];
        guides=[
          ...[.22,.38,.54,.7,.86].map(y=>poly(w,h,[[.10,y],[.90,y]])),
          poly(w,h,[[.47,.10],[.47,.22]]),poly(w,h,[[.6,.38],[.6,.54]])];
        break;
      case 'victorian-lamppost':
        solids=[
          poly(w,h,[[.38,.225],[.62,.225],[.55,.944],[.45,.944]]),
          poly(w,h,[[.16,.07],[.36,.035],[.64,.035],[.84,.07],[.75,.22],[.25,.22]]),
          poly(w,h,[[.35,.018],[.65,.018],[.65,.058],[.35,.058]]),
          poly(w,h,[[.34,.925],[.66,.925],[.77,.975],[.23,.975]])];
        guides=[
          poly(w,h,[[.31,.10],[.69,.10],[.62,.18],[.38,.18]]),
          poly(w,h,[[.50,.24],[.50,.92]])];
        break;
      case 'bridge-deck-tile':
        // A true screen-parallel constant-width strip. Never narrow the far end.
        solids=[poly(w,h,[[.05,.045],[.95,.045],[.95,.972],[.05,.972]])];
        guides=[...[.25,.50,.75].map(y=>poly(w,h,[[.05,y],[.95,y]])),
          poly(w,h,[[.50,.045],[.50,.972]])];
        break;
      case 'bridge-parapet-left':
      case 'bridge-parapet-right':
        // Both parapets have constant width. Deliberately NOT mirrored art.
        solids=[poly(w,h,[[.13,.045],[.87,.045],[.87,.974],[.13,.974]])];
        guides=[...[.20,.36,.52,.68,.84].map(y=>poly(w,h,[[.13,y],[.87,y]])),
          poly(w,h,[[.50,.045],[.50,.974]])];
        break;
      case 'ground-decay-patch':
        solids=[poly(w,h,[[.10,.08],[.34,.06],[.75,.06],[.94,.20],[.94,.65],[.81,.92],[.40,.94],[.06,.76],[.06,.34]])];
        guides=[poly(w,h,[[.25,.19],[.61,.14],[.76,.33]]),
                poly(w,h,[[.15,.67],[.39,.75],[.73,.69]])];
        break;
      default:throw Error('Unknown template id: '+spec.id);
    }
    return {solids,guides};
  }
  function path(ctx,points){
    ctx.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
    ctx.closePath();
  }
  function shapePath(ctx,g){
    ctx.beginPath();for(const p of g.solids)path(ctx,p);
  }
  function draw(ctx,spec,options={}){
    const g=geometry(spec),type=options.mode||'template';
    ctx.save();
    if(type==='mask'){
      ctx.fillStyle='#fff';shapePath(ctx,g);ctx.fill();
    }else if(type==='clip'&&options.image){
      shapePath(ctx,g);ctx.clip();
      ctx.drawImage(options.image,0,0,spec.draw.width,spec.draw.height);
    }else{
      ctx.fillStyle=type==='outline'?'rgba(0,0,0,0)':
        spec.profile==='ground'?'rgba(85,122,86,.50)':
        spec.profile==='freestanding'?'rgba(91,108,114,.55)':
        'rgba(173,140,103,.54)';
      shapePath(ctx,g);if(type!=='outline')ctx.fill();
      ctx.lineWidth=1.2;ctx.strokeStyle='#ffd991';
      for(const p of g.solids){ctx.beginPath();path(ctx,p);ctx.stroke();}
      if(type==='template'){
        ctx.lineWidth=.75;ctx.strokeStyle='rgba(50,65,59,.65)';
        for(const p of g.guides){ctx.beginPath();path(ctx,p);ctx.stroke();}
      }
    }
    ctx.restore();
  }
  function validate(contract,camera){
    const errors=[];
    if(contract?.schema!=='gary-eats-asset-factory-v1')errors.push('Wrong asset factory schema');
    if(camera?.schema!=='gary-eats-visual-camera-v1')errors.push('Camera contract missing');
    if(camera?.world?.width!==360||camera?.world?.height!==640)errors.push('World dimensions differ from active camera');
    if(camera?.world?.roadLeft!==105||camera?.world?.roadRight!==255)errors.push('World footprint drift');
    if(!Array.isArray(contract?.templates)||contract.templates.length<3)errors.push('Missing template fixtures');
    const ids=new Set();
    for(const a of contract?.templates||[]){
      if(!a.id||ids.has(a.id))errors.push('Missing or repeated asset id');ids.add(a.id);
      if(!contract.profiles?.[a.profile])errors.push('Unknown profile: '+a.profile);
      const s=a.source,d=a.draw;
      if(!s||!d||![s.width,s.height,d.x,d.y,d.width,d.height].every(finite)||
        s.width<=0||s.height<=0||d.width<=0||d.height<=0)errors.push('Invalid size: '+a.id);
      else if(Math.abs(s.width*d.height-s.height*d.width)>.0001)errors.push('Source-to-draw aspect ratio mismatch: '+a.id);
      if(!a.anchor||![a.anchor.x,a.anchor.y].every(v=>finite(v)&&v>=0&&v<=1))errors.push('Invalid anchor: '+a.id);
      if(!Number.isInteger(a.paddingPx)||a.paddingPx<4)errors.push('Invalid alpha padding: '+a.id);
      if(a.approval!=='CANDIDATE')errors.push('Template incorrectly marked approved: '+a.id);
    }
    if(camera?.profiles?.['raised-architecture']?.status!=='PROVISIONAL_NEEDS_VISUAL_APPROVAL')
      errors.push('Raised projection approval state unexpectedly changed');
    return {ok:errors.length===0,errors};
  }
  function registration(spec,camera){
    return {schema:'gary-eats-asset-registration-candidate-v1',assetId:spec.id,
      profile:spec.profile,source:spec.source,draw:spec.draw,anchor:spec.anchor,
      layer:spec.layer,paddingPx:spec.paddingPx,cameraSchema:camera.schema,
      worldCanvas:[camera.world.width,camera.world.height],
      footprintStatus:'CODE_MEASURED_OR_STATED_FIXTURE',perspective:'UNVERIFIED_VISUAL',
      registered:false,approved:false,phoneTested:false,collision:'NOT_DEFINED',
      gameplayAssetPath:null};
  }
  function inspect(imageData,maskData,spec,mime){
    const fails=[],width=imageData.width,height=imageData.height;
    if(mime!=='image/png')fails.push('Input must be a transparent PNG, not JPEG/WebP');
    if(width!==spec.source.width||height!==spec.source.height)fails.push('Wrong source dimensions');
    if(!maskData||maskData.width!==width||maskData.height!==height)fails.push('Invalid geometry mask');
    if(fails.length)return {pass:false,failures:fails,alpha:'UNVERIFIED'};
    const p=imageData.data,m=maskData.data;
    let opaque=0,outside=0,transparent=0,groundFoot=-1;
    let x1=width,y1=height,x2=-1,y2=-1;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const i=(y*width+x)*4,a=p[i+3];
      if(a<=8){transparent++;continue;}
      opaque++;
      if(m[i+3]<=8)outside++;
      x1=Math.min(x,x1);x2=Math.max(x,x2);y1=Math.min(y,y1);y2=Math.max(y,y2);
      if(Math.abs(x-(spec.anchor.x*width))<=Math.max(4,width*.16))groundFoot=Math.max(groundFoot,y);
    }
    if(opaque===0)fails.push('Empty image');
    if(transparent===0)fails.push('No genuinely transparent pixels');
    if(opaque&&outside/opaque>.015)fails.push('Painted geometry exceeds approved silhouette');
    if(spec.anchor.y>=.9&&groundFoot>=0&&
      groundFoot<height-spec.footTolerancePx-spec.paddingPx)fails.push('Foot baseline does not reach declared anchor');
    if(x1<spec.paddingPx||y1<spec.paddingPx||
      x2>=width-spec.paddingPx||y2>=height-spec.paddingPx)
      fails.push('Visible pixels intrude on transparent safe padding');
    return {pass:fails.length===0,failures:fails,opaquePixels:opaque,transparentPixels:transparent,
      outsideMaskPixels:outside,outsidePercent:opaque?Number((100*outside/opaque).toFixed(3)):0,
      bounds:opaque?{x:x1,y:y1,w:x2-x1+1,h:y2-y1+1}:null,
      perspective:'UNVERIFIED_VISUAL',iphone:'UNVERIFIED_ON_DEVICE'};
  }
  return Object.freeze({geometry,draw,validate,registration,inspect});
});
