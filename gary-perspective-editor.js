/* Gary Eats! non-destructive asset perspective editor geometry.
   Authoring only. No DOM, browser storage or gameplay dependency. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.GaryPerspectiveEditor=api;
})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  const n=v=>typeof v==='number'&&Number.isFinite(v);
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const copy=v=>JSON.parse(JSON.stringify(v));
  const corners=r=>[
    {x:r.x,y:r.y},{x:r.x+r.w,y:r.y},
    {x:r.x+r.w,y:r.y+r.h},{x:r.x,y:r.y+r.h}
  ];
  const quadArea=q=>q.reduce((s,p,i)=>{const b=q[(i+1)%4];return s+p.x*b.y-p.y*b.x;},0)/2;
  const cross=(a,b,c)=>(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);
  function validQuad(q,width,height,padding=0){
    if(!Array.isArray(q)||q.length!==4||!q.every(p=>n(p.x)&&n(p.y)&&
       p.x>=padding&&p.x<=width-padding&&p.y>=padding&&p.y<=height-padding))return false;
    const sign=Math.sign(cross(q[0],q[1],q[2]));
    if(sign<=0)return false;
    if(q.some((p,i)=>cross(p,q[(i+1)%4],q[(i+2)%4])<=.001))return false;
    return quadArea(q)>=16;
  }
  function boundsFromPixels(imageData){
    let minX=imageData.width,minY=imageData.height,maxX=-1,maxY=-1,count=0;
    const a=imageData.data;
    for(let y=0;y<imageData.height;y++)for(let x=0;x<imageData.width;x++){
      if(a[(y*imageData.width+x)*4+3]<9)continue;
      count++;
      minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
    }
    return count?{x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1,count}:null;
  }
  function quickQuad(bounds,{widthScale=1,heightScale=1,skew=0,topDepth=0}={},anchor){
    const baseX=anchor.x,baseY=anchor.y;
    const xs=[bounds.x,bounds.x+bounds.w];
    const topY=bounds.y,botY=bounds.y+bounds.h;
    // The ground anchor is invariant. Only top points can shift in y with depth.
    const x0=baseX+(xs[0]-baseX)*widthScale;
    const x1=baseX+(xs[1]-baseX)*widthScale;
    const y0=baseY+(topY-baseY)*heightScale-topDepth;
    const y1=baseY+(botY-baseY)*heightScale;
    return [
      {x:x0+skew,y:y0},{x:x1+skew,y:y0},
      {x:x1,y:y1},{x:x0,y:y1}
    ];
  }
  function interpolate(q,u,v){
    const w0=(1-u)*(1-v),w1=u*(1-v),w2=u*v,w3=(1-u)*v;
    return {x:q[0].x*w0+q[1].x*w1+q[2].x*w2+q[3].x*w3,
            y:q[0].y*w0+q[1].y*w1+q[2].y*w2+q[3].y*w3};
  }
  function paintTriangle(ctx,img,s,d){
    const A=s[0],B=s[1],C=s[2],X=d[0],Y=d[1],Z=d[2];
    const dx1=B.x-A.x,dy1=B.y-A.y,dx2=C.x-A.x,dy2=C.y-A.y;
    const det=dx1*dy2-dy1*dx2;
    if(Math.abs(det)<1e-9)return;
    const tx1=Y.x-X.x,tx2=Z.x-X.x,ty1=Y.y-X.y,ty2=Z.y-X.y;
    const a=(tx1*dy2-tx2*dy1)/det,c=(tx2*dx1-tx1*dx2)/det;
    const b=(ty1*dy2-ty2*dy1)/det,d=(ty2*dx1-ty1*dx2)/det;
    const e=X.x-a*A.x-c*A.y,f=X.y-b*A.x-d*A.y;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(X.x,X.y);ctx.lineTo(Y.x,Y.y);ctx.lineTo(Z.x,Z.y);ctx.closePath();ctx.clip();
    ctx.transform(a,b,c,d,e,f);
    ctx.drawImage(img,0,0);
    ctx.restore();
  }
  function warp(ctx,img,src,dst,subdivisions=8){
    if(!validQuad(dst,ctx.canvas.width,ctx.canvas.height,0))throw Error('Invalid destination face');
    if(!src||![src.x,src.y,src.w,src.h].every(n)||src.w<=0||src.h<=0)throw Error('Invalid source rectangle');
    if(!img||!Number.isInteger(subdivisions)||subdivisions<1||subdivisions>20)throw Error('Invalid image or mesh detail');
    const q=corners(src);
    const grid=[];
    for(let y=0;y<=subdivisions;y++){
      const row=[];
      for(let x=0;x<=subdivisions;x++){
        const u=x/subdivisions,v=y/subdivisions;
        row.push({s:interpolate(q,u,v),d:interpolate(dst,u,v)});
      }
      grid.push(row);
    }
    for(let y=0;y<subdivisions;y++)for(let x=0;x<subdivisions;x++){
      const a=grid[y][x],b=grid[y][x+1],c=grid[y+1][x+1],d=grid[y+1][x];
      paintTriangle(ctx,img,[a.s,b.s,c.s],[a.d,b.d,c.d]);
      paintTriangle(ctx,img,[a.s,c.s,d.s],[a.d,c.d,d.d]);
    }
  }
  function initial(spec){
    return {version:1,assetId:spec.id,mode:'whole',tool:'quick',anchorLock:true,
      quick:{widthScale:1,heightScale:1,skew:0,topDepth:0},
      placement:{dx:0,dy:0},
      selected:'front',faces:{whole:null,roof:null,front:null,side:null},
      quadrilaterals:{whole:null,roof:null,front:null,side:null},
      hasChanges:false};
  }
  function validateSettings(settings,spec){
    if(settings?.assetId!==spec.id||settings.version!==1)return false;
    if(!['whole','faces'].includes(settings.mode)||!['quick','corners'].includes(settings.tool))return false;
    if(typeof settings.anchorLock!=='boolean'||!['roof','front','side'].includes(settings.selected))return false;
    if(!settings.quick||!settings.placement||!settings.quadrilaterals)return false;
    const q=settings.quick,p=settings.placement;
    if(![q.widthScale,q.heightScale,q.skew,q.topDepth,p.dx,p.dy].every(n))return false;
    if(q.widthScale<.70||q.widthScale>1.30||q.heightScale<.70||q.heightScale>1.30)return false;
    if(Math.abs(q.skew)>spec.source.width*.18||Math.abs(q.topDepth)>spec.source.height*.16)return false;
    if(Math.abs(p.dx)>100||Math.abs(p.dy)>100)return false;
    for(const key of ['whole','roof','front','side']){
      const entry=settings.quadrilaterals[key];
      if(entry!==null&&entry!==undefined&&!validQuad(entry,spec.source.width,spec.source.height,spec.paddingPx))return false;
    }
    return true;
  }
  function exportState(spec,camera,state,files,outputReport){
    if(!validateSettings(state,spec))throw Error('Unsafe or incompatible edit state');
    return {schema:'gary-eats-perspective-edit-v1',originalAsset:spec.id,
      templateSourceSize:copy(spec.source),normalizedAnchor:copy(spec.anchor),
      cameraProfile:spec.profile,cameraSchema:camera.schema,
      status:'CANDIDATE_NOT_ART_APPROVED',settings:copy(state),
      sourceLayers:copy(files),sourceOriginalsModified:false,
      output:outputReport||null,
      worldPlacement:{x:spec.draw.x+state.placement.dx,y:spec.draw.y+state.placement.dy,
        width:spec.draw.width,height:spec.draw.height},
      approval:{camera:'UNVERIFIED_VISUAL',painting:'UNVERIFIED_VISUAL',registered:false,iphone:'UNVERIFIED_ON_DEVICE'},
      warning:'2D perspective edit does not reconstruct invisible roof, wall or underside surfaces.'};
  }
  return Object.freeze({copy,corners,quadArea,validQuad,boundsFromPixels,quickQuad,interpolate,warp,initial,validateSettings,exportState,clamp});
});
