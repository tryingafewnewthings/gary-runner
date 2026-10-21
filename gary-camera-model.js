/* Gary Eats! deterministic reference geometry. No runtime game changes. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GaryCameraModel = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  const finite = n => typeof n === 'number' && Number.isFinite(n);
  function validate(c) {
    const errors = [];
    const w = c && c.world, b = c && c.bridge, p = c && c.profiles;
    if (c?.schema !== 'gary-eats-visual-camera-v1') errors.push('Wrong contract schema');
    if (!w || w.width !== 360 || w.height !== 640) errors.push('Unexpected design canvas');
    if (w && (w.roadRight - w.roadLeft !== w.roadWidth ||
      w.roadWidth !== 150 || w.laneCentres?.join(',') !== '130,180,230')) errors.push('Road or lane geometry drift');
    if (w && (w.playerY !== 540 || w.playerFootOffset !== 6 || w.cobbleCell !== 60)) errors.push('Active player/ground geometry drift');
    if (!b || b.deck.width !== b.deck.right - b.deck.left ||
      b.deck.width !== 84 || b.length !== b.cacheEnd - b.cacheFar ||
      b.length !== 620 || b.cacheHeight !== 1000) errors.push('Bridge geometry drift');
    if (!p || p['ground-plane']?.status !== 'CODE_LOCKED' ||
      p['raised-architecture']?.status !== 'PROVISIONAL_NEEDS_VISUAL_APPROVAL') errors.push('Projection approval status altered');
    for (const v of Object.values(b?.viewNear || {})) if (!finite(v)) errors.push('Invalid bridge preview position');
    return {ok: errors.length === 0, errors};
  }
  function screenPoint(x, y, z, elevation = .8) {
    if (![x, y, z, elevation].every(finite) || elevation < 0 || elevation > 2)
      throw new RangeError('Invalid orthographic reference point');
    return {x, y: y - z * elevation};
  }
  function bridgeFrame(c, near) {
    if (!finite(near)) throw new RangeError('Invalid bridge position');
    const b = c.bridge, start = near - b.length, end = near;
    return {start, end, near,
      deck:{x:b.deck.left,y:start,w:b.deck.width,h:b.length},
      masonry:b.masonry.map(m=>({x:m.left,y:start+16,w:m.width,h:b.length+20})),
      parapets:b.parapets.map(p=>({x:p.left,y:start-12,w:p.width,h:b.length}))};
  }
  function prism(rect, height, elevation) {
    if (!finite(height) || height < 0) throw new RangeError('Invalid height');
    const lift = height*elevation, x=rect.x, y=rect.y, r=x+rect.w, d=y+rect.h;
    return {
      roof:[[x,y-lift],[r,y-lift],[r,d-lift],[x,d-lift]],
      front:[[x,d-lift],[r,d-lift],[r,d],[x,d]],
      side:[[r,y-lift],[r,d-lift],[r,d],[r,y]],
      footprint:[[x,y],[r,y],[r,d],[x,d]]};
  }
  function draw(ctx,c,near,opts={}) {
    const f=bridgeFrame(c,near),w=c.world,b=c.bridge;
    const showFootprints=opts.footprints !== false,showVolumes=opts.volumes !== false;
    const opacity=finite(opts.opacity)?Math.max(.1,Math.min(.95,opts.opacity)):.75;
    const height=finite(opts.height)?Math.max(0,Math.min(28,opts.height)):14;
    const elevation=finite(opts.elevation)?Math.max(.1,Math.min(1.6,opts.elevation)):.8;
    const line=(x1,y1,x2,y2,color,width=1,dash=[])=>{
      ctx.beginPath();ctx.setLineDash(dash);ctx.strokeStyle=color;ctx.lineWidth=width;
      ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.setLineDash([]);
    };
    const rect=(r,color,fill=false)=>{
      ctx.beginPath();ctx.rect(r.x,r.y,r.w,r.h);
      if(fill){ctx.fillStyle=color;ctx.fill();}
      else{ctx.strokeStyle=color;ctx.lineWidth=1.7;ctx.stroke();}
    };
    const poly=(pts,color,fill=true)=>{
      ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
      ctx.closePath();ctx.strokeStyle=color;ctx.lineWidth=1.5;
      if(fill){ctx.fillStyle=color;ctx.fill();}ctx.stroke();
    };
    ctx.save();ctx.globalAlpha=opacity;
    if(showFootprints){
      for(const x of [w.roadLeft,w.roadRight])line(x,0,x,w.height,'#43d9f7',1.5,[7,5]);
      for(const x of w.laneCentres)line(x,0,x,w.height,'#a7edfa',.8,[3,6]);
      rect(f.deck,'#ffe18b');
      for(const r of f.masonry)rect(r,'#d8a476');
      for(const r of f.parapets)rect(r,'#ff718c');
      line(0,f.start,w.width,f.start,'#ffe18b',1,[4,4]);
      line(0,f.end,w.width,f.end,'#ffe18b',1,[4,4]);
      // The water/river banks are separate world layers, not part of the masonry asset.
      for(const [x,width] of [[0,101],[259,101]]){
        if(f.end>f.start+160)rect({x,y:f.start+120,w:width,h:b.length-240},'rgba(78,182,174,.14)',true);
      }
    }
    if(showVolumes){
      for(const r of f.parapets){
        const v=prism(r,height,elevation);
        poly(v.front,'rgba(251,135,115,.22)');
        poly(v.roof,'rgba(255,226,152,.13)');
        line(r.x,r.y-height*elevation,r.x,r.y,'#ffcf86',1.2);
      }
      for(const r of f.masonry) {
        // Face-depth reference, not a painted or approved bridge support.
        for(let y=r.y+45;y<r.y+r.h-20;y+=156)rect({x:r.x+2,y,w:r.w-4,h:116},'#acbffc');
      }
    }
    const anchorY=Math.min(w.height-12,Math.max(16,w.playerY+w.playerFootOffset));
    line(w.roadLeft,anchorY,w.roadRight,anchorY,'#7dffae',1,[3,3]);
    ctx.restore();return f;
  }
  return Object.freeze({validate, screenPoint, bridgeFrame, prism, draw});
});
