/* Gary Eats! — Forgotten Road Decay V2 (GaryRoadDecay20261017V2)
 * Exact, original 512px alpha PNGs over the unchanged 60px cobble master.
 * Fixed 360x640 orthographic/composite world; no geometry/physics changes.
 * Decay is spatially world-anchored and synchronized to hooded bench entry.
 */
(function (root) {
  'use strict';
  const WORLD_HEIGHT = 640;
  const ROAD_LEFT = 105;
  const ROAD_RIGHT = 255;
  const PHASE_OFFSET = 304; // Matches worldDepth = distance - screenY + 304 in V1
  const STRIDE = 156;       // Candidate patch frequency in world design pixels
  const SPEC = Object.freeze([
    {name:'Original high street'}, {name:'Light moss'},
    {name:'Early neglect'}, {name:'Medium growth'},
    {name:'Roadside encroachment'}, {name:'Heavy overgrowth'}
  ]);
  const LEAD = 1400;        // Begin gentle neglect before hooded bench entry
  const MILESTONES = Object.freeze([
    [-LEAD, 0], [-1060, .17], [-710, .38],
    [-390, .57], [-220, .70], [-110, .76],
    [20, .91], [200, 1]
  ]);
  const ASSETS = Object.freeze({
    light: 'art/forgotten-road/decay-light.png?v=roaddecay20261017v2',
    medium: 'art/forgotten-road/decay-medium.png?v=roaddecay20261017v2',
    heavy: 'art/forgotten-road/decay-heavy.png?v=roaddecay20261017v2',
    kerb: 'art/forgotten-road/decay-kerb.png?v=roaddecay20261017v2'
  });
  const imgs = Object.create(null);
  let loadedCount = 0;
  for (const key of Object.keys(ASSETS)) {
    const img = new Image();
    img.ready = false;
    img.onload = () => { if (!img.ready) loadedCount++; img.ready = true; };
    img.onerror = () => { if (img.ready) loadedCount--; img.ready = false; };
    img.src = ASSETS[key];
    imgs[key] = img;
  }

  const query = new URLSearchParams(root.location ? root.location.search : '');
  const rawForced = query.get('roadstage');
  const forced = rawForced === null || rawForced.trim() === '' ? null : Number(rawForced);
  const debugStage = Number.isFinite(forced) ? Math.max(0, Math.min(5, forced)) : null;
  let benchEntryDistance = Infinity; // Distance when mysterious bench foot enters y=0
  let triggeredAt = Infinity;
  let lastDistance = 0;
  const clamp = v => Math.min(1, Math.max(0, v));
  const smooth = v => { const x = clamp(v); return x*x*(3-2*x); };
  function hash(a,b,c) {
    let x = (Math.imul(a|0, 374761393) ^ Math.imul(b|0, 668265263) ^ Math.imul(c|0, 1442695041)) | 0;
    x = Math.imul(x ^ (x >>> 13), 1274126177);
    return (x ^ (x >>> 16)) >>> 0;
  }
  function fraction(a,b,c) { return hash(a,b,c) / 4294967296; }
  function remap(worldY) {
    if (debugStage !== null) return [0, .14, .34, .53, .73, .98][debugStage];
    if (!Number.isFinite(benchEntryDistance)) return 0;
    const relative = worldY - benchEntryDistance;
    // Heavy moss appears only in the final approach to the reader.
    if (relative <= MILESTONES[0][0]) return 0;
    for (let i=1;i<MILESTONES.length;i++) {
      const a=MILESTONES[i-1], b=MILESTONES[i];
      if (relative <= b[0]) return a[1] + (b[1]-a[1])*smooth((relative-a[0])/(b[0]-a[0]));
    }
    return 1;
  }
  function trigger(distance, benchFoot) {
    if (debugStage !== null || Number.isFinite(benchEntryDistance)) return;
    // The live runtime supplies the first encounter's actual screen foot.
    // This prevents the decay timing from drifting if segment layout changes.
    if (!Number.isFinite(distance) || !Number.isFinite(benchFoot) || benchFoot >= 0) return;
    benchEntryDistance = distance - benchFoot;
    triggeredAt = distance;
  }
  function reset() {
    benchEntryDistance = Infinity;
    triggeredAt = Infinity;
    lastDistance = 0;
  }
  function drawSprite(ctx,img,x,y,width,height,alpha,flip) {
    if (!img || !img.ready || alpha <= .009) return;
    ctx.globalAlpha = Math.min(.92,alpha);
    if (flip) {
      ctx.save();ctx.translate(x + width, y);ctx.scale(-1,1);
      ctx.drawImage(img,0,0,width,height);ctx.restore();
    } else ctx.drawImage(img,x,y,width,height);
  }
  // Draw from a small set of fixed world slots; identical world coordinates
  // are painted in both the pavement and road passes, with independent clips.
  function paintOverlays(ctx,params,type) {
    if (debugStage === null && !Number.isFinite(benchEntryDistance)) return;
    if (!loadedCount) return;
    const clipX = params.x;
    const clipY = params.y;
    const clipW = params.w;
    const clipH = params.h;
    const distance = params.distance;
    if (clipW <= 0 || clipH <= 0 || !Number.isFinite(distance)) return;
    ctx.save();
    ctx.beginPath();ctx.rect(clipX,clipY,clipW,clipH);ctx.clip();
    const lower = Math.floor((distance+PHASE_OFFSET-clipY-clipH-220) / STRIDE);
    const upper = Math.ceil((distance+PHASE_OFFSET-clipY+220) / STRIDE);
    for (let idx=lower; idx<=upper; idx++) {
      for (let side=0; side<2; side++) {
        const seed = hash(idx,side,731);
        const jitter = (fraction(idx,side,42)-.5)*58;
        const worldY = idx * STRIDE + jitter;
        const p = remap(worldY);
        if (p < .025) continue;
        const chance = fraction(idx,side,99);
        const frequency = .15 + .82*smooth(p);
        if (chance > frequency) continue;
        const yy = distance+PHASE_OFFSET-worldY;
        const shape = fraction(idx,side,201);
        const width = 70 + Math.round(fraction(idx,side,321)*40);
        const height = width*(.82 + fraction(idx,side,523)*.25);
        const variation = fraction(idx,side,156);
        const kerbPatch = p > .17 && shape > .60;
        let image = imgs.light;
        if (kerbPatch) image = imgs.kerb;
        else if (p >= .77 && variation < smooth((p-.77)/.18)) image = imgs.heavy;
        else if (p >= .32 && variation < smooth((p-.25)/.25)) image = imgs.medium;
        // Constrain each shared patch to a narrow roadside footprint.
        // The middle running lane remains visually quiet in every stage.
        const centerX = side===0 ? 109 : 251;
        const xx = centerX - width/2 + (fraction(idx,side,55)-.5)*13;
        const alpha = Math.min(.87, (.23 + p*.64)*( .78 + fraction(idx,side,72)*.22));
        // For kerb growth, orientation means growth is at the *outer* edge
        // of each pavement and extends naturally across the kerb line.
        if (kerbPatch) {
          const edgeWidth = 100 + 18*p;
          const edgeX = side===0 ? 86 : 274-edgeWidth;
          drawSprite(ctx,image,edgeX,yy-6,edgeWidth,Math.max(90,height),alpha,side===0);
        } else {
          drawSprite(ctx,image,xx,yy,width,height,alpha,false);
        }
      }
    }
    ctx.restore();
  }
  // Buildings are painted over outer-cobble areas. We leave the thin
  // pavements (89..105 and 255..271) for the final over-road pass below,
  // preventing the existing pavement renderer from hiding our new art.
  function drawCobbles(ctx,params) {
    const leftEnd = Math.min(params.x + params.w, 89);
    if (params.x < leftEnd) paintOverlays(ctx,{x:params.x,y:params.y,w:leftEnd-params.x,h:params.h,distance:params.distance},'cobble');
    const rightStart = Math.max(params.x, 271);
    if (rightStart < params.x + params.w) paintOverlays(ctx,{x:rightStart,y:params.y,w:params.x+params.w-rightStart,h:params.h,distance:params.distance},'cobble');
  }
  // The live engine draws road after the pavement strips. A final overlay
  // across the 16px kerbs and 150px roadway makes vegetation cross their join
  // without ever painting over shop facades or covering the centre lane.
  function drawRoad(ctx,params) {
    lastDistance = params.distance;
    paintOverlays(ctx,{x:89,y:0,w:182,h:params.height,distance:params.distance},'road');
  }
  root.GaryRoadEvolution = Object.freeze({
    version:'GaryRoadDecay20261017V2', SPEC, LENGTH:LEAD,
    trigger,reset,drawCobbles,drawRoad,
    snapshot:()=>({start:triggeredAt,debugStage,
      benchEntryDistance,stage:debugStage !== null ? debugStage : remap(lastDistance)*5,
      progress:remap(lastDistance),
      loaded:Object.keys(imgs).filter(k=>imgs[k].ready)})
  });
})(window);
