(() => {
  'use strict';
  /*
   * Runtime foundation for the 2026-10-10 developer handoff.
   * PROJECT_STATE.md owns priorities; STYLE.txt owns visual approval.
   * All authored geometry, atlas crops and item definitions live in game-data.js.
   * DEVELOPMENT_PLAN is a specification only: dialogue and the lantern are
   * not active yet. Heavy rain is live. It builds after a settled night.
   *
   * Reading map: setup -> assets -> street rendering -> procedural item art ->
   * run lifecycle -> safe row spawning -> collection/rating -> audio -> update ->
   * lighting/player/HUD rendering -> input and main loop.
   * update() owns animation time. render() must never grant items or advance play.
   */
  const scoreEvents = EVENTS.slice().sort((a, b) => a.at - b.at);

  const W = WORLD.width, H = WORLD.height, CX = W / 2;
  const ROAD_WIDTH = WORLD.roadWidth;
  const S = ROAD_WIDTH / 189;
  const ROAD_LEFT = (W - ROAD_WIDTH) / 2;
  const ROAD_RIGHT = ROAD_LEFT + ROAD_WIDTH;
  const LANE_WIDTH = ROAD_WIDTH / WORLD.laneCount;
  const PLAYER_Y = WORLD.playerY;

  const PAVEMENT_WIDTH = WORLD.pavementWidth;
  const BUILDING_WIDTH = ROAD_LEFT - PAVEMENT_WIDTH; // 89 at the current design size
  const STREET_SEGMENT_H = WORLD.streetSegmentHeight;
  const BUILDING_H = WORLD.buildingHeight;
  const DETAIL_H = STREET_SEGMENT_H - BUILDING_H;

  const PROPS = DETAILS.map(definition => ({ ...definition }));
  PROPS.forEach(p => { if (p.file) { p.img = new Image(); p.img.src = p.file; } });

  const $ = id => document.getElementById(id);
  const cv = $('c');
  const ctx = cv.getContext('2d');
  const stage = $('stage');
  const garyAudio = $('garyAudio');
  const introAvatarCv = $('introAvatar');
  const introCtx = introAvatarCv.getContext('2d');

  let K = 1;
  let state = 'menu';
  let score = 0, best = 0, tierMax = 0;
  let lane = 1, target = 1;
  let scrollY = 0, distance = 0, acc = 0, gap = 1.1;
  let objs = [], fx = [], cap = null, mile = 0, crashT = 0, clock = 0, uid = 0;
  let grinTimer = 0, stars = [], lastTierIndex = 0, nextEvent = 0, nextRow = 0, roadQueue = [], nearCd = 0, lastHit = null, shownSpeed = 200, flash = 0;
  let review = 0, reviewMul = 1, reviewGap = 0, hitStop = 0, laneSquash = 0;
  let lastLanes = ['none', 'none', 'none'];
  let playTime = 0, nightMix = 0;
  // Night biome. NIGHT_MODE is the switch: false stays daylight, true is the night street.
  // It stays off on the menu. A run fades into night once the first shop plan has passed.
  // Set NIGHT_PREVIEW to true to see night from the first frame of play.
  const NIGHT_MODE = true;
  const NIGHT_PREVIEW = false;
  const NIGHT_FADE = 6;
  let nightOn = false;
  // Rain is presentation. It does not touch speed, spawns, or collision.
  // ?rain=1 ramps the storm as soon as play starts, for a visual check.
  const RAIN_PREVIEW = /(?:\?|&)rain=1(?:&|$)/.test(location.search);
  const STREAK_COUNT = 126;
  const SPLASH_COUNT = 34;
  let nightHeld = 0, rainMix = 0, rainSaid = false;
let shutterMix = 0;
  let rainGain = null;
  const streaks = [];
  const splashes = [];
  for (let i = 0; i < STREAK_COUNT; i++) streaks.push(makeStreak(false));
  for (let i = 0; i < SPLASH_COUNT; i++) splashes.push(makeSplash(true));

  let performance = {
    foodSpawned: 0,
    foodEaten: 0,
    hazardsPassed: 0,
    collisions: 0,
    laneChanges: 0,
    nearMisses: 0,
    dareRefusals: 0,
    distance: 0
  };

  let finalRating = 1;

  let audioCtx, analyser, dataArray;

  const MUSIC_VOL = 0.2;        // normal level during play (0 to 1). Keep it low: sound effects are coming.
  const MUSIC_INTRO_VOL = 0.12; // quieter while Gary's intro voice plays
  const MUSIC_FADE_IN = 4;      // seconds
  const music = new Audio('gary_theme_song.mp3?v=1');
  music.loop = true;
  music.preload = 'auto';
  let musicGain = null, musicOn = false;
  let introAnimTimer = 0;
  let introAttempt = 0, introFallbackTimer = null;
  let gameOverFrameRequest = null;

  let streetLoaded = false;
  let loadErrorLog = [];

  /* -------------------------------------------------------------------------- */
  /* Gary assets                                                                */
  /* -------------------------------------------------------------------------- */

  function loadGary(file, validate) {
    const img = new Image();
    img.onload = () => { img.ready = validate ? validate(img) : true; };
    img.onerror = () => { loadErrorLog.push(file + ' not found'); };
    img.src = file;
    return img;
  }

  // Geometry checks catch bad sheet dimensions, not visual style or alpha fringes.
  // See ASSET_GRID_PROMPT.txt for the separate human visual acceptance gate.
  function validateSheet(img, label, columns, rows, frameWidth, frameHeight) {
    const width = img.naturalWidth, height = img.naturalHeight;
    const valid = width > 0 && height > 0 && width % columns === 0 && height % rows === 0
      && (!frameWidth || width === columns * frameWidth)
      && (!frameHeight || height === rows * frameHeight);
    if (!valid) loadErrorLog.push(label + ': incompatible sprite-sheet dimensions');
    return valid;
  }
  const imgWalkSheet = loadGary(GARY_SPRITES.walk.file, img =>
    validateSheet(img, 'Gary walk', GARY_SPRITES.walk.columns, GARY_SPRITES.walk.rows));

  const WALK_FRAMES = GARY_SPRITES.walk.columns;
  const WALK_FRAME_TIME = GARY_SPRITES.walk.frameTime;

  const imgRun = GARY_SPRITES.gameOver.map(file => loadGary(file));
  const imgCheer = loadGary(GARY_SPRITES.cheer);
  const imgCrash = loadGary(GARY_SPRITES.crash);
  let runFrame = 0, runTimer = 0;

  const imgGaryIntro = new Image();

  let garyIntroLoaded = false;

  imgGaryIntro.onload = () => {
    const spec = GARY_SPRITES.intro;
    garyIntroLoaded = validateSheet(imgGaryIntro, 'Gary intro', spec.columns, spec.rows, spec.frameWidth, spec.frameHeight);
  };

  imgGaryIntro.onerror = () => {
    loadErrorLog.push('gary_intro_sheet.PNG not found');
  };

  imgGaryIntro.src = GARY_SPRITES.intro.file;

  const GARY_INTRO_COLS = GARY_SPRITES.intro.columns;
  const GARY_INTRO_ROWS = GARY_SPRITES.intro.rows;
  const GARY_INTRO_FRAME_W = GARY_SPRITES.intro.frameWidth;
  const GARY_INTRO_FRAME_H = GARY_SPRITES.intro.frameHeight;
  const GARY_INTRO_FRAME_TIME = GARY_SPRITES.intro.frameTime;

  let garyIntroFrame = 0;
  let garyIntroFrameTimer = 0;

  /* -------------------------------------------------------------------------- */
  /* High-street sprite library                                                 */
  /* -------------------------------------------------------------------------- */

  /*
    The sprite sheet is a reusable library rather than a fixed six-shop street.
    Adding more buildings later only requires another entry in BUILDINGS and,
    when supplied, its matching keeper entry in KEEPERS.

    Source sheet: 2912 x 2688.
    Buildings occupy the top row, keepers the middle row, street props the bottom.
  */
  // BUILDINGS is authored in game-data.js.

  // KEEPERS is authored in game-data.js.


  const imgStreet = new Image();
  imgStreet.onload = () => {
    streetLoaded = validateSheet(imgStreet, 'Street atlas', 1, 1, STREET_ATLAS.width, STREET_ATLAS.height);
  };
  imgStreet.onerror = () => { loadErrorLog.push('high_street_sprites.webp not found'); };
  imgStreet.src = STREET_ATLAS.file;

  // COBBLE_KINDS is authored in game-data.js.
  const cobbleImgs = {};
  Object.entries(COBBLE_KINDS).forEach(([kind, file]) => {
    const img = new Image();
    img.onload = () => { img.ready = true; };
    img.onerror = () => { loadErrorLog.push(file + ' not found'); };
    img.src = file;
    cobbleImgs[kind] = img;
  });
  cobbleImgs.moss = cobbleImgs.damp = cobbleImgs.base;

  /*
    Each building has an intentional detail zone underneath it. The gap is
    deliberately kept as a separate rendering layer so we can later add:
    cobbles, postboxes, bins, lamps, planters, bikes, signs and other street
    dressing without changing the building system.
  */
  function shopByName(name) {
    if (!name || name === 'none') return -1;
    return BUILDINGS.findIndex(b => b.name === name);
  }


  function sideSlot(plan, side, slot) {
    if (slot === 'middle') return plan[side + 'Middle'] || plan[side + 'Object'] || 'none';
    const key = side + slot.charAt(0).toUpperCase() + slot.slice(1);
    return plan[key] || 'none';
  }

  function drawGroundPatch(x, y, w, h, kind) {
    if (kind !== 'damp' || h < 20) return;
    const cx = x + w * 0.5, cy = y + h * 0.72;
    const wash = ctx.createRadialGradient(cx, cy, 4, cx, cy, w * 0.42);
    wash.addColorStop(0, 'rgba(18,22,26,.28)');
    wash.addColorStop(1, 'rgba(18,22,26,0)');
    ctx.fillStyle = wash;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.4, h * 0.32, 0, 0, 7);
    ctx.fill();
  }



  function drawSideLayers(x, y, w, h, plan, side) {
    drawDetailZone(x, y, w, h * 0.75, sideSlot(plan, side, 'back'), side);
    drawDetailZone(x, y, w, h, sideSlot(plan, side, 'middle'), side);
    drawDetailZone(x, y + h * 0.4, w, h * 0.6, sideSlot(plan, side, 'front'), side);
  }

  const lampGlows = [];
  const lampHeads = [];

  function drawDetailZone(x, y, w, h, objectName, side) {
    if (!objectName || objectName === 'none' || h < 28) return;
    const prop = PROPS.find(p => p.name === objectName);
    if (!prop) return;
    const cap = prop.cap || (objectName === 'bin' ? 46 : 72);
    const propH = Math.min(cap, h - 6);
    const propW = propH * (prop.w / prop.h);
    const shift = objectName === 'lamp' ? 0 : ((objectName.length * 17 + Math.round(x)) % 11) - 5;
    let px = x + w * 0.5 - propW / 2 + shift;
    // Stand the lamp on the kerb. The pavement between the shop and the road is only a few pixels wide.
    if (objectName === 'lamp') px = side === 'left' ? ROAD_LEFT - propW : ROAD_RIGHT + 3;
    const py = y + h - propH + 2;
    if (objectName === 'lamp') {
      lampGlows.push(py + propH * 0.45);
      lampHeads.push(px + propW * 0.5, py + propH * 0.08);
    }
    const foot = px + propW / 2;
    const cast = side === 'right' ? 8 : -8;
    ctx.save();
    ctx.fillStyle = 'rgba(12,14,18,.35)';
    ctx.beginPath();
    ctx.ellipse(foot + cast, y + h - 3, Math.max(8, propW * 0.34), 4, 0, 0, 7);
    ctx.fill();
    if (objectName === 'bin' || objectName === 'tree') {
      ctx.fillStyle = 'rgba(40,48,42,.28)';
      ctx.beginPath();
      ctx.ellipse(foot + 6, y + h - 2, 7, 3, 0, 0, 7);
      ctx.fill();
    }
    ctx.restore();
    if (prop.file && prop.img && prop.img.complete && prop.img.naturalWidth) {
      const frames = prop.frames || 1;
      const fw = prop.img.naturalWidth / frames;
      const fh = prop.img.naturalHeight;
      const frame = frames > 1 ? Math.floor(clock / 0.7) % frames : 0;
      ctx.save();
      if (objectName === 'bench' && side === 'right') {
        ctx.translate(px + propW, py);
        ctx.scale(-1, 1);
        ctx.drawImage(prop.img, frame * fw, 0, fw, fh, 0, 0, propW, propH);
      } else ctx.drawImage(prop.img, frame * fw, 0, fw, fh, px, py, propW, propH);
      ctx.restore();
      return;
    }
    if (!streetLoaded || prop.x == null) return;
    ctx.drawImage(imgStreet, prop.x, prop.y, prop.w, prop.h, px, py, propW, propH);
  }

  /*
    The source buildings contain a posed shopkeeper. Separate keeper sprites
    are clipped into the calibrated window, with restrained movement and sheen.
    This pass does not erase baked figures: inspect replacement art for duplicates.
  */
  // One set of window fractions. The keeper and the night light both use this,
  // so a later shop change stays aligned.
  // SHOP_PANES is authored in game-data.js.

  function shopWindowRect(index, x, y, w, h) {
    const pane = SHOP_PANES[index] || SHOP_PANES[0];
    return {
      x: x + w * pane.x,
      y: y + h * pane.y,
      w: w * pane.w,
      h: h * pane.h
    };
  }

  // Studio-controlled keeper position and movement. All units are local shop pixels.
  const shopKeeperSpecs = Object.create(null);
  const defaultKeeperSize = [1,1,1,1.55,1,1];
  const defaultKeeperDrop = [0.16,0.16,0,0.22,0,0.16];
  BUILDINGS.forEach((b,i)=>{shopKeeperSpecs[b.name]={offsetX:0,offsetY:0,scale:1,idleAmount:1,cheerAmount:1};});
  function applyPublishedKeepers(config){
    const defs=config?.shopKeepers;
    if(!defs||typeof defs!=='object')return;
    for(const b of BUILDINGS){const d=defs[b.name];if(!d)continue;
      if(!['offsetX','offsetY','scale','idleAmount','cheerAmount'].every(k=>Number.isFinite(d[k])))continue;
      if(Math.abs(d.offsetX)>89||Math.abs(d.offsetY)>236||d.scale<0.25||d.scale>2.5||d.idleAmount<0||d.idleAmount>3||d.cheerAmount<0||d.cheerAmount>3)continue;
      shopKeeperSpecs[b.name]={offsetX:d.offsetX,offsetY:d.offsetY,scale:d.scale,idleAmount:d.idleAmount,cheerAmount:d.cheerAmount,clip:rectIsValid(d.clip)?{...d.clip}:null};
    }
  }
  function drawKeeper(index, x, y, w, h, phaseSeed) {
    const keeper = KEEPERS[index];
    if (!streetLoaded || !keeper) return;

    // Glass under the awning. Most fronts have the door on the right, so the
    // pane is left of centre. Red Lion is a wider glazed front.
    const win = shopWindowRect(index, x, y, w, h);
    const wx = win.x, wy = win.y, ww = win.w, wh = win.h;

    const spec = shopKeeperSpecs[BUILDINGS[index]?.name] || {offsetX:0,offsetY:0,scale:1,idleAmount:1,cheerAmount:1};
    const phase = clock * 2.1 + phaseSeed;
    const ahead = PLAYER_Y - (y + h * 0.72);
    const near = ahead > -40 && ahead < 150;
    const cheer = (near ? Math.max(0, Math.sin(clock * 10)) : 0) * spec.cheerAmount;
    const bob = Math.sin(phase) * 0.7 * spec.idleAmount - cheer * 5;
    const breathe = 1 + Math.sin(phase * 0.9 + 0.8) * 0.012 * spec.idleAmount + cheer * 0.06;
    const shift = Math.sin(clock * 0.75 + phaseSeed * 1.7) * 0.6 * spec.idleAmount;

    // Other windows are large, so the keeper fills them. The pub glass is smaller,
    // so match the other keepers' size and let the frame crop him.
    const size = (defaultKeeperSize[index] || 1) * spec.scale;
    const fitH = wh * 0.96 * size;
    const fitW = ww * 0.86 * size;
    let keeperH = fitH;
    let keeperW = keeperH * (keeper.w / keeper.h);
    if (keeperW > fitW) {
      keeperW = fitW;
      keeperH = keeperW * (keeper.h / keeper.w);
    }
    const baseX = wx + ww * 0.5 + shift + spec.offsetX;
    const drop = wh * (defaultKeeperDrop[index] || 0) + spec.offsetY;
    const baseY = wy + wh - 1 + bob + drop;

    // Visible window clip from Visual Studio v1.5 (position remains independent).
    const visible = spec.clip ? {x:x+spec.clip.x,y:y+spec.clip.y,w:spec.clip.w,h:spec.clip.h} : win;
    ctx.save();
    ctx.beginPath();
    ctx.rect(visible.x + 1, visible.y + 1, Math.max(1, visible.w - 2), Math.max(1, visible.h - 2));
    ctx.clip();

    ctx.translate(baseX, baseY);
    ctx.scale(1, breathe);
    ctx.drawImage(
      imgStreet,
      keeper.x, keeper.y, keeper.w, keeper.h,
      -keeperW / 2,
      -keeperH,
      keeperW,
      keeperH
    );
    ctx.restore();

    // A light sheen keeps them reading as behind the glass, not stuck on it.
    ctx.save();
    ctx.beginPath();
    ctx.rect(wx, wy, ww, wh);
    ctx.clip();
    const sheen = ctx.createLinearGradient(wx, wy, wx + ww * 0.65, wy + wh);
    sheen.addColorStop(0, 'rgba(255,255,255,0.055)');
    sheen.addColorStop(0.38, 'rgba(255,255,255,0)');
    sheen.addColorStop(1, 'rgba(8,16,28,0.045)');
    ctx.fillStyle = sheen;
    ctx.fillRect(wx, wy, ww, wh);
    ctx.restore();
  }

  function drawStreetBuilding(buildingIndex, x, y, w, h, phaseSeed, seed) {
    if (buildingIndex < 0) return;
    const b = BUILDINGS[buildingIndex];
    if (!streetLoaded || !b) return;

    ctx.drawImage(imgStreet, b.x, b.y, b.w, b.h, x, y, w, h);
    if (nightOn) {
      ctx.save();
      ctx.globalAlpha = nightMix;
      paintWindowLight(b.keeper, x, y, w, h, seed || 0);
      ctx.restore();
    }
    drawKeeper(b.keeper, x, y, w, h, phaseSeed);
  }

  function cobbleFor(kind) {
    const img = cobbleImgs[kind] || cobbleImgs.weeds;
    return img && img.ready ? img : (cobbleImgs.weeds && cobbleImgs.weeds.ready ? cobbleImgs.weeds : null);
  }

  const COBBLE_CELL = WORLD.cobbleCell;
  const COBBLE_MIX = [['base',0.50],['light',0.12],['sparse',0.08],['weeds',0.07],['dense',0.04],['leaves',0.08],['grime',0.05],['cracked',0.06]];
  function cellHash(c, r) {
    let h = Math.imul(c, 374761393) + Math.imul(r, 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function mixKind(c, r) {
    const t = cellHash(c, r);
    let acc = 0;
    for (const [k, p] of COBBLE_MIX) { acc += p; if (t < acc) return k; }
    return 'base';
  }
  function drawCobbles(x, y, w, h, kind) {
    const C = COBBLE_CELL;
    const off = ((scrollY % C) + C) % C;
    const shift = Math.floor(scrollY / C);
    const j0 = Math.floor((y - off) / C);
    const c0 = Math.floor(x / C);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    for (let j = j0; j * C + off < y + h; j++) {
      const ty = j * C + off;
      const r = j - shift;
      for (let c = c0; c * C < x + w; c++) {
        const k = (!kind || kind === 'base') ? mixKind(c, r) : kind;
        const img = cobbleFor(k);
        if (!img) { ctx.fillStyle = '#6e7276'; ctx.fillRect(c * C, ty, C + 0.5, C + 0.5); continue; }
        const hw = img.naturalWidth / 2, hh = img.naturalHeight / 2;
        ctx.drawImage(img, (((c % 2) + 2) % 2) * hw, (((r % 2) + 2) % 2) * hh, hw, hh, c * C, ty, C + 0.5, C + 0.5);
      }
    }
    ctx.restore();
  }

  function forEachStreetFront(cb) {
    const peek = 56;
    const base = Math.floor((distance + peek) / STREET_SEGMENT_H);
    for (let pass = -1; pass <= 3; pass++) {
      const index = base + pass;
      if (index < 0) continue;
      const y = distance - index * STREET_SEGMENT_H + (STREET_SEGMENT_H - peek);
      const plan = STREET[((index % STREET.length) + STREET.length) % STREET.length];
      cb(plan, index, y);
    }
  }

  function drawHighStreet() {
    ctx.fillStyle = '#1a1e24';
    ctx.fillRect(0, 0, W, H);

    // Cobbles sit behind the shops, so the space around each chimney is pavement.
    const leftW = ROAD_LEFT;
    const rightX = ROAD_RIGHT;
    drawCobbles(0, 0, leftW, H, 'base');
    drawCobbles(rightX, 0, W - rightX, H, 'base');

    if (!streetLoaded) {
      ctx.fillStyle = '#3a3030';
      ctx.fillRect(0, 0, ROAD_LEFT - PAVEMENT_WIDTH, H);
      ctx.fillStyle = '#30343a';
      ctx.fillRect(ROAD_RIGHT + PAVEMENT_WIDTH, 0, W - ROAD_RIGHT - PAVEMENT_WIDTH, H);
      return;
    }

    // The next roof stays just above the screen, so a shop approaches instead of popping in.
    forEachStreetFront((plan, index, y) => {
      drawStreetBuilding(
        shopByName(plan.left), 0, y, BUILDING_WIDTH, BUILDING_H, false, index * 2.1 + 0.4
      );
      drawCobbles(0, y + BUILDING_H, BUILDING_WIDTH, DETAIL_H, plan.leftGround || 'weeds');
      drawSideLayers(0, y + BUILDING_H, BUILDING_WIDTH, DETAIL_H, plan, 'left');
      drawGroundPatch(0, y + BUILDING_H, BUILDING_WIDTH, DETAIL_H, plan.leftGround);

      drawStreetBuilding(
        shopByName(plan.right), ROAD_RIGHT + PAVEMENT_WIDTH, y,
        W - ROAD_RIGHT - PAVEMENT_WIDTH, BUILDING_H, true, index * 2.1 + 2.7
      );
      drawCobbles(ROAD_RIGHT + PAVEMENT_WIDTH, y + BUILDING_H, W - ROAD_RIGHT - PAVEMENT_WIDTH, DETAIL_H, plan.rightGround || 'weeds');
      drawSideLayers(
        ROAD_RIGHT + PAVEMENT_WIDTH, y + BUILDING_H,
        W - ROAD_RIGHT - PAVEMENT_WIDTH, DETAIL_H, plan, 'right'
      );
      drawGroundPatch(ROAD_RIGHT + PAVEMENT_WIDTH, y + BUILDING_H, W - ROAD_RIGHT - PAVEMENT_WIDTH, DETAIL_H, plan.rightGround);
    });
  }

  function drawPavements() {
    // A light kerb, not a dark slot, so the shop front does not fuse with the road.
    ctx.fillStyle = '#c4c2bc';
    ctx.fillRect(ROAD_LEFT - 3, 0, 3, H);
    ctx.fillRect(ROAD_RIGHT, 0, 3, H);
    ctx.fillStyle = '#8d8a84';
    ctx.fillRect(ROAD_LEFT - 1, 0, 1, H);
    ctx.fillRect(ROAD_RIGHT, 0, 1, H);
  }

  function mk(fn) {
    const s = document.createElement('canvas');
    s.width = s.height = 120;
    const c = s.getContext('2d');
    c.translate(60, 60);
    c.lineJoin = 'round';
    c.lineCap = 'round';
    fn(c);
    return s;
  }

  function dMush(c) {
    c.lineWidth=3; c.strokeStyle='#2b1810'; c.fillStyle='#f5eedc';
    c.beginPath(); c.moveTo(-12,5); c.lineTo(-10,38); c.lineTo(10,38); c.lineTo(12,5); c.closePath(); c.fill(); c.stroke();
    c.fillStyle='#8a5a36'; c.beginPath(); c.arc(0,5,32,Math.PI,0); c.closePath(); c.fill(); c.stroke();
  }
  function dFork(c) {
    c.lineWidth=3; c.strokeStyle='#a0b0c0'; c.fillStyle='#e8f2fc';
    c.fillRect(-6,-10,12,48); c.strokeRect(-6,-10,12,48);
    [-14,-6,2,10].forEach(x=>{c.fillRect(x,-42,4,34);c.strokeRect(x,-42,4,34);});
    c.fillRect(-16,-12,32,8); c.strokeRect(-16,-12,32,8);
  }
  function dKebab(c) {
    c.lineWidth=3; c.strokeStyle='#4a2a10'; c.fillStyle='#5aa832';
    [[-18,-6],[0,-12],[18,-6]].forEach(([x,y])=>{c.beginPath();c.ellipse(x,y,12,8,0,0,7);c.fill();c.stroke();});
    c.fillStyle='#8a4b22'; [[-10,-14],[6,-16],[-2,-6],[12,-8]].forEach(([x,y])=>{c.beginPath();c.ellipse(x,y,11,6,0,0,7);c.fill();c.stroke();});
    c.fillStyle='#d8322c'; [[-16,-12],[16,-14]].forEach(([x,y])=>{c.beginPath();c.ellipse(x,y,6,4,0,0,7);c.fill();c.stroke();});
    c.fillStyle='#f2cf8c'; c.beginPath(); c.ellipse(0,4,28,24,0,0,Math.PI); c.closePath(); c.fill(); c.stroke();
  }
  function dFish(c) {
    c.lineWidth=3; c.strokeStyle='#4a3208'; c.fillStyle='#ffd23f';
    [[-18,-3,-.3],[-8,-6,-.1],[2,-8,.05],[12,-6,.2],[22,-3,.4]].forEach(([x,y,a])=>{c.save();c.translate(x,y);c.rotate(a);c.fillRect(-3.5,-22,7,26);c.strokeRect(-3.5,-22,7,26);c.restore();});
    c.save(); c.translate(-2,-6); c.rotate(-.45); c.fillStyle='#e9a23b';
    c.beginPath();c.ellipse(0,0,24,10,0,0,7);c.fill();c.stroke();
    c.beginPath();c.moveTo(22,0);c.lineTo(32,-8);c.lineTo(32,8);c.closePath();c.fill();c.stroke();c.restore();
    c.fillStyle='#fff'; c.beginPath();c.moveTo(-26,3);c.lineTo(26,3);c.lineTo(20,32);c.lineTo(-20,32);c.closePath();c.fill();
    c.fillStyle='#1f5fbf'; [-20,-8,4,16].forEach(x=>{c.beginPath();c.moveTo(x,3);c.lineTo(x+6,3);c.lineTo((x+6)*.79,32);c.lineTo(x*.79,32);c.closePath();c.fill();});
    c.beginPath();c.moveTo(-26,3);c.lineTo(26,3);c.lineTo(20,32);c.lineTo(-20,32);c.closePath();c.stroke();
  }
  function dRoast(c) {
    c.lineWidth=3; c.strokeStyle='#3a2a10'; c.fillStyle='#fff';
    c.beginPath();c.ellipse(0,12,38,20,0,0,7);c.fill();c.stroke();
    c.fillStyle='#e6edf4';c.beginPath();c.ellipse(0,12,28,15,0,0,7);c.fill();
    c.fillStyle='#7a4318';c.beginPath();c.ellipse(3,14,21,9,0,0,7);c.fill();
    c.fillStyle='#f0b640';[[-24,8],[-18,16]].forEach(([x,y])=>{c.beginPath();c.ellipse(x,y,8,5,.3,0,0,7);c.fill();c.stroke();});
    c.fillStyle='#b4573f';[[-8,5,-.3],[3,3,.1]].forEach(([x,y,a])=>{c.save();c.translate(x,y);c.rotate(a);c.beginPath();c.ellipse(0,0,13,7,0,0,7);c.fill();c.stroke();c.restore();});
    c.fillStyle='#e9b04f';c.beginPath();c.moveTo(12,8);c.lineTo(15,-10);c.quadraticCurveTo(22,-18,29,-10);c.lineTo(32,8);c.quadraticCurveTo(22,14,12,8);c.closePath();c.fill();c.stroke();
    c.fillStyle='#4caf3a';[[-5,20],[2,23],[-11,23],[6,18]].forEach(([x,y])=>{c.beginPath();c.arc(x,y,3,0,7);c.fill();});
  }

  const itemImages = Object.fromEntries(Object.entries(ITEMS)
    .filter(([, item]) => item.file)
    .map(([id, item]) => [id, loadGary(item.file)]));
  const SP = { m: mk(dMush), fork: mk(dFork), kebab: mk(dKebab), fish: mk(dFish), roast: mk(dRoast) };

  function rr(c,x,y,w,h,r) {
    c.beginPath(); c.moveTo(x+r,y);
    c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r);
    c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath();
  }
  function txt(s,x,y,size,col,al) {
    ctx.font='900 '+size+'px "Arial Black",Impact,sans-serif';
    ctx.textAlign=al;ctx.textBaseline='middle';ctx.lineWidth=4;ctx.lineJoin='round';
    ctx.strokeStyle='rgba(0,0,0,.85)';ctx.strokeText(s,x,y);ctx.fillStyle=col;ctx.fillText(s,x,y);
  }
  function fbFace(c,r) {
    c.fillStyle='#ffd166';c.strokeStyle='#4a2a10';c.lineWidth=4;
    c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();c.stroke();
    c.fillStyle='#222';c.beginPath();c.arc(-r*.35,-r*.2,r*.12,0,Math.PI*2);c.arc(r*.35,-r*.2,r*.12,0,Math.PI*2);c.fill();
    c.beginPath();c.arc(0,0,r*.5,.15*Math.PI,.85*Math.PI);c.stroke();
  }

  function lx(l) { return ROAD_LEFT + (l + 0.5) * LANE_WIDTH; }

  function triggerGrin() {
    grinTimer=1.3;
    const px=lx(lane);
    for(let i=0;i<20;i++){
      const angle=Math.random()*Math.PI*2, speed=40+Math.random()*90, side=Math.random()<.5?-30:30;
      stars.push({x:px+side,y:PLAYER_Y-35,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:.6+Math.random()*.5,maxLife:1.1,size:4+Math.random()*5});
    }
  }
  function reset() {
    if (gameOverFrameRequest !== null) cancelAnimationFrame(gameOverFrameRequest);
    gameOverFrameRequest = null;
    runFrame = runTimer = garyIntroFrame = garyIntroFrameTimer = introAnimTimer = 0;
    score = tierMax = lastTierIndex = scrollY = distance = acc = 0;
    lane = target = 1;
    gap = LEARN_GAP;
    playTime = nightMix = nightHeld = rainMix = shutterMix = 0;
    nightOn = false;
    rainSaid = false;
    shopClosureStarted.clear();
    objs = [];
    fx = [];
    stars = [];
    roadQueue = [];
    cap = lastHit = null;
    mile = crashT = grinTimer = nextEvent = nextRow = nearCd = flash = 0;
    review = reviewGap = hitStop = laneSquash = clock = uid = 0;
    reviewMul = 1;
    shownSpeed = 200;
    lastLanes = ['none', 'none', 'none'];
    performance = {
      foodSpawned: 0,
      foodEaten: 0,
      hazardsPassed: 0,
      collisions: 0,
      laneChanges: 0,
      nearMisses: 0,
      dareRefusals: 0,
      distance: 0
    };
    finalRating = 1;
  }
  function move(direction) {
    if (state !== 'play') return;
    const next = Math.max(0, Math.min(WORLD.laneCount - 1, target + direction));
    if (next !== target) {
      laneSquash = 0.09;
      performance.laneChanges++;
    }
    target = next;
  }

  /* layout:start
     Gaps are seconds. The street can speed up without shortening the read.
     Learning floor is 1.1s. At the cap it is 0.8s. A dare is a longer read than a plate.
     The row after a dare sits past the 1.5s review unless the roast itself was taken.
  */
  const LEARN_GAP = 1.1;
  const RUN_GAP = 0.8;
  const GAP_SLACK = 0.18;
  const DARE_APPROACH = 1.22;
  const AFTER_DARE = 1.1;
  function isFood(kind) { return ITEMS[kind]?.kind === 'food'; }
  function isHazard(kind) { return ITEMS[kind]?.kind === 'hazard'; }
  function isSafeKind(kind) { return !kind || kind === 'none' || isFood(kind); }
  function safeLanesOf(lanes) {
    const out = [];
    for (let i = 0; i < 3; i++) if (isSafeKind(lanes[i])) out.push(i);
    return out;
  }
  function hasFood(lanes) { return lanes.some(isFood); }
  function paceGap() {
    if (score < 250) return LEARN_GAP;
    const t = Math.min(1, (score - 250) / 650);
    return LEARN_GAP + (RUN_GAP - LEARN_GAP) * t;
  }
  function gapBefore(nextRow, prevRow) {
    if (nextRow && nextRow.dare) return DARE_APPROACH;
    if (prevRow && prevRow.dare) return AFTER_DARE;
    return paceGap() + Math.random() * GAP_SLACK;
  }
  function forceShare(prev, lanes) {
    const next = lanes.slice();
    if (!safeLanesOf(next).length) next[1] = 'none';
    const prevSafe = safeLanesOf(prev);
    if (!prevSafe.length || prevSafe.some(i => isSafeKind(next[i]))) return next;
    next[prevSafe.indexOf(1) >= 0 ? 1 : prevSafe[0]] = 'none';
    return next;
  }
  function placePlate(prev, lanes) {
    const next = lanes.slice();
    if (hasFood(next) || !hasFood(prev)) return next;
    const stay = [];
    prev.forEach((k, i) => { if (isFood(k)) stay.push(i); });
    let slot = -1;
    for (const i of stay) if (!next[i] || next[i] === 'none') { slot = i; break; }
    if (slot < 0) {
      for (const i of safeLanesOf(prev)) if (!next[i] || next[i] === 'none') { slot = i; break; }
    }
    if (slot >= 0) next[slot] = 'kebab';
    return next;
  }
  function prepareRow(prev, row) {
    return { lanes: placePlate(prev, forceShare(prev, row.lanes)), dare: row.dare || false };
  }
  function cloneStretch(rows) {
    return rows.map(lanes => ({ lanes: lanes.slice(), dare: false }));
  }
  function insertDare(stretch, prev) {
    const dare = { lanes: ['m', 'roast', 'm'], dare: true };
    for (let i = 0; i <= stretch.length; i++) {
      const before = i === 0 ? prev : stretch[i - 1].lanes;
      const after = i === stretch.length ? null : stretch[i].lanes;
      if (isSafeKind(before[1]) && (!after || isSafeKind(after[1]))) {
        stretch.splice(i, 0, dare);
        return;
      }
    }
    stretch.unshift({ lanes: ['none', 'kebab', 'none'], dare: false });
    stretch.splice(1, 0, dare);
  }
  function nextStretch() {
    const bag = score < 250 ? STRETCHES.early : score < 900 ? STRETCHES.mid : STRETCHES.late;
    const stretch = cloneStretch(bag[Math.floor(Math.random() * bag.length)]);
    const dareLive = objs.some(o => o.dare && !o.d);
    if (score >= 900 && !dareLive && !stretch.some(row => row.dare)) insertDare(stretch, lastLanes);
    let prev = lastLanes;
    const out = [];
    for (const row of stretch) {
      const ready = prepareRow(prev, row);
      out.push(ready);
      prev = ready.lanes;
    }
    return out;
  }
  function spawnRow() {
    if (!roadQueue.length) roadQueue = nextStretch();
    const row = roadQueue.shift();
    row.lanes.forEach((kind, laneIndex) => {
      if (!kind || kind === 'none') return;
      if (!ITEMS[kind]) {
        if (!loadErrorLog.includes('Unknown item: ' + kind)) loadErrorLog.push('Unknown item: ' + kind);
        return;
      }
      const item = { t: kind, l: laneIndex, y: -60, id: uid++ };
      if (row.dare && kind === 'roast') item.dare = 1;
      objs.push(item);
      if (isFood(kind)) performance.foodSpawned++;
    });
    lastLanes = row.lanes.slice();
    if (!roadQueue.length) roadQueue = nextStretch();
    gap = gapBefore(roadQueue[0], row);
  }
  /* layout:end */
  function collect(o) {
    if (!isFood(o.t)) return;
    review = Math.min(9, review + 1);
    reviewGap = 1.5;
    reviewMul = review >= 5 ? 3 : review >= 3 ? 2 : 1;
    const pts = ITEMS[o.t].points * reviewMul;
    score += pts;
    performance.foodEaten++;
    const col = (TIERS[tierOf(score)] || TIERS[0]).c;
    fx.push({x:lx(o.l),y:o.y,t:0,life:1.1,txt:'+'+pts,col:col,pop:1});
    let grin = o.t === 'roast' || review === 3 || review === 6;
    if (o.dare) {
      grin = true;
      cap = { s: CAPS[review % CAPS.length], t: 0 };
    }
    const currentTier = tierOf(score);
    if (currentTier > lastTierIndex) { lastTierIndex = currentTier; grin = true; }
    if (grin) triggerGrin();
    tierMax = Math.max(tierMax, currentTier);
    checkEvents();
    mile = Math.floor(score / 40);
  }
  function checkEvents() {
    while (nextEvent < scoreEvents.length && score >= scoreEvents[nextEvent].at) {
      const ev = scoreEvents[nextEvent++];
      if (ev.say) cap = { s: ev.say, t: 0 };
      if (ev.grin) triggerGrin();
    }
  }
  function crash(hitType){
    performance.collisions++;
    crashT=0;lastHit=hitType;cap=null;state='crash_'+hitType;
  }
  function calculatePerformanceRating() {
    const survivalScore =
      Math.min(performance.distance / 1800, 1);

    const foodScore =
      performance.foodSpawned > 0
        ? Math.min(
            performance.foodEaten / performance.foodSpawned,
            1
          )
        : 0;

    const hazardAttempts =
      performance.hazardsPassed +
      performance.collisions;

    const avoidanceScore =
      hazardAttempts > 0
        ? performance.hazardsPassed / hazardAttempts
        : 1;

    const nearMissScore =
      Math.min(performance.nearMisses / 8, 1);

    const movementPenalty =
      Math.min(
        Math.max(performance.laneChanges - 20, 0) / 40,
        1
      );

    let rating =
        survivalScore * 3.0
      + foodScore * 2.5
      + avoidanceScore * 2.5
      + nearMissScore * 2.0
      - movementPenalty * 0.5;

    rating = Math.max(1, Math.min(10, rating));

    return Math.round(rating);
  }
  function animateGameOverGary() {
    if (gameOverFrameRequest !== null) cancelAnimationFrame(gameOverFrameRequest);
    gameOverFrameRequest = null;
    const canvas = document.getElementById("overAvatar");
    if (!canvas) return;
    const ctxOver = canvas.getContext("2d");
    let frame = 0;
    let lastTime = window.performance.now();

    function draw(time) {
      const over = document.getElementById("over");
      if (!document.getElementById("overAvatar") || !over || !over.classList.contains("show")) return;

      const dt = time - lastTime;
      lastTime = time;

      if (dt > 0) {
        frame += dt / 1000;
      }

      ctxOver.clearRect(0, 0, canvas.width, canvas.height);

      const img = imgRun[Math.floor(frame * 6) % imgRun.length];

      if (img && img.complete && img.naturalWidth > 0) {
        const scale = 120 / Math.max(img.naturalWidth, img.naturalHeight);
        const width = img.naturalWidth * scale, height = img.naturalHeight * scale;
        ctxOver.drawImage(img, (canvas.width - width) / 2,
          (canvas.height - height) / 2, width, height);
      }

      gameOverFrameRequest = requestAnimationFrame(draw);
    }

    gameOverFrameRequest = requestAnimationFrame(draw);
  }
  function endGame(){
    state='over';cap=null;
    if(score>best){best=score;try{localStorage.setItem('garyBest',best);}catch(e){}}
    try{
      finalRating = calculatePerformanceRating();
      const fRating = document.getElementById("fRating");
      if (fRating) fRating.textContent = `${finalRating}/10`;
      $('fScore').textContent='Score: '+score;
      const T=TIERS[tierMax]||TIERS[TIERS.length-1];
      $('fTier').textContent='Tier: '+T.n;$('fTier').style.color=T.c;$('over').classList.add('show');
      animateGameOverGary();
    }catch(e){}
  }
  function startGameplay(){
    if (state !== 'intro') return;
    introAttempt++;
    clearTimeout(introFallbackTimer);
    introFallbackTimer = null;
    garyAudio.onended = null;
    $('introOverlay').classList.remove('show');
    garyAudio.pause();
    garyAudio.currentTime = 0;
    reset();
    state = 'play';
    musicTo(MUSIC_VOL, 2);
  }
  function getGaryIntroFrame(){
    if(!garyIntroLoaded || !imgGaryIntro.naturalWidth) return null;

    const col = garyIntroFrame % GARY_INTRO_COLS;
    const row = Math.floor(garyIntroFrame / GARY_INTRO_COLS);

    return {
      image: imgGaryIntro,
      sx: col * GARY_INTRO_FRAME_W,
      sy: row * GARY_INTRO_FRAME_H,
      sw: GARY_INTRO_FRAME_W,
      sh: GARY_INTRO_FRAME_H
    };
  }
  function initAudio(){
    if(audioCtx)return;
    try{
      const AudioContext=window.AudioContext||window.webkitAudioContext;
      audioCtx=new AudioContext();analyser=audioCtx.createAnalyser();analyser.fftSize=256;
      dataArray=new Uint8Array(analyser.frequencyBinCount);
      const source=audioCtx.createMediaElementSource(garyAudio);source.connect(analyser);analyser.connect(audioCtx.destination);
    }catch(e){}
    try {
      musicGain = audioCtx.createGain();
      musicGain.gain.value = 0;
      const musicSource = audioCtx.createMediaElementSource(music);
      musicSource.connect(musicGain);
      musicGain.connect(audioCtx.destination);
    } catch (e) { musicGain = null; }
    ensureRainBed();
  }
  function ensureRainBed() {
    if (!audioCtx || rainGain) return;
    try {
      const rate = audioCtx.sampleRate;
      const seconds = 2;
      const buffer = audioCtx.createBuffer(1, rate * seconds, rate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        last = last * 0.86 + white * 0.14;
        data[i] = last;
      }
      const high = audioCtx.createBiquadFilter();
      high.type = 'highpass';
      high.frequency.value = 220;
      const low = audioCtx.createBiquadFilter();
      low.type = 'lowpass';
      low.frequency.value = 1400;
      rainGain = audioCtx.createGain();
      rainGain.gain.value = 0;
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(high);
      high.connect(low);
      low.connect(rainGain);
      rainGain.connect(audioCtx.destination);
      source.start();
    } catch (e) {
      rainGain = null;
    }
  }
  function setRainVolume(level, dt) {
    if (!rainGain) return;
    const current = rainGain.gain.value;
    rainGain.gain.value = current + (level - current) * Math.min(1, dt * 2.2);
  }
  function musicTo(level, secs) {
    if (!musicGain) { music.volume = level; return; }
    const t = audioCtx.currentTime, g = musicGain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(level, t + secs);
  }
  function startMusic() {
    musicOn = true;
    music.volume = 1;
    music.currentTime = 0;
    if (musicGain && audioCtx) {
      const t = audioCtx.currentTime;
      musicGain.gain.cancelScheduledValues(t);
      musicGain.gain.setValueAtTime(0.04, t);
      musicGain.gain.linearRampToValueAtTime(MUSIC_INTRO_VOL, t + MUSIC_FADE_IN);
    }
    const kick = () => { const p = music.play(); if (p) p.catch(() => {}); };
    kick();
    if (audioCtx && audioCtx.state !== 'running') audioCtx.resume().then(kick).catch(() => {});
  }
  function stopMusic() {
    musicOn = false;
    musicTo(0, 1);
    setTimeout(() => { if (!musicOn) music.pause(); }, 1100);
  }
  document.addEventListener('visibilitychange', () => {
    last = window.performance.now();
    if (document.hidden) {
      music.pause();
      if (rainGain) rainGain.gain.value = 0;
      if (state === 'intro') garyAudio.pause();
    } else if (state === 'intro') {
      const voice = garyAudio.play();
      if (voice) voice.catch(() => {});
    }
    if (!document.hidden && musicOn) { const p = music.play(); if (p) p.catch(() => {}); }
  });
  try{best=+localStorage.getItem('garyBest')||0;}catch(e){}
  function tierOf(s){if(s<=50)return 0;if(s<=150)return 1;if(s<=300)return 2;if(s<=500)return 3;return 4;}

  function isTalkingAudio(){
    if(analyser&&!garyAudio.paused){
      analyser.getByteFrequencyData(dataArray);
      let sum=0;for(let i=0;i<dataArray.length;i++)sum+=dataArray[i];
      return sum/dataArray.length>18;
    }
    return false;
  }

  function syncNight(dt) {
    if (!NIGHT_MODE || state === 'menu' || state === 'intro') {
      playTime = 0;
      nightMix = 0;
      nightOn = false;
      return;
    }
    if (state === 'play') playTime += dt;
    if (NIGHT_PREVIEW) {
      nightMix = 1;
      nightOn = true;
      return;
    }
    // The first street plan is one pass of STREET. Night starts as that plan ends.
    const firstStretch = STREET.length * STREET_SEGMENT_H;
    if (distance < firstStretch) {
      nightMix = 0;
      nightOn = false;
      return;
    }
    if (state === 'play') nightMix = Math.min(1, nightMix + dt / NIGHT_FADE);
    nightOn = nightMix > 0.001;
  }

  function update(dt) {
    if (document.hidden) return;

    if (state === 'intro') {
      updateIntroAnimation(dt);
      return;
    }
    if (state.startsWith('crash')) {
      crashT += dt;
      updateRain(dt, false);
      if (crashT > 0.55) endGame();
      return;
    }

    // Future encounter/cutscene controller dispatch belongs BEFORE this guard.
    // All current gameplay clocks and movement are owned by play state.
    if (state !== 'play') {
      setRainVolume(0, dt);
      return;
    }

    clock += dt;
    syncNight(dt);
    updateRain(dt, true);
    lane += (target - lane) * Math.min(1, dt / 0.16);
    laneSquash = Math.max(0, laneSquash - dt);
    grinTimer = Math.max(0, grinTimer - dt);
    updateWalkAnimation(dt);

    for (let i = stars.length - 1; i >= 0; i--) {
      const star = stars[i];
      star.x += star.vx * dt;
      star.y += star.vy * dt;
      star.life -= dt;
      if (star.life <= 0) stars.splice(i, 1);
    }
    if (cap) {
      cap.t += dt;
      if (cap.t > 2.2) cap = null;
    }
    for (const effect of fx) effect.t += dt;
    fx = fx.filter(effect => effect.t < effect.life);

    const desiredSpeed = Math.min(300, 200 + Math.floor(score / 150) * 10);
    shownSpeed += (desiredSpeed - shownSpeed) * Math.min(1, dt * 0.7);
    const speed = shownSpeed;
    nearCd = Math.max(0, nearCd - dt);
    flash = Math.max(0, flash - dt);
    if (review > 0) {
      reviewGap -= dt;
      if (reviewGap <= 0) { review = 0; reviewMul = 1; }
    }

    distance += speed * dt;
    scrollY = distance;
    updateShopClosures();
    performance.distance = distance;
    acc += dt;
    let spawned = 0;
    while (acc >= gap && spawned < 3) {
      acc -= gap;
      spawnRow();
      spawned++;
    }

    for (const object of objs) {
      object.y += speed * dt;
      const definition = ITEMS[object.t];
      if (!definition) { object.d = 1; continue; }
      const verticalDistance = Math.abs(object.y - PLAYER_Y);
      const laneDistance = Math.abs(lane - object.l);

      if (!object.d && verticalDistance < definition.collision.verticalRadius
          && laneDistance < definition.collision.laneRadius) {
        object.d = 1;
        if (isHazard(object.t)) {
          review = 0;
          reviewMul = 1;
          crash(object.t);
          return;
        }
        collect(object);
      } else if (object.dare && !object.d && !object.refused && object.y > PLAYER_Y + 36) {
        object.refused = 1;
        object.d = 1;
        score += 10;
        fx.push({ x: lx(1), y: PLAYER_Y - 28, t: 0, life: 1.1, txt: '+10', col: '#ffe600' });
        cap = { s: LINES.close, t: 0 };
        performance.dareRefusals++;
      } else if (!object.near && isHazard(object.t) && verticalDistance < 26
          && laneDistance > 0.55 && laneDistance < 1.05) {
        object.near = 1;
        if (nearCd <= 0) {
          nearCd = 1.4;
          score += 5;
          performance.nearMisses++;
          cap = { s: LINES.close, t: 0 };
          fx.push({ x: lx(lane), y: PLAYER_Y - 20, t: 0, life: 1, txt: '+5', col: '#fff', tick: 1 });
        }
      }
    }
    objs = objs.filter(object => {
      if (!object.cleared && !object.d && isHazard(object.t) && object.y > PLAYER_Y + 36) {
        object.cleared = 1;
        performance.hazardsPassed++;
      }
      return !object.d && object.y < H + 60;
    });
  }

  function drawRoad(){
    ctx.fillStyle='#3a3f47';ctx.fillRect(ROAD_LEFT,0,ROAD_WIDTH,H);
    paintLaneMarkings('#c5c8cc');
  }

  function paintLaneMarkings(color) {
    const dashH=42*S,gapH=28*S,totalD=dashH+gapH,offY=scrollY%totalD;
    ctx.fillStyle=color;
    for(let l=1;l<=2;l++){
      const lineX=ROAD_LEFT+l*LANE_WIDTH-2.7*S;
      for(let y=-totalD+offY;y<H+totalD;y+=totalD)ctx.fillRect(lineX,y,5.4*S,dashH);
    }
  }

  function bakeGlow(size, stops) {
    const s = document.createElement('canvas');
    s.width = s.height = size;
    const g = s.getContext('2d');
    const rad = g.createRadialGradient(size/2, size/2, size*0.06, size/2, size/2, size/2);
    for (const stop of stops) rad.addColorStop(stop[0], stop[1]);
    g.fillStyle = rad;
    g.fillRect(0, 0, size, size);
    return s;
  }

  // These reusable light textures are baked once. paintWindowLight below still
  // creates a gradient per visible window; caching that pass is documented work.
  const nightGlow = bakeGlow(96, [
    [0, 'rgba(255, 244, 214, 0.95)'],
    [0.28, 'rgba(255, 188, 72, 0.72)'],
    [0.62, 'rgba(255, 170, 60, 0.18)'],
    [1, 'rgba(255, 160, 40, 0)']
  ]);
  const nightLamp = bakeGlow(64, [
    [0, 'rgba(255, 220, 150, 0.95)'],
    [0.4, 'rgba(255, 176, 70, 0.30)'],
    [1, 'rgba(255, 160, 50, 0)']
  ]);
  const nightRoadPool = bakeGlow(140, [
    [0, 'rgba(255, 186, 96, 0.55)'],
    [1, 'rgba(255, 170, 70, 0)']
  ]);
  function bakeEdge() {
    const s = document.createElement('canvas');
    s.width = 36;
    s.height = 8;
    const g = s.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 36, 0);
    grad.addColorStop(0, 'rgba(6, 10, 28, 0.34)');
    grad.addColorStop(1, 'rgba(6, 10, 28, 0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 36, 8);
    return s;
  }
  const nightEdge = bakeEdge();
  const nightWindowFill = bakeGlow(80, [
    [0, 'rgba(255, 246, 220, 0.92)'],
    [0.34, 'rgba(255, 188, 72, 0.62)'],
    [0.78, 'rgba(255, 168, 52, 0.16)'],
    [1, 'rgba(255, 160, 40, 0)']
  ]);

  function shopIsLit(seed) {
    return ((seed * 17 + 3) % 8) !== 0;
  }

  function drawNightAmbient() {
    ctx.save();
    ctx.globalAlpha = nightMix;
    ctx.fillStyle = 'rgba(12, 20, 48, 0.38)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function drawNightRoadLight() {
    ctx.save();
    ctx.globalAlpha = nightMix;
    ctx.fillStyle = 'rgba(16, 28, 58, 0.20)';
    ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, H);
    paintLaneMarkings('#fffef8');
    ctx.restore();
  }

  function paintWindowLight(keeperIndex, x, y, w, h, seed) {
    const win = shopWindowRect(keeperIndex, x, y, w, h);

    if (win.y > H || win.y + win.h < 0) {
      return;
    }

    const flick = 0.97 + 0.03 * Math.sin(clock * 1.7 + seed);

    ctx.save();

    ctx.beginPath();
    ctx.rect(win.x, win.y, win.w, win.h);
    ctx.clip();

    const glow = ctx.createRadialGradient(
      win.x + win.w * 0.52,
      win.y + win.h * 0.58,
      2,
      win.x + win.w * 0.52,
      win.y + win.h * 0.58,
      Math.max(win.w, win.h) * 0.65
    );

    glow.addColorStop(0, `rgba(255, 204, 112, ${0.20 * flick})`);
    glow.addColorStop(0.55, `rgba(255, 178, 82, ${0.10 * flick})`);
    glow.addColorStop(1, "rgba(255, 150, 60, 0)");

    ctx.fillStyle = glow;
    ctx.fillRect(win.x - 4, win.y - 4, win.w + 8, win.h + 8);

    ctx.fillStyle = `rgba(255, 184, 92, ${0.055 * flick})`;
    ctx.fillRect(win.x, win.y, win.w, win.h);

    ctx.restore();
  }

  function drawNightShopWindows() {
    // Window light is painted inside drawStreetBuilding, before the keeper,
    // so this later pass does not wash the shopkeeper back out.
  }

  function drawObj(o){
    const x=lx(o.l),y=o.y;
    const hazard=isHazard(o.t);
    if(hazard){
      ctx.fillStyle='rgba(18,20,24,.45)';
      ctx.beginPath();ctx.ellipse(x,y+16,18,7,0,0,7);ctx.fill();
    }else{
      ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(x,y+18*S,20*S,6*S,0,0,7);ctx.fill();
    }
    if (o.dare) {
      const pulse = 0.45 + Math.sin(clock * 5) * 0.25;
      ctx.strokeStyle = 'rgba(255,230,0,' + pulse + ')';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(x, y + 18, 28, 11, 0, 0, 7);
      ctx.stroke();
    }
    const definition = ITEMS[o.t];
    if (!definition) return;
    const bob = Math.sin(clock * 6 + o.id) * 3 * S;
    const sz = definition.displaySize;
    const loaded = itemImages[o.t];
    const pic = loaded && loaded.ready ? loaded : SP[definition.fallback];
    if (!pic) return;
    ctx.drawImage(pic,x-sz/2,y-sz/2+bob,sz,sz);
    if(o.t==='roast'){
      const g = (clock*0.9+o.id)%1;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.sin(g*Math.PI)*0.7);
      ctx.fillStyle = '#f4f7ff';
      ctx.beginPath();
      ctx.ellipse(x-sz*0.2+g*sz*0.36, y-sz*0.08+bob, 4, 1.2, -0.5, 0, 7);
      ctx.fill();
      ctx.globalAlpha = Math.max(0, Math.sin(g*Math.PI)*0.35);
      ctx.beginPath();
      ctx.ellipse(x-sz*0.05+g*sz*0.2, y+sz*0.08+bob, 2.2, 0.7, -0.5, 0, 7);
      ctx.fill();
      ctx.restore();
    }
  }

  function updateIntroAnimation(dt) {
    introAnimTimer += dt;
    garyIntroFrameTimer += dt;
    const lastFrame = GARY_INTRO_COLS * GARY_INTRO_ROWS - 1;
    while (garyIntroFrame < lastFrame && garyIntroFrameTimer >= GARY_INTRO_FRAME_TIME) {
      garyIntroFrameTimer -= GARY_INTRO_FRAME_TIME;
      garyIntroFrame++;
    }
    if (garyIntroFrame === lastFrame) garyIntroFrameTimer = 0;
  }

  function updateWalkAnimation(dt) {
    if (grinTimer > 0 && imgCheer.ready) return;
    runTimer += dt;
    while (runTimer >= WALK_FRAME_TIME) {
      runTimer -= WALK_FRAME_TIME;
      runFrame = (runFrame + 1) % WALK_FRAMES;
    }
  }

  function drawIntroAvatar(){
    introCtx.clearRect(0,0,180,180);

    introCtx.fillStyle='#111';
    introCtx.beginPath();
    introCtx.arc(90,90,90,0,Math.PI*2);
    introCtx.fill();


    const frame = getGaryIntroFrame();

    if(frame){
      const displaySize = 175;
      const ar = frame.sw / frame.sh;

      let w = displaySize * ar;
      let h = displaySize;

      if(w > displaySize){
        w = displaySize;
        h = w / ar;
      }

      introCtx.drawImage(
        frame.image,
        frame.sx,
        frame.sy,
        frame.sw,
        frame.sh,
        90 - w / 2,
        90 - h / 2,
        w,
        h
      );
    }else{
      introCtx.save();
      introCtx.translate(90,90);
      fbFace(introCtx,60);
      introCtx.restore();
    }

    introCtx.lineWidth=6;
    introCtx.strokeStyle='#ffe600';
    introCtx.beginPath();
    introCtx.arc(90,90,86,0,Math.PI*2);
    introCtx.stroke();
  }

  function drawPlayer(){
    const px=lx(lane),py=PLAYER_Y;
    const planted = runFrame===0 || state.startsWith('crash');
    const sx = px + (planted ? 0 : 3);
    const shade = ctx.createRadialGradient(sx, py+6, 2, sx, py+6, planted ? 16 : 11);
    shade.addColorStop(0, planted ? 'rgba(0,0,0,.28)' : 'rgba(0,0,0,.16)');
    shade.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.ellipse(sx, py+6, planted ? 16 : 11, planted ? 4 : 2.5, 0, 0, 7);
    ctx.fill();
    ctx.save();ctx.translate(px,py);
    if(laneSquash>0) ctx.scale(1+laneSquash*1.4, 1-laneSquash*0.8);
    const isCrashing=state.startsWith('crash');
    let imgToDraw=null;
    if(isCrashing && imgCrash.ready) imgToDraw=imgCrash;
    else if(grinTimer>0 && imgCheer.ready) imgToDraw=imgCheer;
    else {

    imgToDraw = imgWalkSheet.ready ? imgWalkSheet : null;
  }
    const h = WORLD.playerHeight;
    const step = runFrame===1 && !isCrashing && grinTimer<=0 ? -3 : 0;
    if (imgToDraw) {
    if (imgToDraw === imgWalkSheet) {

      const frameW = imgWalkSheet.naturalWidth / WALK_FRAMES;
      const frameH = imgWalkSheet.naturalHeight;

      const ar = frameW / frameH;
      const w = h * ar;

      ctx.drawImage(
        imgWalkSheet,
        runFrame * frameW,
        0,
        frameW,
        frameH,
        -w / 2,
        -h + WORLD.playerFootOffset,
        w,
        h
      );

    } else {
      const ar = imgToDraw.naturalWidth / imgToDraw.naturalHeight;
      const w = h * ar;

      ctx.drawImage(imgToDraw, -w / 2, -h + WORLD.playerFootOffset + step, w, h);
    }
  } else {
    fbFace(ctx, 36 * S);
  }
    ctx.restore();

    for(const s of stars){
      const p=s.life/s.maxLife;
      ctx.save();ctx.fillStyle=Math.floor(clock*20)%2?'#ffe600':'#fff';ctx.globalAlpha=Math.max(0,p);
      ctx.beginPath();ctx.arc(s.x,s.y,s.size*p,0,Math.PI*2);ctx.fill();ctx.restore();
    }
  }

  function drawDiagnostics(){
    if(!loadErrorLog.length)return;
    ctx.fillStyle='rgba(255,0,0,.85)';ctx.fillRect(0,0,W,24*loadErrorLog.length+8);
    ctx.fillStyle='#c5c8cc';ctx.font='11px monospace';ctx.textAlign='left';ctx.textBaseline='top';
    loadErrorLog.forEach((err,i)=>ctx.fillText('â ï¸ ERROR: '+err,10,6+i*22));
  }

  function drawHud(){
    const T=TIERS[tierOf(score)];
    ctx.fillStyle='rgba(10,12,20,.85)';rr(ctx,10,10,340,38,10);ctx.fill();
    ctx.strokeStyle=T.c;ctx.lineWidth=3;ctx.stroke();txt('Tier: '+T.n,CX,29,13,T.c,'center');
    txt('SCORE '+score,20,70,18,'#fff','left');txt('BEST '+best,340,70,13,'#cfd6e0','right');
  }

  function drawCap(){
    const line=state.startsWith('crash')?(LINES[lastHit]||LINES.m):(cap&&cap.s);
    if(!line)return;
    const t=cap?cap.t:0,a=t>1.8?1-(t-1.8)/.4:1;
    ctx.save();ctx.globalAlpha=Math.max(0,a);
    ctx.font='700 13px Arial,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    const w=Math.min(300,ctx.measureText(line).width+18);
    const x=CX-w/2,y=PLAYER_Y-168;
    ctx.fillStyle='rgba(12,14,18,.92)';
    rr(ctx,x,y,w,24,6);ctx.fill();
    ctx.fillStyle='#f4f1ea';
    ctx.fillText(line,CX,y+12);
    ctx.restore();
  }

  function drawStreetLight(){
    if (lampHeads.length && nightOn) {
      ctx.save();
      ctx.globalAlpha = 0.42 * nightMix;
      for (let i = 0; i < lampHeads.length; i += 2) {
        const hx = lampHeads[i], hy = lampHeads[i + 1];
        ctx.drawImage(nightLamp, hx - 28, hy - 22, 56, 44);
      }
      ctx.restore();
    }
    if (lampGlows.length) {
      const flick = 0.94 + Math.sin(clock * 3.1) * 0.04;
      const pool = nightOn ? (0.10 + 0.08 * nightMix) * flick : 0.05 * flick;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = pool;
      ctx.beginPath();
      ctx.rect(ROAD_LEFT, 0, ROAD_WIDTH, H);
      ctx.clip();
      for (const cy of lampGlows) ctx.drawImage(nightRoadPool, ROAD_LEFT - 10, cy - 46, ROAD_WIDTH + 20, 92);
      ctx.restore();
    }
    lampGlows.length = 0;
    lampHeads.length = 0;
  }

  function drawNightVignette() {
    ctx.save();
    ctx.globalAlpha = nightMix * 0.9;
    ctx.drawImage(nightEdge, 0, 0, 36, H);
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(nightEdge, 0, 0, 36, H);
    ctx.restore();
  }

  function drawVignette(){
    ctx.save();
    const leftShade = ctx.createLinearGradient(0, 0, ROAD_LEFT, 0);
    leftShade.addColorStop(0, 'rgba(8,10,14,.28)');
    leftShade.addColorStop(1, 'rgba(8,10,14,0)');
    ctx.fillStyle = leftShade;
    ctx.fillRect(0, 0, ROAD_LEFT, H);
    const rightShade = ctx.createLinearGradient(W, 0, ROAD_RIGHT, 0);
    rightShade.addColorStop(0, 'rgba(8,10,14,.28)');
    rightShade.addColorStop(1, 'rgba(8,10,14,0)');
    ctx.fillStyle = rightShade;
    ctx.fillRect(ROAD_RIGHT, 0, W - ROAD_RIGHT, H);
    ctx.restore();

    const t=ctx.createLinearGradient(0,0,0,70);t.addColorStop(0,'rgba(4,6,16,.18)');t.addColorStop(1,'rgba(4,6,16,0)');
    ctx.fillStyle=t;ctx.fillRect(0,0,W,70);
    const b=ctx.createLinearGradient(0,H-130,0,H);b.addColorStop(0,'rgba(4,6,16,0)');b.addColorStop(1,'rgba(4,6,16,.45)');
    ctx.fillStyle=b;ctx.fillRect(0,H-130,W,130);
  }

  function makeStreak(fromTop) {
    return {
      x: Math.random() * (W + 36) - 12,
      y: fromTop ? -24 - Math.random() * 90 : Math.random() * H,
      len: 7 + Math.random() * 13,
      speed: 620 + Math.random() * 480,
      drift: 22 + Math.random() * 26,
      a: 0.15 + Math.random() * 0.24,
      w: Math.random() < 0.82 ? 1 : 1.3,
      far: Math.random() < 0.42
    };
  }

  function recycleStreak(s) {
    s.x = Math.random() * (W + 56) - 24;
    s.y = -18 - Math.random() * 80;
    s.len = (s.far ? 6 : 9) + Math.random() * (s.far ? 8 : 12);
    s.speed = (s.far ? 480 : 700) + Math.random() * 360;
    s.drift = 18 + Math.random() * 30;
    s.a = (s.far ? 0.1 : 0.16) + Math.random() * 0.18;
  }

  function parkSplash(s, dormant) {
    const band = Math.random();
    if (band < 0.74) s.x = ROAD_LEFT + 8 + Math.random() * (ROAD_WIDTH - 16);
    else if (band < 0.87) s.x = Math.max(2, ROAD_LEFT - PAVEMENT_WIDTH) + Math.random() * PAVEMENT_WIDTH;
    else s.x = ROAD_RIGHT + 2 + Math.random() * Math.max(6, W - ROAD_RIGHT - 4);
    s.y0 = dormant ? Math.random() * H : -8 - Math.random() * 48;
    s.born = scrollY;
    s.y = s.y0;
    s.rx = 2.1 + Math.random() * 2.5;
    s.ry = 0.62 + Math.random() * 0.45;
    s.max = 0.18 + Math.random() * 0.16;
    s.life = dormant ? 0 : s.max;
    s.a = 0.55 + Math.random() * 0.45;
    s.wait = dormant ? 0.12 + Math.random() * 1.3 : 0;
  }

  function makeSplash(dormant) {
    const s = { x: 0, y0: 0, born: 0, y: 0, rx: 2, ry: 0.8, max: 0.24, life: 0, a: 0.8, wait: 0.4 };
    parkSplash(s, dormant);
    return s;
  }

  
