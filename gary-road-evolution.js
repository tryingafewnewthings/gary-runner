/* Gary Eats! — Forgotten Road ground evolution, v1.
 * Art-direction-safe procedural overlays: six deterministic world-anchored stages.
 * Never changes lane geometry, collisions, shop atlas or physics.
 * Stage activation is triggered by the live street-mystery clearing event.
 */
(function (root) {
  'use strict';
  const CELL = 60;
  const VARIANTS = 5;
  const LENGTH = 3000;
  const SPEC = Object.freeze([
    {name:'Original high street', note:'Existing cobbles and tarmac preserved'},
    {name:'Wet and neglected', note:'Dark damp patches and puddle reflections'},
    {name:'Cracks appear', note:'Hairline fractures and sparse kerb weeds'},
    {name:'Broken surface', note:'Crumbled mortar, exposed earth, chipped edges'},
    {name:'Overgrown', note:'Moss, weeds, soil and narrowing clear ground'},
    {name:'Wilderness road', note:'Roots, vegetation, mud and aged stone'}
  ]);
  const q = new URLSearchParams(root.location ? root.location.search : '');
  const forced = q.has('roadstage') ? Number(q.get('roadstage')) : NaN;
  const debugStage = Number.isFinite(forced) ? Math.max(0, Math.min(5, forced)) : null;
  const earlyPreview = q.get('roadpreview') === '1';
  let start = Infinity;
  let tiles = null;
  const clamp = x => Math.max(0, Math.min(1, x));
  function hash(a, b, c) {
    let x = (Math.imul(a, 374761393) ^ Math.imul(b, 668265263) ^ Math.imul(c, 1442695041)) | 0;
    x = Math.imul(x ^ (x >>> 13), 1274126177);
    return (x ^ (x >>> 16)) >>> 0;
  }
  function rand(seed) {
    let state = seed >>> 0;
    return () => {
      state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
  }
  function ellipse(g,x,y,rx,ry,color) {
    g.fillStyle=color;g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill();
  }
  function crack(g,r,x,y,scale) {
    g.strokeStyle = 'rgba(21,27,29,.68)';g.lineWidth=0.75+r()*0.65;
    g.beginPath();g.moveTo(x,y);
    for(let j=0;j<3;j++){ x+=(r()-.5)*13*scale;y+=(2+r()*6)*scale;g.lineTo(x,y); }
    g.stroke();
    g.strokeStyle='rgba(173,166,145,.19)';g.lineWidth=.6;
    g.beginPath();g.moveTo(x+1,y);g.lineTo(x+2.5,y+3);g.stroke();
  }
  function leaves(g,r,x,y) {
    for(let j=0;j<3;j++){
      const a=r()*Math.PI*2,dx=Math.cos(a)*3,dy=Math.sin(a)*2;
      ellipse(g,x+dx,y+dy,1.5+r()*1.5,.75+r(),'rgba(117,82,45,.6)');
    }
  }
  function moss(g,r,x,y,amount) {
    for(let j=0;j<amount;j++) {
      const a=r()*Math.PI*2, d=2+r()*9;
      ellipse(g,x+Math.cos(a)*d,y+Math.sin(a)*d,1+r()*3,.65+r()*1.8,
        ['rgba(66,94,58,.68)','rgba(95,114,55,.65)','rgba(37,72,55,.68)'][Math.floor(r()*3)]);
    }
  }
  function grass(g,r,x,y,n) {
    g.lineCap='round';
    for(let j=0;j<n;j++){
      g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+(r()-.5)*7,y-3-r()*5,x+(r()-.5)*12,y-5-r()*8);
      g.strokeStyle=j%2?'rgba(80,111,62,.84)':'rgba(50,86,54,.82)';
      g.lineWidth=.7+r()*.9;g.stroke();
    }
  }
  function root(g,r,x,y) {
    g.lineCap='round';g.lineJoin='round';g.strokeStyle='rgba(62,54,42,.79)';g.lineWidth=2.3;
    g.beginPath();g.moveTo(x,y);g.bezierCurveTo(x+6,y+5,x+2,y+12,x+12,y+17);g.stroke();
    g.lineWidth=.95;g.beginPath();g.moveTo(x+5,y+8);g.lineTo(x-2,y+12);g.lineTo(x-6,y+17);g.stroke();
  }
  function tile(type,stage,variant) {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=CELL;
    const g=canvas.getContext('2d');
    const r=rand(hash(stage+1,variant+91,type==='road'?181:117));
    if(stage===0)return canvas;
    const road=type==='road';
    // The base already exists in the live renderer. Keep these painted marks
    // deliberately sparse, scaled like the original 60px cobble cells.
    if(stage>=1){
      g.fillStyle=road?'rgba(30,38,44,.10)':'rgba(28,40,48,.13)';g.fillRect(0,0,CELL,CELL);
      for(let n=0;n<(stage>=3?3:2);n++){
        const x=7+r()*46,y=8+r()*46;
        ellipse(g,x,y,6+r()*8,2+r()*5,road?'rgba(34,56,65,.19)':'rgba(31,53,59,.25)');
        ellipse(g,x-1,y-1,2+r()*3,.7+r(),'rgba(133,156,166,.11)');
      }
    }
    if(stage>=2){
      for(let n=0;n<(stage===2?2:4);n++)crack(g,r,4+r()*46,4+r()*42,stage>=4?1.15:0.83);
      for(let n=0;n<(road?1:2);n++)moss(g,r,8+r()*44,8+r()*44,2);
    }
    if(stage>=3){
      for(let n=0;n<3;n++){
        const x=7+r()*46,y=7+r()*46;
        ellipse(g,x,y,3+r()*5,2+r()*4,'rgba(68,59,50,.35)');
        ellipse(g,x-1,y-1,1+r()*2,1+r()*2,'rgba(118,104,77,.29)');
      }
      for(let n=0;n<2;n++)leaves(g,r,6+r()*48,6+r()*48);
    }
    if(stage>=4){
      // Irregular semi-transparent earthy cover, not a rectangular texture swap.
      for(let n=0;n<7;n++){
        const x=7+r()*45,y=7+r()*45;
        ellipse(g,x,y,6+r()*8,3+r()*7,
          road?'rgba(66,62,48,.26)':'rgba(65,74,49,.34)');
        if(n%2===0)moss(g,r,x,y,5);
      }
      for(let n=0;n<(road?1:3);n++)grass(g,r,7+r()*46,10+r()*45,3+r()*4|0);
    }
    if(stage>=5){
      g.fillStyle=road?'rgba(51,58,46,.12)':'rgba(53,62,44,.75)';g.fillRect(0,0,CELL,CELL);
      for(let n=0;n<8;n++){
        const x=6+r()*48,y=6+r()*48;
        ellipse(g,x,y,4+r()*8,3+r()*6,
          n%3===0?'rgba(61,49,38,.42)':'rgba(56,72,43,.4)');
        if(n%3===0)leaves(g,r,x,y);
      }
      root(g,r,9+r()*34,6+r()*28);
      for(let n=0;n<(road?2:4);n++)grass(g,r,4+r()*49,8+r()*46,3);
    }
    return canvas;
  }
  function ensureTiles() {
    if(tiles)return;
    tiles={road:[],cobble:[]};
    for(const type of ['road','cobble'])for(let stage=0;stage<6;stage++){
      const variants=[];
      for(let v=0;v<VARIANTS;v++)variants.push(tile(type,stage,v));
      tiles[type].push(variants);
    }
  }
  function sample(worldY) {
    if(debugStage!==null)return debugStage;
    if(!Number.isFinite(start))return 0;
    const t=clamp((worldY-start)/LENGTH);
    return t*t*(3-2*t)*5;
  }
  function trigger(distance) {
    if(debugStage!==null)return;
    if(Number.isFinite(start))return;
    start = earlyPreview ? distance - 200 : distance + 250;
  }
  function reset() { start=Infinity; }
  function paint(ctx,kind,x,y,w,h,scrollY,distance,roadLeft,roadRight) {
    if(debugStage===null&&!Number.isFinite(start))return;
    ensureTiles();
    const source=tiles[kind];
    const phase=((scrollY%CELL)+CELL)%CELL;
    const shift=Math.floor(scrollY/CELL);
    ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
    const yFirst=Math.floor((y-phase)/CELL);
    const xFirst=Math.floor(x/CELL);
    for(let j=yFirst;j*CELL+phase<y+h;j++){
      const py=j*CELL+phase,worldRow=j-shift;
      const worldDepth=distance-py+304;
      const value=sample(worldDepth);
      if(value<=.0001)continue;
      const lo=Math.floor(value),hi=Math.min(5,lo+1),blend=value-lo;
      for(let c=xFirst;c*CELL<x+w;c++){
        const px=c*CELL,worldCol=c;
        const v=hash(worldCol,worldRow,37)%VARIANTS;
        let strength=1;
        if(kind==='road'){
          const center=px+CELL*.5;
          const proximity=Math.min(Math.abs(center-roadLeft),Math.abs(center-roadRight));
          // Vegetation invades the edges first, retaining an uncluttered running lane.
          strength=value<2.3?0.88:Math.max(.25,0.95-proximity/93);
        }
        ctx.globalAlpha=strength*(1-blend);
        if(lo)ctx.drawImage(source[lo][v],px,py,CELL+.5,CELL+.5);
        if(hi!==lo&&blend>.001){ctx.globalAlpha=strength*blend;ctx.drawImage(source[hi][v],px,py,CELL+.5,CELL+.5);}
      }
    }
    ctx.restore();
  }
  function drawCobbles(ctx,params) {
    paint(ctx,'cobble',params.x,params.y,params.w,params.h,params.scrollY,params.distance,105,255);
  }
  function drawRoad(ctx,params) {
    paint(ctx,'road',params.left,0,params.width,params.height,params.scrollY,params.distance,params.left,params.left+params.width);
    // Paint and lane markers gradually age, but never disappear completely for readability.
    const amount=sample(params.distance+220);
    if(amount>1.9){
      ctx.save();ctx.beginPath();ctx.rect(params.left,0,params.width,params.height);ctx.clip();
      ctx.globalAlpha=Math.min(.16,(amount-1.9)*.048);
      ctx.fillStyle='#353a34';ctx.fillRect(params.left,0,params.width,params.height);ctx.restore();
    }
  }
  // Warm textures while the intro/menu loads, rather than at the first wilderness frame.
  if (typeof root.requestIdleCallback === 'function') root.requestIdleCallback(ensureTiles, {timeout:1500});
  else root.setTimeout(ensureTiles, 200);
  root.GaryRoadEvolution=Object.freeze({SPEC,LENGTH,trigger,reset,drawCobbles,drawRoad,
    snapshot:()=>({start,debugStage,stage:debugStage===null?sample(start+LENGTH/2):debugStage})});
})(window);
