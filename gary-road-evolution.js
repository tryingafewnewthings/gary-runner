/* Gary Eats! — Forgotten Road ground presentation V3.
 * 30 active seconds after settled night. Ground is authored as it enters the
 * screen, then remains fixed in world space. Render never advances the story.
 */
(function (root) {
  'use strict';
  const DURATION = 30, STRIDE = 64, MAX_SIZE = 48;
  const geometry = typeof WORLD === 'object' ? WORLD : {width:360,roadWidth:150};
  const ROAD_LEFT = (geometry.width-geometry.roadWidth)/2;
  const ROAD_RIGHT = ROAD_LEFT+geometry.roadWidth;
  const SPEC = Object.freeze(['Original high street','Light moss','Early neglect',
    'Medium growth','Roadside encroachment','Heavy overgrowth'].map(name=>Object.freeze({name})));
  const imgs = Object.create(null);
  for (const key of ['light','medium','heavy','kerb']) {
    const img = new Image(); img.ready=false;
    img.onload=()=>{img.ready=true;}; img.onerror=()=>{img.ready=false;};
    img.src='art/forgotten-road/decay-'+key+'.png?v=roaddecay20261017v3'; imgs[key]=img;
  }
  // Forced artwork stages are available only through an explicit debug route.
  // Old installer URLs with ?roadstage=5 now run the normal story.
  const query=new URLSearchParams(root.location ? root.location.search : '');
  const raw=query.get('roadstage'), parsed=raw===null||raw.trim()===''?NaN:Number(raw);
  const debugStage=query.get('debug')==='1' && Number.isInteger(parsed)
    ? Math.max(0,Math.min(5,parsed)) : null;
  const clamp=x=>Math.min(1,Math.max(0,x));
  const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
  function fraction(a,b,c) {
    let x=(Math.imul(a|0,374761393)^Math.imul(b|0,668265263)^Math.imul(c|0,1442695041))|0;
    x=Math.imul(x^(x>>>13),1274126177);
    return ((x^(x>>>16))>>>0)/4294967296;
  }
  // Bounded, preallocated distance/time mapping, sampled at the fixed tick.
  // This preserves a 30-second story even when score changes running speed.
  const depths=new Float64Array(2048), values=new Float64Array(2048);
  let count=0,elapsed=0,lastDistance=0,benchEntryDistance=Infinity;
  function reset(){count=0;elapsed=0;lastDistance=0;benchEntryDistance=Infinity;}
  function update(dt,distance,night,ready) {
    if (!ready || night<.98 || !Number.isFinite(distance) || !(dt>0)) return;
    if (!count) {depths[0]=distance;values[0]=0;count=1;}
    if (elapsed>=DURATION) return;
    elapsed=Math.min(DURATION,elapsed+dt);
    if (distance>depths[count-1] && count<depths.length) {
      depths[count]=distance; values[count]=elapsed/DURATION; count++;
    }
  }
  function progressAt(depth) {
    if (debugStage!==null) return [0,.14,.34,.53,.73,1][debugStage];
    if (!count || depth<=depths[0]) return 0;
    if (depth>=depths[count-1]) return values[count-1];
    let lo=0,hi=count-1;
    while(hi-lo>1){const mid=(lo+hi)>>>1;if(depths[mid]<=depth)lo=mid;else hi=mid;}
    return values[lo]+(values[hi]-values[lo])*(depth-depths[lo])/(depths[hi]-depths[lo]);
  }
  function trigger(distance,benchFoot) {
    if (!Number.isFinite(benchEntryDistance) && Number.isFinite(distance) && Number.isFinite(benchFoot))
      benchEntryDistance=distance-benchFoot;
  }
  function sprite(ctx,key,x,y,size,alpha,flip) {
    const img=imgs[key];if(!img.ready || alpha<=.001)return;
    ctx.save();ctx.globalAlpha*=alpha;
    if(flip){ctx.translate(x+size,y);ctx.scale(-1,1);ctx.drawImage(img,0,0,size,size);}
    else ctx.drawImage(img,x,y,size,size);
    ctx.restore();
  }
  function paint(ctx,x,y,w,h,distance,side,roadOnly=false) {
    if(!(w>0&&h>0) || !Number.isFinite(distance) || (!count&&debugStage===null))return;
    ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
    const lower=Math.floor((distance-y-h-MAX_SIZE)/STRIDE)-1;
    const upper=Math.ceil((distance-y+MAX_SIZE)/STRIDE)+1;
    for(let idx=lower;idx<=upper;idx++) {
      const depth=idx*STRIDE+(fraction(idx,side,42)-.5)*42;
      const p=progressAt(depth); if(p<=0)continue;
      const yy=distance-depth;
      ctx.save();
      if(roadOnly){
        const reach=12*smooth((p-.55)/.45);
        ctx.beginPath();ctx.rect(side===0?ROAD_LEFT-3:ROAD_RIGHT-reach,0,3+reach,h);ctx.clip();
      }
      // Three small columns cover the entire cobbled width in empty stretches.
      // Shop artwork naturally occludes these ground decals in occupied stretches.
      for(let col=0;col<3;col++) {
        const chance=fraction(idx,side,col+90);
        const weight=smooth((p-chance*.66)/.34);
        if(weight<=0)continue;
        const size=32+fraction(idx,side,col+320)*12;
        const leftX=[5,40,72][col]+(fraction(idx,side,col+55)-.5)*8;
        const xx=side===0?leftX:geometry.width-leftX-size;
        const medium=smooth((p-.36)/.24),heavy=smooth((p-.88)/.12);
        const alpha=weight*(.12+.40*p);
        const patchY=yy+(fraction(idx,side,col+880)-.5)*56;
        sprite(ctx,'light',xx,patchY,size,alpha*(1-medium),side===1);
        sprite(ctx,'medium',xx,patchY,size,alpha*medium*(1-heavy),side===1);
        sprite(ctx,'heavy',xx,patchY,size,alpha*heavy,side===1);
      }
      // The kerb artwork's dense edge is on its right. Mirror on the right
      // roadside, keeping growth on the cobbles with a small late road overlap.
      const growth=smooth((p-.48)/.52);
      const size=40+8*growth;
      const xx=side===0?ROAD_LEFT-size+4:ROAD_RIGHT-4;
      sprite(ctx,'kerb',xx,yy+18,size,.48*growth,side===1);
      ctx.restore();
    }
    ctx.restore();
  }
  function drawCobbles(ctx,p) {
    // Cover actual pavement, including the 16px strips omitted by V2.
    const leftEnd=Math.min(p.x+p.w,ROAD_LEFT-3);
    if(leftEnd>p.x)paint(ctx,p.x,p.y,leftEnd-p.x,p.h,p.distance,0);
    const rightStart=Math.max(p.x,ROAD_RIGHT+3);
    if(rightStart<p.x+p.w)paint(ctx,rightStart,p.y,p.x+p.w-rightStart,p.h,p.distance,1);
  }
  function drawRoad(ctx,p) {
    // Draw disjoint kerb strips after the road; never repaint the cobble pass.
    // Maximum road intrusion is 12 design pixels; all lane centres stay clear.
    paint(ctx,ROAD_LEFT-3,0,15,p.height,p.distance,0,true);
    paint(ctx,ROAD_RIGHT-12,0,15,p.height,p.distance,1,true);
  }
  function recordDistance(distance){lastDistance=distance;}
  root.GaryRoadEvolution=Object.freeze({version:'GaryRoadDecay20261017V3',SPEC,
    DURATION,LENGTH:30,update,trigger,reset,drawCobbles,drawRoad,progressAt,
    // Schedule the final empty stretch at 24s; the bench then approaches as
    // the last six seconds bring the entering terrain to heavy deterioration.
    encounterReady:()=>elapsed>=DURATION*.8,recordDistance,
    snapshot:()=>({start:count?depths[0]:Infinity,debugStage,benchEntryDistance,
      elapsed,stage:progressAt(lastDistance)*5,progress:progressAt(lastDistance),
      samples:count,loaded:Object.keys(imgs).filter(k=>imgs[k].ready)})});
})(window);