function updateRain(dt, advancing) {
  if (state === 'menu' || state === 'intro' || state === 'over') {
    nightHeld = 0;
    rainMix = 0;
    rainSaid = false;
    setRainVolume(0, dt);
    return;
  }

  if (advancing) {
    if (RAIN_PREVIEW) {
      rainMix = Math.min(1, rainMix + dt / 1.4);
    } else if (nightMix >= 0.98) {
      nightHeld += dt;

      const goal = nightHeld <= WEATHER.breatheSeconds
        ? 0
        : Math.min(
            1,
            (nightHeld - WEATHER.breatheSeconds) / WEATHER.rampSeconds
          );

      rainMix += (goal - rainMix) * Math.min(1, dt * 0.85);
    }

    if (!rainSaid && rainMix > 0.55) {
      rainSaid = true;
      cap = { s: WEATHER.line, t: 0 };
    }
  }

  // Activate shop closures once the storm intensifies.
  if (advancing && rainMix >= 0.8) {
    shutterMix = Math.min(1, shutterMix + dt / 6);
  }

  if (rainMix < 0.012) {
    setRainVolume(0, dt);
    return;
  }

  const pace = 0.55 + rainMix * 0.7;

  for (let i = 0; i < STREAK_COUNT; i++) {
    const s = streaks[i];
    s.y += s.speed * pace * dt;
    s.x += s.drift * pace * dt;

    if (s.y > H + 8 || s.x > W + 30) {
      recycleStreak(s);
    }
  }

  const scrollDelta = advancing ? shownSpeed * dt : 0;

  for (let i = 0; i < SPLASH_COUNT; i++) {
    const s = splashes[i];
    s.y += scrollDelta;

    if (s.wait > 0) {
      s.wait -= dt * (0.35 + rainMix);

      if (s.wait <= 0) {
        parkSplash(s, false);
      }

      continue;
    }

    s.life -= dt;

    if (s.life <= 0 || s.y > H + 10) {
      s.life = 0;
      s.wait = (0.04 + Math.random() * 0.55) /
        Math.max(0.35, rainMix);
    }
  }

  setRainVolume(
    (state === 'play' || state.startsWith('crash'))
      ? rainMix * 0.11
      : 0,
    dt
  );
}


  function drawStormShade() {
    if (rainMix < 0.02) return;
    ctx.save();
    ctx.fillStyle = 'rgba(3, 6, 14, ' + (0.42 * rainMix) + ')';
    ctx.fillRect(0, 0, ROAD_LEFT, H);
    ctx.fillRect(ROAD_RIGHT, 0, W - ROAD_RIGHT, H);
    ctx.fillStyle = 'rgba(7, 12, 24, ' + (0.16 * rainMix) + ')';
    ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, H);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.5 * (1 - rainMix * 0.35);
    paintLaneMarkings('#e7eef8');
    ctx.restore();
  }

  function drawStormWindowLift() {
    if (!streetLoaded || !nightOn || rainMix < 0.12) return;
    ctx.save();
    ctx.globalAlpha = 0.5 * rainMix;
    forEachStreetFront((plan, index, y) => {
      stampBakedWindow(plan.left, 0, y, BUILDING_WIDTH, BUILDING_H, index);
      stampBakedWindow(
        plan.right, ROAD_RIGHT + PAVEMENT_WIDTH, y,
        W - ROAD_RIGHT - PAVEMENT_WIDTH, BUILDING_H, index + 3
      );
    });
    ctx.restore();
  }

  function stampBakedWindow(name, x, y, w, h) {
    const idx = shopByName(name);
    if (idx < 0) return;
    const keeper = BUILDINGS[idx].keeper;
    const win = shopWindowRect(keeper, x, y, w, h);
    if (win.y > H || win.y + win.h < 0) return;
    const size = Math.max(win.w, win.h) * 1.45;
    ctx.drawImage(nightGlow, win.x + win.w * 0.5 - size * 0.5, win.y + win.h * 0.42 - size * 0.5, size, size);
  }

  function drawRainSplashes() {
    if (rainMix < 0.02) return;
    ctx.save();
    ctx.fillStyle = '#d7e6f6';
    for (let i = 0; i < SPLASH_COUNT; i++) {
      const s = splashes[i];
      if (s.life <= 0 || s.wait > 0) continue;
      const k = 1 - s.life / s.max;
      ctx.globalAlpha = Math.sin(Math.min(1, Math.max(0, k)) * Math.PI) * 0.4 * rainMix * s.a;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.rx * (0.55 + k), s.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawRainStreaks() {
    if (rainMix < 0.02) return;
    const count = Math.min(
  STREAK_COUNT,
  Math.max(10, Math.floor(
    78 * (0.22 + 0.78 * rainMix) +
    48 * shutterMix
  ))
);
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < count; i++) {
      const s = streaks[i];
      const lean = s.drift * (s.len / s.speed);
      ctx.globalAlpha = s.a * (0.28 + 0.72 * rainMix);
      ctx.strokeStyle = s.far ? '#a9bdd2' : '#e8f2fb';
      ctx.lineWidth = s.w;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + lean, s.y + s.len);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Gary Eats! Visual Studio bridge. Published data is optional.
  const shopClosureSpecs = Object.create(null);
  const shopClosureStarted = new Map();
  const RECT_FIELDS = ['x', 'y', 'w', 'h'];
  const rectIsValid = r => r && RECT_FIELDS.every(k => Number.isFinite(r[k]))
    && r.x >= 0 && r.y >= 0 && r.w > 0 && r.h > 0
    && r.x + r.w <= BUILDING_WIDTH + 0.01
    && r.y + r.h <= BUILDING_H + 0.01;

  // Safe fallback: if the studio JSON fails, the existing game still starts.
  BUILDINGS.forEach((building, i) => {
    const p = SHOP_PANES[i];
    shopClosureSpecs[building.name] = {
      shutter: {
        x: p.x * BUILDING_WIDTH, y: p.y * BUILDING_H,
        w: p.w * BUILDING_WIDTH, h: p.h * BUILDING_H
      },
      doorLight: null,
      duration: 1
    };
  });

  fetch('gary-game-config.json', { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error('Studio configuration unavailable');
      return response.json();
    })
    .then(config => {
      if (config.schema !== 'gary-eats-game-config-v1'
          || config.world?.width !== W || config.world?.height !== H) {
        throw new Error('Incompatible Visual Studio configuration');
      }
      applyPublishedKeepers(config);
      for (const building of BUILDINGS) {
        const s = config.shopClosures?.[building.name];
        if (!rectIsValid(s?.shutter)) continue;
        shopClosureSpecs[building.name] = {
          shutter: s.shutter,
          doorLight: rectIsValid(s.doorLight) ? s.doorLight : null,
          duration: Number.isFinite(s.duration)
            ? Math.max(0.35, Math.min(3.5, s.duration)) : 1
        };
      }
    })
    .catch(error => console.warn('Visual Studio settings:', error.message));

  function updateShopClosures() {
    // Presentation only. Never affect hazard, food, or lane logic.
    if (shutterMix < 0.95 || !streetLoaded) return;

    function startIfApproaching(name, segment, side, shopY) {
      const spec = shopClosureSpecs[name];
      if (!spec) return;
      const id = segment + ':' + side;
      if (shopClosureStarted.has(id)) return;
      const windowBottom = shopY + spec.shutter.y + spec.shutter.h;
      if (windowBottom >= PLAYER_Y - 230 && windowBottom <= PLAYER_Y + 60) {
        shopClosureStarted.set(id, clock);
      }
    }

    forEachStreetFront((plan, segment, y) => {
      startIfApproaching(plan.left, segment, 'L', y);
      startIfApproaching(plan.right, segment, 'R', y);
    });

    // Retain only nearby instances; the STREET plan may repeat forever.
    const oldestVisible = Math.floor((distance + 56) / STREET_SEGMENT_H) - 2;
    for (const id of shopClosureStarted.keys()) {
      if (Number(id.split(':')[0]) < oldestVisible) shopClosureStarted.delete(id);
    }
  }

  function drawShopShutters() {
    if (!shopClosureStarted.size || !streetLoaded) return;

    function drawOne(name, segment, side, y) {
      const spec = shopClosureSpecs[name];
      const start = shopClosureStarted.get(segment + ':' + side);
      if (!spec || start === undefined) return;

      const t = Math.min(1, Math.max(0, (clock - start) / spec.duration));
      const eased = t * t * (3 - 2 * t);
      const s = spec.shutter;
      const bx = side === 'L' ? 0 : ROAD_RIGHT + PAVEMENT_WIDTH;
      const x = bx + s.x, top = y + s.y, h = s.h * eased;
      if (h > 0.2) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, top, s.w, s.h);
        ctx.clip();
        ctx.fillStyle = '#353b42';
        ctx.fillRect(x, top, s.w, h);
        ctx.strokeStyle = '#79838e';
        ctx.lineWidth = 1;
        for (let sy = top + 4; sy < top + h; sy += 5) {
          ctx.beginPath();
          ctx.moveTo(x + 1, sy);
          ctx.lineTo(x + s.w - 1, sy);
          ctx.stroke();
        }
        ctx.fillStyle = '#a1aab3';
        ctx.fillRect(x, top + h - 2.5, s.w, 2.5);
        ctx.fillStyle = '#242930';
        ctx.fillRect(x, top, 1.6, h);
        ctx.fillRect(x + s.w - 1.6, top, 1.6, h);
        ctx.restore();
      }

      if (spec.doorLight && t > 0.7) {
        const d = spec.doorLight;
        ctx.save();
        ctx.globalAlpha = Math.min(1, (t - 0.7) / 0.3) * 0.94;
        ctx.fillStyle = '#081019';
        ctx.fillRect(bx + d.x, y + d.y, d.w, d.h);
        ctx.restore();
      }
    }

    forEachStreetFront((plan, segment, y) => {
      drawOne(plan.left, segment, 'L', y);
      drawOne(plan.right, segment, 'R', y);
    });
  }


  function render(dt){
    if(state==='intro')drawIntroAvatar();
    ctx.setTransform(K,0,0,K,0,0);ctx.save();
    drawHighStreet();drawPavements();drawRoad();
    if (nightOn) {
      drawNightAmbient();
      drawNightRoadLight();
      drawNightShopWindows();
    }
    drawStormWindowLift();
drawStreetLight();
drawShopShutters();
drawRainSplashes();

    if(state!=='menu'&&state!=='intro'){
      for(let i=objs.length-1;i>=0;i--)drawObj(objs[i]);
      drawPlayer();
      for(const f of fx){
        const k=f.t/f.life;
        const pop=f.pop?1.25-k*0.25:1;
        ctx.save();ctx.globalAlpha=1-k;
        ctx.translate(f.x,f.y-16-k*28);ctx.scale(pop,pop);
        txt(f.txt,0,0,16,f.col||'#fff','center');
        ctx.restore();
        if(f.tick){
          ctx.save();ctx.globalAlpha=1-k;ctx.fillStyle='#fff';
          ctx.fillRect(f.x-1,PLAYER_Y-18,2,14*(1-k));
          ctx.restore();
        }
      }
      if(review>0 && state==='play'){
        txt('Proper. x'+reviewMul, lx(lane), PLAYER_Y+22, 11, (TIERS[tierOf(score)]||TIERS[0]).c, 'center');
      }
    }
    drawRainStreaks();
    ctx.restore();drawVignette();
    if (nightOn) drawNightVignette();

    if(state!=='menu'&&state!=='intro'){
      drawHud();drawCap();
      if(state.startsWith('crash')) ctx.fillStyle='rgba(255,40,40,'+Math.max(0,.45-crashT)+')',ctx.fillRect(0,0,W,H);
    }
    drawDiagnostics();
  }

  /* -------------------------------------------------------------------------- */
  /* Input and lifecycle                                                        */
  /* -------------------------------------------------------------------------- */

  addEventListener('keydown',e=>{
    if(e.repeat)return;
    const k=e.key.toLowerCase();
    if(k==='arrowleft'||k==='a')move(-1);
    else if(k==='arrowright'||k==='d')move(1);
    else return;
    if(state==='play')e.preventDefault();
  });

  cv.addEventListener('pointerdown',e=>{
    if(state!=='play')return;
    const r=cv.getBoundingClientRect();
    move(e.clientX-r.left<r.width/2?-1:1);
    e.preventDefault();
  });

  $('startBtn').addEventListener('click', e => {
    if (state !== 'menu') return;
    e.currentTarget.blur();
    initAudio();
    reset();
    $('menu').classList.remove('show');
    state = 'intro';
    const attempt = ++introAttempt;
    $('introOverlay').classList.add('show');
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    garyAudio.currentTime = 0;
    garyAudio.onended = () => {
      if (attempt === introAttempt) startGameplay();
    };
    const playPromise = garyAudio.play();
    startMusic();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        if (attempt !== introAttempt || state !== 'intro') return;
        introFallbackTimer = setTimeout(() => {
          if (attempt === introAttempt && state === 'intro') startGameplay();
        }, 2500);
      });
    }
  });

  $('skipIntroBtn').addEventListener('click',startGameplay);

  $('againBtn').addEventListener('click',e=>{
    e.currentTarget.blur();$('over').classList.remove('show');reset();state='menu';$('menu').classList.add('show');
    stopMusic();
  });

  function resize(){
    // Design size stays 360x640. The phone picture is 3x that, 1080x1920, when the screen can take it.
    const w=stage.clientWidth,dpr=Math.min(window.devicePixelRatio||1,3);
    cv.width=Math.round(w*dpr);cv.height=Math.round(w*16/9*dpr);K=cv.width/W;
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality='high';
  }

  let last=window.performance.now();
  function loop(ts){
    const dt=Math.max(0,Math.min(.05,(ts-last)/1000));last=ts;
    update(dt);render(dt);requestAnimationFrame(loop);
  }

  addEventListener('resize',resize);
  resize();
  requestAnimationFrame(loop);
})();