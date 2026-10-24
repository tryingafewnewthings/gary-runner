/* Gary Eats! — Forgotten Road ground presentation V4.
 * 30 active seconds after settled night. Ground is authored as it enters the
 * screen, then remains fixed in world space. Render never advances the story.
 */
(function (root) {
  'use strict';
  const DURATION = 30, STRIP = 128, PERIOD = 512, TILE_WIDTH = 117;
  const geometry = typeof WORLD === 'object' ? WORLD : {width:360,roadWidth:150};
  const ROAD_LEFT = (geometry.width-geometry.roadWidth)/2;
  const ROAD_RIGHT = ROAD_LEFT+geometry.roadWidth;
  const SPEC = Object.freeze(['Original high street','Light moss','Early neglect',
    'Medium growth','Roadside encroachment','Heavy overgrowth'].map(name=>Object.freeze({name})));
  const imgs = Object.create(null);
  for (const key of ['light','medium','heavy','kerb']) {
    const img = new Image(); img.ready=false;
    img.onload=()=>{img.ready=true;}; img.onerror=()=>{img.ready=false;};
    img.src='art/forgotten-road/decay-'+key+'.png?v=roaddecay20261017v4'; imgs[key]=img;
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
  // Immutable, pre-sized atlases. These are built once behind the Play gate,
  // never when a stage becomes visible and never during a draw call.
  const images=Object.freeze(Object.values(imgs));
  const atlases=[[],[]];
  const rasterScale=Math.min(2,Math.max(1,root.devicePixelRatio||1));
  let prepared=false,preparing=null,buildCount=0,blits=0;
  const positiveMod=(n,m)=>((n%m)+m)%m;
  function stamp(g,image,x,y,size,alpha,flip) {
    if(alpha<=0)return;
    g.save();g.globalAlpha=alpha;
    if(flip){g.translate(x+size,y);g.scale(-1,1);g.drawImage(image,0,0,size,size);}
    else g.drawImage(image,x,y,size,size);
    g.restore();
  }
  function buildAtlas(stage,side) {
    const canvas=root.document.createElement('canvas');
    canvas.width=TILE_WIDTH*rasterScale;canvas.height=PERIOD*rasterScale;
    const g=canvas.getContext('2d');g.scale(rasterScale,rasterScale);
    g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
    const maturity=[0,.18,.38,.65,.88,1][stage];
    const soil=[0,0,.04,.25,.90,.97][stage];
    // Soil/matted vegetation occludes the original stones late in the story.
    // The original 60px cobble master still exists beneath this ground layer.
    g.globalAlpha=soil;g.fillStyle='#414334';g.fillRect(0,0,TILE_WIDTH,PERIOD);
    g.globalAlpha=1;
    const stride=[80,70,50,32,21,18][stage];
    const image=stage<2?imgs.light:stage<4?imgs.medium:imgs.heavy;
    if(stage>0)for(let row=-2;row<=Math.ceil(PERIOD/stride)+2;row++){
      for(let col=-1;col<Math.ceil(TILE_WIDTH/stride)+1;col++){
        const size=32+fraction(row,col,side+320)*12;
        const x=col*stride+(fraction(row,col,side+55)-.5)*stride*.6;
        const y=row*stride+(fraction(row,col,side+880)-.5)*stride*.6;
        // Wrap every stamp to make the 512px atlas seamlessly repeat vertically.
        for(let wrap=-1;wrap<=1;wrap++){
          const yy=positiveMod(y,PERIOD)+wrap*PERIOD;
          if(yy+size<0||yy>PERIOD)continue;
          stamp(g,image,x,yy,size,.20+.75*maturity,side===1);
        }
      }
    }
    // Leave a few irregular cracks through the late ground mat so the old
    // road can still be glimpsed. This prevents a uniform solid-colour carpet.
    if(stage>=4){
      g.save();g.globalCompositeOperation='destination-out';g.globalAlpha=.85;
      for(let row=0;row<PERIOD;row+=48)for(let col=12;col<102;col+=40){
        const xx=col+fraction(row,col,side+45)*12,yy=row+fraction(row,col,side+64)*20;
        g.beginPath();g.ellipse(xx,yy,2+fraction(row,col,20)*2,3+fraction(row,col,30)*2,0,0,Math.PI*2);g.fill();
      }g.restore();
    }
    // No soil beyond the kerb: its narrow road fringe remains organic alpha art.
    g.clearRect(102,0,15,PERIOD);
    if(stage>=3)for(let row=0;row<PERIOD;row+=32){
      const size=44,alpha=stage===3?.28:.85;
      for(let wrap=-1;wrap<=1;wrap++)stamp(g,imgs.kerb,105-size+7,row+wrap*PERIOD,size,alpha,false);
    }
    // Bake the right-hand orientation once, instead of flipping each frame.
    if(side===1){
      const mirrored=root.document.createElement('canvas');mirrored.width=canvas.width;mirrored.height=canvas.height;
      const mg=mirrored.getContext('2d');mg.translate(canvas.width,0);mg.scale(-1,1);mg.drawImage(canvas,0,0);
      buildCount++;return mirrored;
    }
    buildCount++;return canvas;
  }

  // Quiet road-surface ageing shares the existing world-distance history.
  // Two tiny transparent atlases are baked before Play, never per frame.
  let roadAtlases=null,roadBlits=0;
  function buildRoadAtlases(){
    const make=()=>{
      const canvas=root.document.createElement('canvas');
      canvas.width=geometry.roadWidth*rasterScale;canvas.height=PERIOD*rasterScale;
      const g=canvas.getContext('2d');g.scale(rasterScale,rasterScale);
      g.imageSmoothingEnabled=true;return {canvas,g};
    };
    const {canvas:wear,g}=make(),{canvas:puddles,g:wet}=make();
    const width=geometry.roadWidth;
    // Draw wrapped duplicates to prevent a horizontal tile seam.
    function wrap(g,y,paint){for(const dy of [-PERIOD,0,PERIOD])paint(g,y+dy);}
    // Low-contrast asphalt repair scars.
    for(let i=0;i<11;i++){
      const y=fraction(i,13,501)*PERIOD,x=6+fraction(i,17,502)*(width-12);
      const rx=6+fraction(i,19,503)*10,ry=2+fraction(i,23,504)*4;
      wrap(g,y,(c,yy)=>{
        c.fillStyle=i%3===0?'rgba(18,24,29,.11)':'rgba(22,29,33,.075)';
        c.beginPath();c.moveTo(x-rx,yy);
        c.quadraticCurveTo(x-rx*.65,yy-ry*1.4,x,yy-ry*.7);
        c.quadraticCurveTo(x+rx*.9,yy-ry*1.2,x+rx,yy);
        c.quadraticCurveTo(x+rx*.45,yy+ry*1.25,x-rx*.45,yy+ry*.9);
        c.closePath();c.fill();
      });
    }
    // Thin, short hairline cracks, weighted toward the road edges.
    for(let i=0;i<25;i++){
      const left=i%2===0,x=(left?8:width-8)+(left?1:-1)*fraction(i,31,505)*33;
      const y=fraction(i,37,506)*PERIOD,length=9+fraction(i,41,507)*32;
      const drift=(fraction(i,43,508)-.5)*9;
      wrap(g,y,(c,yy)=>{
        c.beginPath();c.moveTo(x,yy);
        c.lineTo(x+drift*.3,yy+length*.26);
        c.lineTo(x+drift*.8+(i%3-1)*2,yy+length*.57);
        c.lineTo(x+drift,yy+length);
        c.strokeStyle='rgba(15,22,27,.17)';c.lineWidth=.65;c.lineCap='round';c.stroke();
        if(i%5===0){
          c.beginPath();c.moveTo(x+drift*.8+(i%3-1)*2,yy+length*.57);
          c.lineTo(x+drift*.8+(i%3-1)*2+(left?4:-4),yy+length*.75);
          c.strokeStyle='rgba(20,26,30,.10)';c.lineWidth=.55;c.stroke();
        }
      });
    }
    // Fine grain and understated paint-scuff speckles.
    for(let i=0;i<180;i++){
      const x=fraction(i,47,509)*width,y=fraction(i,53,510)*PERIOD;
      g.fillStyle=i%2?'rgba(12,18,24,.07)':'rgba(184,188,181,.045)';
      g.fillRect(x,y,.5+fraction(i,59,511)*.9,.5+fraction(i,61,512)*.75);
    }
    for(let i=0;i<28;i++){
      const x=width/3*(i%2+1)+(fraction(i,67,513)-.5)*3.5,y=fraction(i,71,514)*PERIOD;
      g.fillStyle='rgba(54,58,62,.16)';g.fillRect(x,y,1.1+fraction(i,73,515)*1.5,1+fraction(i,79,516)*2);
    }
    // Seven tiny, still puddles per 512 units, all away from centre markings.
    // Each is roughly 8–17 wide and 2–5 high; muted highlights, no animation.
    for(let i=0;i<7;i++){
      const left=i%2===0,x=left?9+fraction(i,83,517)*30:width-9-fraction(i,89,518)*30;
      const y=fraction(i,97,519)*PERIOD;
      const rx=4+fraction(i,101,520)*4.5,ry=1.2+fraction(i,103,521)*1.2;
      wrap(wet,y,(c,yy)=>{
        c.fillStyle='rgba(70,96,111,.34)';
        c.beginPath();c.ellipse(x,yy,rx,ry,.06*(i%3-1),0,Math.PI*2);c.fill();
        c.strokeStyle='rgba(163,191,197,.31)';c.lineWidth=.55;c.lineCap='round';
        c.beginPath();c.moveTo(x-rx*.66,yy-ry*.26);
        c.quadraticCurveTo(x,yy-ry*.72,x+rx*.38,yy-ry*.35);c.stroke();
      });
    }
    return Object.freeze({wear,puddles});
  }
  function drawRoadSurface(ctx,p){
    if(!prepared||!roadAtlases||!Number.isFinite(p.distance)||!(p.height>0)||
      (!count&&debugStage===null))return;
    const wetness=smooth((clamp(Number(p.rain)||0)-.22)/.7);
    const lower=Math.floor((p.distance-p.height)/STRIP),upper=Math.floor(p.distance/STRIP);
    const alpha=ctx.globalAlpha;
    ctx.save();ctx.beginPath();ctx.rect(ROAD_LEFT,0,geometry.roadWidth,p.height);ctx.clip();
    for(let idx=lower;idx<=upper;idx++){
      const depth=idx*STRIP;if(depth>p.distance)continue;
      const progress=progressAt(depth);
      if(progress<=.03)continue;
      const maturity=smooth((progress-.03)/.97);
      const yy=p.distance-depth-STRIP,sy=positiveMod(-depth-STRIP,PERIOD)*rasterScale;
      ctx.globalAlpha=alpha*maturity*.83;
      ctx.drawImage(roadAtlases.wear,0,sy,geometry.roadWidth*rasterScale,STRIP*rasterScale,
        ROAD_LEFT,yy,geometry.roadWidth,STRIP);roadBlits++;
      if(wetness>.001){
        ctx.globalAlpha=alpha*wetness*(.16+.46*maturity);
        ctx.drawImage(roadAtlases.puddles,0,sy,geometry.roadWidth*rasterScale,STRIP*rasterScale,
          ROAD_LEFT,yy,geometry.roadWidth,STRIP);roadBlits++;
      }
    }
    ctx.restore();
  }
  function prepare() {
    if(prepared)return Promise.resolve();
    if(preparing)return preparing;
    preparing=(async()=>{
      if(images.some(img=>!img.ready))throw Error('Ground artwork is not decoded');
      for(const img of images)if(img.decode)await img.decode();
      for(let side=0;side<2;side++)for(let stage=1;stage<=5;stage++){
        // Yield between bounded startup jobs to keep the loading screen alive.
        await new Promise(resolve=>root.setTimeout(resolve,0));
        atlases[side][stage]=buildAtlas(stage,side);
      }
      roadAtlases=buildRoadAtlases();
      prepared=true;
    })().catch(error=>{preparing=null;throw error;});
    return preparing;
  }
  function paint(ctx,x,y,w,h,distance,side) {
    if(!prepared||!(w>0&&h>0)||!Number.isFinite(distance)||(!count&&debugStage===null))return;
    ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
    const lower=Math.floor((distance-y-h)/STRIP),upper=Math.floor((distance-y)/STRIP);
    const destX=side===0?0:geometry.width-TILE_WIDTH;
    for(let idx=lower;idx<=upper;idx++){
      const depth=idx*STRIP;
      if(depth>distance)continue;
      const p=progressAt(depth);if(p<=0)continue;
      // Reach the swallowed-cobble appearance in the last approach, before
      // the bench enters. The last moments sustain it rather than switching late.
      const level=p<=.6?p*5:3+2*smooth((p-.6)/.25);
      const lo=Math.floor(level),hi=Math.min(5,lo+1),mix=level-lo;
      const sy=positiveMod(-depth-STRIP,PERIOD)*rasterScale;
      const yy=distance-depth-STRIP;
      const alpha=ctx.globalAlpha;
      // Draw lower stage at full strength and lerp toward upper stage using
      // source-over. Late opaque soil replaces the old cobbles naturally.
      if(lo>0){ctx.drawImage(atlases[side][lo],0,sy,TILE_WIDTH*rasterScale,STRIP*rasterScale,
        destX,yy,TILE_WIDTH,STRIP);blits++;}
      if(hi>lo&&mix>.001){ctx.globalAlpha=alpha*mix;
        ctx.drawImage(atlases[side][hi],0,sy,TILE_WIDTH*rasterScale,STRIP*rasterScale,
          destX,yy,TILE_WIDTH,STRIP);blits++;ctx.globalAlpha=alpha;}
    }
    ctx.restore();
  }
  function drawCobbles(ctx,p) {
    const leftEnd=Math.min(p.x+p.w,ROAD_LEFT-3);
    if(leftEnd>p.x)paint(ctx,p.x,p.y,leftEnd-p.x,p.h,p.distance,0);
    const rightStart=Math.max(p.x,ROAD_RIGHT+3);
    if(rightStart<p.x+p.w)paint(ctx,rightStart,p.y,p.x+p.w-rightStart,p.h,p.distance,1);
  }
  function drawRoad(ctx,p) {
    paint(ctx,ROAD_LEFT-3,0,15,p.height,p.distance,0);
    paint(ctx,ROAD_RIGHT-12,0,15,p.height,p.distance,1);
  }
  function recordDistance(distance){lastDistance=distance;}
  root.GaryRoadEvolution=Object.freeze({version:'GaryRoadDecay20261017V4',SPEC,
    DURATION,LENGTH:30,update,trigger,reset,drawCobbles,drawRoad,drawRoadSurface,progressAt,prepare,images,
    // Schedule the final empty stretch at 24s; the bench then approaches as
    // the last six seconds bring the entering terrain to heavy deterioration.
    encounterReady:()=>elapsed>=DURATION*.8,recordDistance,
    stats:()=>({blits,buildCount,roadBlits,roadAtlases:roadAtlases?2:0}),
    warm(ctx){ctx.save();ctx.globalAlpha=.001;
      for(let side=0;side<2;side++)for(let stage=1;stage<=5;stage++)ctx.drawImage(atlases[side][stage],0,0,1,1);
      if(roadAtlases){ctx.drawImage(roadAtlases.wear,0,0,1,1);ctx.drawImage(roadAtlases.puddles,0,0,1,1);}
      ctx.restore();},
    snapshot:()=>({start:count?depths[0]:Infinity,debugStage,benchEntryDistance,
      prepared,buildCount,roadAtlases:roadAtlases?2:0,atlasBytes:10*TILE_WIDTH*PERIOD*rasterScale*rasterScale*4+2*geometry.roadWidth*PERIOD*rasterScale*rasterScale*4,
      elapsed,stage:progressAt(lastDistance)*5,progress:progressAt(lastDistance),
      samples:count,loaded:Object.keys(imgs).filter(k=>imgs[k].ready)})});
})(window);
