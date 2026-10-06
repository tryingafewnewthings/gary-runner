(() => {
'use strict';
EVENTS.sort((a, b) => a.at - b.at);

const W = 360, H = 640, CX = 180;
const ROAD_WIDTH = 150;
const S = ROAD_WIDTH / 189;
const ROAD_LEFT = (W - ROAD_WIDTH) / 2;
const ROAD_RIGHT = ROAD_LEFT + ROAD_WIDTH;
const LANE_WIDTH = ROAD_WIDTH / 3;
const PLAYER_Y = 540;

const PAVEMENT_WIDTH = 16;
const BUILDING_WIDTH = ROAD_LEFT - PAVEMENT_WIDTH; // 91.5px on the 360px canvas
const STREET_SEGMENT_H = 360;
const BUILDING_H = 236;
const DETAIL_H = STREET_SEGMENT_H - BUILDING_H;

const PROPS = DETAILS;
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

// End-of-run performance tracking. This is deliberately separate from score.
let performance = {
  foodSpawned: 0,
  foodEaten: 0,
  hazardsPassed: 0,
  collisions: 0,
  laneChanges: 0,
  nearMisses: 0,
  distance: 0
};
let finalRating = 1;

// Night biome. NIGHT_MODE is the switch: false stays daylight, true is the night street.
// It stays off on the menu. A run fades into night once the first shop plan has passed.
// Set NIGHT_PREVIEW to true to see night from the first frame of play.
const NIGHT_MODE = true;
const NIGHT_PREVIEW = false;
const NIGHT_FADE = 6;
let nightOn = false;

let audioCtx, analyser, dataArray;

const MUSIC_VOL = 0.2;        // normal level during play (0 to 1). Keep it low: sound effects are coming.
const MUSIC_INTRO_VOL = 0.12; // quieter while Gary's intro voice plays
const MUSIC_FADE_IN = 4;      // seconds
const music = new Audio('gary_theme_song.mp3?v=1');
music.loop = true;
music.preload = 'auto';
let musicGain = null, musicOn = false;
let introAnimTimer = 0;

let openLoaded = false, closedLoaded = false, streetLoaded = false;
let loadErrorLog = [];

/* -------------------------------------------------------------------------- */
/* Gary assets                                                                */
/* -------------------------------------------------------------------------- */

function loadGary(file) {
  const img = new Image();
  img.onload = () => { img.ready = true; };
  img.onerror = () => { loadErrorLog.push(file + ' not found'); };
  img.src = file;
  return img;
}

const imgRun = [
  loadGary('gary_run1.png?v=5'),
  loadGary('gary_run2.png?v=5')
];

const imgCheer = loadGary('gary_cheer.png?v=1');
const imgCrash = loadGary('gary_crash.png?v=1');

let runFrame = 0, runTimer = 0;

const imgOpen = new Image();
imgOpen.onload = () => { openLoaded = true; };
imgOpen.onerror = () => { loadErrorLog.push('gary_open.png.PNG not found'); };
imgOpen.src = 'gary_open.png.PNG';

const imgClosed = new Image();
imgClosed.onload = () => { closedLoaded = true; };
imgClosed.onerror = () => { loadErrorLog.push('gary_closed.png.PNG not found'); };
imgClosed.src = 'gary_closed.png.PNG';

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

const BUILDINGS = [
  { name: 'Fish & Chips',       x: 12,   y: 57, w: 484, h: 1287, keeper: 0 },
  { name: 'Peri Peri Chicken',  x: 527,  y: 57, w: 443, h: 1287, keeper: 1 },
  { name: 'Bakery',             x: 999,  y: 57, w: 442, h: 1287, keeper: 2 },
  { name: 'The Red Lion',       x: 1467, y: 57, w: 442, h: 1287, keeper: 3 },
  { name: 'Butchers',           x: 1940, y: 57, w: 446, h: 1287, keeper: 4 },
  { name: 'Mallace Cafe',       x: 2422, y: 57, w: 476, h: 1287, keeper: 5 }
];

const KEEPERS = [
  { x: 53,   y: 1455, w: 383, h: 444 },
  { x: 534,  y: 1455, w: 378, h: 444 },
  { x: 1045, y: 1455, w: 333, h: 444 },
  { x: 1479, y: 1455, w: 412, h: 444 },
  { x: 1971, y: 1455, w: 411, h: 444 },
  { x: 2501, y: 1455, w: 326, h: 444 }
];

const imgStreet = new Image();

imgStreet.onload = () => {
  streetLoaded = true;
};

imgStreet.onerror = () => {
  loadErrorLog.push('high_street_sprites.webp not found');
};

imgStreet.src = 'high_street_sprites.webp?v=8';

const COBBLE_KINDS = {
  base: 'IMG_7141.webp?v=6',
  weeds: 'IMG_7142.webp?v=6',
  light: 'IMG_7143.webp?v=6',
  sparse: 'IMG_7144.webp?v=6',
  dense: 'IMG_7145.webp?v=6',
  leaves: 'IMG_7146.webp?v=6',
  grime: 'IMG_7147.webp?v=6',
  cracked: 'IMG_7148.webp?v=6'
};

const cobbleImgs = {};

Object.entries(COBBLE_KINDS).forEach(([kind, file]) => {
  const img = new Image();

  img.onload = () => {
    img.ready = true;
  };

  img.onerror = () => {
    loadErrorLog.push(file + ' not found');
  };

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
  if (slot === 'middle') {
    return plan[side + 'Middle'] || plan[side + 'Object'] || 'none';
  }

  const key =
    side +
    slot.charAt(0).toUpperCase() +
    slot.slice(1);

  return plan[key] || 'none';
}

function drawGroundPatch(x, y, w, h, kind) {
  if (kind !== 'damp' || h < 20) return;

  const cx = x + w * 0.5;
  const cy = y + h * 0.72;

  const wash = ctx.createRadialGradient(
    cx,
    cy,
    4,
    cx,
    cy,
    w * 0.42
  );

  wash.addColorStop(0, 'rgba(18,22,26,.28)');
  wash.addColorStop(1, 'rgba(18,22,26,0)');

  ctx.fillStyle = wash;
  ctx.beginPath();
  ctx.ellipse(
    cx,
    cy,
    w * 0.4,
    h * 0.32,
    0,
    0,
    7
  );
  ctx.fill();
}

function drawSideLayers(x, y, w, h, plan, side) {
  drawDetailZone(
    x,
    y,
    w,
    h * 0.75,
    sideSlot(plan, side, 'back'),
    side
  );

  drawDetailZone(
    x,
    y,
    w,
    h,
    sideSlot(plan, side, 'middle'),
    side
  );

  drawDetailZone(
    x,
    y + h * 0.4,
    w,
    h * 0.6,
    sideSlot(plan, side, 'front'),
    side
  );
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

  const shift =
    objectName === 'lamp'
      ? 0
      : ((objectName.length * 17 + Math.round(x)) % 11) - 5;

  let px =
    x +
    w * 0.5 -
    propW / 2 +
    shift;

  // Stand the lamp on the kerb. The pavement between the shop and the road is only a few pixels wide.
  if (objectName === 'lamp') {
    px = side === 'left'
      ? ROAD_LEFT - propW
      : ROAD_RIGHT + 3;
  }

  const py = y + h - propH + 2;

  if (objectName === 'lamp') {
    lampGlows.push(py + propH * 0.45);
    lampHeads.push(
      px + propW * 0.5,
      py + propH * 0.08
    );
  }

  const foot = px + propW / 2;
  const cast = side === 'right' ? 8 : -8;

  ctx.save();

  ctx.fillStyle = 'rgba(12,14,18,.35)';
  ctx.beginPath();

  ctx.ellipse(
    foot + cast,
    y + h - 3,
    Math.max(8, propW * 0.34),
    4,
    0,
    0,
    7
  );

  ctx.fill();

  if (objectName === 'bin' || objectName === 'tree') {
    ctx.fillStyle = 'rgba(40,48,42,.28)';
    ctx.beginPath();

    ctx.ellipse(
      foot + 6,
      y + h - 2,
      7,
      3,
      0,
      0,
      7
    );

    ctx.fill();
  }

  ctx.restore();

  if (
    prop.file &&
    prop.img &&
    prop.img.complete &&
    prop.img.naturalWidth
  ) {
    const frames = prop.frames || 1;
    const fw = prop.img.naturalWidth / frames;
    const fh = prop.img.naturalHeight;

    const frame =
      frames > 1
        ? Math.floor(clock / 0.7) % frames
        : 0;

    ctx.save();

    if (objectName === 'bench' && side === 'right') {
      ctx.translate(px + propW, py);
      ctx.scale(-1, 1);

      ctx.drawImage(
        prop.img,
        frame * fw,
        0,
        fw,
        fh,
        0,
        0,
        propW,
        propH
      );
    } else {
      ctx.drawImage(
        prop.img,
        frame * fw,
        0,
        fw,
        fh,
        px,
        py,
        propW,
        propH
      );
    }

    ctx.restore();
    return;
  }

  if (!streetLoaded || prop.x == null) return;

  ctx.drawImage(
    imgStreet,
    prop.x,
    prop.y,
    prop.w,
    prop.h,
    px,
    py,
    propW,
    propH
  );
}

/*
  The source buildings already contain a posed shopkeeper. The separate
  keeper sprites are drawn over that window with a very small, opaque glass
  shadow/backplate so the moving keeper reads as the live foreground figure
  rather than a duplicate. The movement is intentionally restrained.
*/

// One set of window fractions. The keeper and the night light both use this,
// so a later shop change stays aligned.
const SHOP_PANES = [
  { x: 0.06, y: 0.560, w: 0.56, h: 0.280 },
  { x: 0.06, y: 0.558, w: 0.55, h: 0.282 },
  { x: 0.07, y: 0.558, w: 0.54, h: 0.282 },
  { x: 0.12, y: 0.628, w: 0.52, h: 0.248 },
  { x: 0.08, y: 0.575, w: 0.52, h: 0.255 },
  { x: 0.06, y: 0.560, w: 0.55, h: 0.280 }
];

function shopWindowRect(index, x, y, w, h) {
  const pane = SHOP_PANES[index] || SHOP_PANES[0];

  return {
    x: x + w * pane.x,
    y: y + h * pane.y,
    w: w * pane.w,
    h: h * pane.h
  };
}

function drawKeeper(index, x, y, w, h, phaseSeed) {
  const keeper = KEEPERS[index];

  if (!streetLoaded || !keeper) return;

  // Glass under the awning. Most fronts have the door on the right, so the
  // pane is left of centre. Red Lion is a wider glazed front.
  const win = shopWindowRect(
    index,
    x,
    y,
    w,
    h
  );

  const wx = win.x;
  const wy = win.y;
  const ww = win.w;
  const wh = win.h;

  const phase = clock * 2.1 + phaseSeed;

  const ahead =
    PLAYER_Y -
    (y + h * 0.72);

  const near =
    ahead > -40 &&
    ahead < 150;

  const cheer =
    near
      ? Math.max(0, Math.sin(clock * 10))
      : 0;

  const bob =
    Math.sin(phase) * 0.7 -
    cheer * 5;

  const breathe =
    1 +
    Math.sin(phase * 0.9 + 0.8) * 0.012 +
    cheer * 0.06;

  const shift =
    Math.sin(
      clock * 0.75 +
      phaseSeed * 1.7
    ) * 0.6;

  // Other windows are large, so the keeper fills them. The pub glass is smaller,
  // so match the other keepers' size and let the frame crop him.
  const size =
    [1, 1, 1, 1.55, 1, 1][index] || 1;

  const fitH =
    wh * 0.96 * size;

  const fitW =
    ww * 0.86 * size;

  let keeperH = fitH;

  let keeperW =
    keeperH *
    (keeper.w / keeper.h);

  if (keeperW > fitW) {
    keeperW = fitW;
    keeperH =
      keeperW *
      (keeper.h / keeper.w);
  }

  const baseX =
    wx +
    ww * 0.5 +
    shift;

  const drop =
    [0, 1, 5].includes(index)
      ? wh * 0.16
      : index === 3
        ? wh * 0.22
        : 0;

  const baseY =
    wy +
    wh -
    1 +
    bob +
    drop;

  ctx.save();

  ctx.beginPath();

  ctx.rect(
    wx + 1,
    wy + 1,
    Math.max(1, ww - 2),
    Math.max(1, wh - 2)
  );

  ctx.clip();

  ctx.translate(baseX, baseY);
  ctx.scale(1, breathe);

  ctx.drawImage(
    imgStreet,
    keeper.x,
    keeper.y,
    keeper.w,
    keeper.h,
    -keeperW / 2,
    -keeperH,
    keeperW,
    keeperH
  );

  ctx.restore();

  // A light sheen keeps them reading as behind the glass, not stuck on it.
  ctx.save();

  ctx.beginPath();

  ctx.rect(
    wx,
    wy,
    ww,
    wh
  );

  ctx.clip();

  const sheen =
    ctx.createLinearGradient(
      wx,
      wy,
      wx + ww * 0.65,
      wy + wh
    );

  sheen.addColorStop(
    0,
    'rgba(255,255,255,0.055)'
  );

  sheen.addColorStop(
    0.38,
    'rgba(255,255,255,0)'
  );

  sheen.addColorStop(
    1,
    'rgba(8,16,28,0.045)'
  );

  ctx.fillStyle = sheen;

  ctx.fillRect(
    wx,
    wy,
    ww,
    wh
  );

  ctx.restore();
}

function drawStreetBuilding(
  buildingIndex,
  x,
  y,
  w,
  h,
  phaseSeed
) {
  if (buildingIndex < 0) return;

  const b = BUILDINGS[buildingIndex];

  if (!streetLoaded || !b) return;

  ctx.drawImage(
    imgStreet,
    b.x,
    b.y,
    b.w,
    b.h,
    x,
    y,
    w,
    h
  );

  drawKeeper(
    b.keeper,
    x,
    y,
    w,
    h,
    phaseSeed
  );
}

function cobbleFor(kind) {
  const img =
    cobbleImgs[kind] ||
    cobbleImgs.weeds;

  return img && img.ready
    ? img
    : (
      cobbleImgs.weeds &&
      cobbleImgs.weeds.ready
        ? cobbleImgs.weeds
        : null
    );
}

const COBBLE_CELL = 48;

const COBBLE_MIX = [
  ['base',0.50],
  ['light',0.12],
  ['sparse',0.08],
  ['weeds',0.07],
  ['dense',0.04],
  ['leaves',0.08],
  ['grime',0.05],
  ['cracked',0.06]
];

function cellHash(c, r) {
  let h =
    Math.imul(c, 374761393) +
    Math.imul(r, 668265263) |
    0;

  h =
    Math.imul(
      h ^ (h >>> 13),
      1274126177
    );

  return (
    (h ^ (h >>> 16)) >>> 0
  ) / 4294967296;
}

function mixKind(c, r) {
  const t = cellHash(c, r);

  let acc = 0;

  for (const [k, p] of COBBLE_MIX) {
    acc += p;

    if (t < acc) return k;
  }

  return 'base';
}

function drawCobbles(x, y, w, h, kind) {
  const C = COBBLE_CELL;

  const off =
    ((scrollY % C) + C) % C;

  const shift =
    Math.floor(scrollY / C);

  const j0 =
    Math.floor((y - off) / C);

  const c0 =
    Math.floor(x / C);

  ctx.save();

  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  for (
    let j = j0;
    j * C + off < y + h;
    j++
  ) {
    const ty =
      j * C + off;

    const r =
      j - shift;

    for (
      let c = c0;
      c * C < x + w;
      c++
    ) {
      const k =
        (!kind || kind === 'base')
          ? mixKind(c, r)
          : kind;

      const img = cobbleFor(k);

      if (!img) {
        ctx.fillStyle = '#6e7276';

        ctx.fillRect(
          c * C,
          ty,
          C + 0.5,
          C + 0.5
        );

        continue;
      }

      const hw =
        img.naturalWidth / 2;

      const hh =
        img.naturalHeight / 2;

      ctx.drawImage(
        img,
        (((c % 2) + 2) % 2) * hw,
        (((r % 2) + 2) % 2) * hh,
        hw,
        hh,
        c * C,
        ty,
        C + 0.5,
        C + 0.5
      );
    }
  }

  ctx.restore();
}

function forEachStreetFront(cb) {
  const peek = 56;

  const base =
    Math.floor(
      (distance + peek) /
      STREET_SEGMENT_H
    );

  for (
    let pass = -1;
    pass <= 3;
    pass++
  ) {
    const index = base + pass;

    if (index < 0) continue;

    const y =
      distance -
      index * STREET_SEGMENT_H +
      (STREET_SEGMENT_H - peek);

    const plan =
      STREET[
        ((index % STREET.length) +
          STREET.length) %
        STREET.length
      ];

    cb(
      plan,
      index,
      y
    );
  }
}

function drawHighStreet() {
  ctx.fillStyle = '#1a1e24';
  ctx.fillRect(
    0,
    0,
    W,
    H
  );

  // Cobbles sit behind the shops, so the space around each chimney is pavement.
  const leftW = ROAD_LEFT;
  const rightX = ROAD_RIGHT;

  drawCobbles(
    0,
    0,
    leftW,
    H,
    'base'
  );

  drawCobbles(
    rightX,
    0,
    W - rightX,
    H,
    'base'
  );

  if (!streetLoaded) {
    ctx.fillStyle = '#3a3030';

    ctx.fillRect(
      0,
      0,
      ROAD_LEFT - PAVEMENT_WIDTH,
      H
    );

    ctx.fillStyle = '#30343a';

    ctx.fillRect(
      ROAD_RIGHT + PAVEMENT_WIDTH,
      0,
      W - ROAD_RIGHT - PAVEMENT_WIDTH,
      H
    );

    return;
  }

  // The next roof stays just above the screen, so a shop approaches instead of popping in.
  forEachStreetFront(
    (plan, index, y) => {
      drawStreetBuilding(
        shopByName(plan.left),
        0,
        y,
        BUILDING_WIDTH,
        BUILDING_H,
        false,
        index * 2.1 + 0.4
      );

      drawCobbles(
        0,
        y + BUILDING_H,
        BUILDING_WIDTH,
        DETAIL_H,
        plan.leftGround || 'weeds'
      );

      drawSideLayers(
        0,
        y + BUILDING_H,
        BUILDING_WIDTH,
        DETAIL_H,
        plan,
        'left'
      );

      drawGroundPatch(
        0,
        y + BUILDING_H,
        BUILDING_WIDTH,
        DETAIL_H,
        plan.leftGround
      );

      drawStreetBuilding(
        shopByName(plan.right),
        ROAD_RIGHT + PAVEMENT_WIDTH,
        y,
        W - ROAD_RIGHT - PAVEMENT_WIDTH,
        BUILDING_H,
        true,
        index * 2.1 + 2.7
      );

      drawCobbles(
        ROAD_RIGHT + PAVEMENT_WIDTH,
        y + BUILDING_H,
        W - ROAD_RIGHT - PAVEMENT_WIDTH,
        DETAIL_H,
        plan.rightGround || 'weeds'
      );

      drawSideLayers(
        ROAD_RIGHT + PAVEMENT_WIDTH,
        y + BUILDING_H,
        W - ROAD_RIGHT - PAVEMENT_WIDTH,
        DETAIL_H,
        plan,
        'right'
      );

      drawGroundPatch(
        ROAD_RIGHT + PAVEMENT_WIDTH,
        y + BUILDING_H,
        W - ROAD_RIGHT - PAVEMENT_WIDTH,
        DETAIL_H,
        plan.rightGround
      );
    }
  );
}

function drawPavements() {
  // A light kerb, not a dark slot, so the shop front does not fuse with the road.
  ctx.fillStyle = '#c4c2bc';

  ctx.fillRect(
    ROAD_LEFT - 3,
    0,
    3,
    H
  );

  ctx.fillRect(
    ROAD_RIGHT,
    0,
    3,
    H
  );

  ctx.fillStyle = '#8d8a84';

  ctx.fillRect(
    ROAD_LEFT - 1,
    0,
    1,
    H
  );

  ctx.fillRect(
    ROAD_RIGHT,
    0,
    1,
    H
  );
}

function mk(fn) {
  const s =
    document.createElement('canvas');

  s.width = s.height = 120;

  const c =
    s.getContext('2d');

  c.translate(60, 60);
  c.lineJoin = 'round';
  c.lineCap = 'round';

  fn(c);

  return s;
}

function dMush(c) {
  c.lineWidth=3;
  c.strokeStyle='#2b1810';
  c.fillStyle='#f5eedc';

  c.beginPath();
  c.moveTo(-12,5);
  c.lineTo(-10,38);
  c.lineTo(10,38);
  c.lineTo(12,5);
  c.closePath();
  c.fill();
  c.stroke();

  c.fillStyle='#8a5a36';

  c.beginPath();
  c.arc(
    0,
    5,
    32,
    Math.PI,
    0
  );

  c.closePath();
  c.fill();
  c.stroke();
}

function dFork(c) {
  c.lineWidth=3;
  c.strokeStyle='#a0b0c0';
  c.fillStyle='#e8f2fc';

  c.fillRect(
    -6,
    -10,
    12,
    48
  );

  c.strokeRect(
    -6,
    -10,
    12,
    48
  );

  [-14,-6,2,10].forEach(
    x => {
      c.fillRect(
        x,
        -42,
        4,
        34
      );

      c.strokeRect(
        x,
        -42,
        4,
        34
      );
    }
  );

  c.fillRect(
    -16,
    -12,
    32,
    8
  );

  c.strokeRect(
    -16,
    -12,
    32,
    8
  );
}

function dKebab(c) {
  c.lineWidth=3;
  c.strokeStyle='#4a2a10';
  c.fillStyle='#5aa832';

  [
    [-18,-6],
    [0,-12],
    [18,-6]
  ].forEach(
    ([x,y]) => {
      c.beginPath();
      c.ellipse(
        x,
        y,
        12,
        8,
        0,
        0,
        7
      );
      c.fill();
      c.stroke();
    }
  );

  c.fillStyle='#8a4b22';

  [
    [-10,-14],
    [6,-16],
    [-2,-6],
    [12,-8]
  ].forEach(
    ([x,y]) => {
      c.beginPath();
      c.ellipse(
        x,
        y,
        11,
        6,
        0,
        0,
        7
      );
      c.fill();
      c.stroke();
    }
  );

  c.fillStyle='#d8322c';

  [
    [-16,-12],
    [16,-14]
  ].forEach(
    ([x,y]) => {
      c.beginPath();
      c.ellipse(
        x,
        y,
        6,
        4,
        0,
        0,
        7
      );
      c.fill();
      c.stroke();
    }
  );

  c.fillStyle='#f2cf8c';

  c.beginPath();
  c.ellipse(
    0,
    4,
    28,
    24,
    0,
    0,
    Math.PI
  );
  c.closePath();
  c.fill();
  c.stroke();
}

function dFish(c) {
  c.lineWidth=3;
  c.strokeStyle='#4a3208';
  c.fillStyle='#ffd23f';

  [
    [-18,-3,-.3],
    [-8,-6,-.1],
    [2,-8,.05],
    [12,-6,.2],
    [22,-3,.4]
  ].forEach(
    ([x,y,a]) => {
      c.save();
      c.translate(x,y);
      c.rotate(a);

      c.fillRect(
        -3.5,
        -22,
        7,
        26
      );

      c.strokeRect(
        -3.5,
        -22,
        7,
        26
      );

      c.restore();
    }
  );

  c.save();

  c.translate(-2,-6);
  c.rotate(-.45);
  c.fillStyle='#e9a23b';

  c.beginPath();
  c.ellipse(
    0,
    0,
    24,
    10,
    0,
    0,
    7
  );
  c.fill();
  c.stroke();

  c.beginPath();
  c.moveTo(22,0);
  c.lineTo(32,-8);
  c.lineTo(32,8);
  c.closePath();
  c.fill();
  c.stroke();

  c.restore();

  c.fillStyle='#fff';

  c.beginPath();
  c.moveTo(-26,3);
  c.lineTo(26,3);
  c.lineTo(20,32);
  c.lineTo(-20,32);
  c.closePath();
  c.fill();

  c.fillStyle='#1f5fbf';

  [-20,-8,4,16].forEach(
    x => {
      c.beginPath();
      c.moveTo(x,3);
      c.lineTo(x+6,3);
      c.lineTo((x+6)*.79,32);
      c.lineTo(x*.79,32);
      c.closePath();
      c.fill();
    }
  );

  c.beginPath();
  c.moveTo(-26,3);
  c.lineTo(26,3);
  c.lineTo(20,32);
  c.lineTo(-20,32);
  c.closePath();
  c.stroke();
}

function dRoast(c) {
  c.lineWidth=3;
  c.strokeStyle='#3a2a10';
  c.fillStyle='#fff';

  c.beginPath();
  c.ellipse(
    0,
    12,
    38,
    20,
    0,
    0,
    7
  );
  c.fill();
  c.stroke();

  c.fillStyle='#e6edf4';

  c.beginPath();
  c.ellipse(
    0,
    12,
    28,
    15,
    0,
    0,
    7
  );
  c.fill();

  c.fillStyle='#7a4318';

  c.beginPath();
  c.ellipse(
    3,
    14,
    21,
    9,
    0,
    0,
    7
  );
  c.fill();

  c.fillStyle='#f0b640';

  [
    [-24,8],
    [-18,16]
  ].forEach(
    ([x,y]) => {
      c.beginPath();
      c.ellipse(
        x,
        y,
        8,
        5,
        .3,
        0,
        0,
        7
      );
      c.fill();
      c.stroke();
    }
  );

  c.fillStyle='#b4573f';

  [
    [-8,5,-.3],
    [3,3,.1]
  ].forEach(
    ([x,y,a]) => {
      c.save();
      c.translate(x,y);
      c.rotate(a);

      c.beginPath();
      c.ellipse(
        0,
        0,
        13,
        7,
        0,
        0,
        7
      );
      c.fill();
      c.stroke();

      c.restore();
    }
  );

  c.fillStyle='#e9b04f';

  c.beginPath();
  c.moveTo(12,8);
  c.lineTo(15,-10);
  c.quadraticCurveTo(
    22,
    -18,
    29,
    -10
  );
  c.lineTo(32,8);
  c.quadraticCurveTo(
    22,
    14,
    12,
    8
  );
  c.closePath();
  c.fill();
  c.stroke();

  c.fillStyle='#4caf3a';

  [
    [-5,20],
    [2,23],
    [-11,23],
    [6,18]
  ].forEach(
    ([x,y]) => {
      c.beginPath();
      c.arc(
        x,
        y,
        3,
        0,
        7
      );
      c.fill();
    }
  );
}

const imgMush =
  loadGary('mushroom.png?v=1');

const imgFork =
  loadGary('fork.png?v=1');

const imgRoast =
  loadGary('roast.png');

const SP = {
  m: mk(dMush),
  fork: mk(dFork),
  kebab: mk(dKebab),
  fish: mk(dFish),
  roast: mk(dRoast)
};

function rr(c,x,y,w,h,r) {
  c.beginPath();
  c.moveTo(x+r,y);
  c.arcTo(
    x+w,
    y,
    x+w,
    y+h,
    r
  );
  c.arcTo(
    x+w,
    y+h,
    x,
    y+h,
    r
  );
  c.arcTo(
    x,
    y+h,
    x,
    y,
    r
  );
  c.arcTo(
    x,
    y,
    x+w,
    y,
    r
  );
  c.closePath();
}

function txt(s,x,y,size,col,al) {
  ctx.font =
    '900 ' +
    size +
    'px "Arial Black",Impact,sans-serif';

  ctx.textAlign = al;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';

  ctx.strokeStyle =
    'rgba(0,0,0,.85)';

  ctx.strokeText(
    s,
    x,
    y
  );

  ctx.fillStyle = col;

  ctx.fillText(
    s,
    x,
    y
  );
}

function fbFace(c,r) {
  c.fillStyle='#ffd166';
  c.strokeStyle='#4a2a10';
  c.lineWidth=4;

  c.beginPath();
  c.arc(
    0,
    0,
    r,
    0,
    Math.PI*2
  );
  c.fill();
  c.stroke();

  c.fillStyle='#222';

  c.beginPath();

  c.arc(
    -r*.35,
    -r*.2,
    r*.12,
    0,
    Math.PI*2
  );

  c.arc(
    r*.35,
    -r*.2,
    r*.12,
    0,
    Math.PI*2
  );

  c.fill();

  c.beginPath();

  c.arc(
    0,
    0,
    r*.5,
    .15*Math.PI,
    .85*Math.PI
  );

  c.stroke();
}

function lx(l) {
  return ROAD_LEFT +
    (l + 0.5) *
    LANE_WIDTH;
}

function triggerGrin() {
  grinTimer = 1.3;

  const px = lx(lane);

  for(let i=0;i<20;i++){
    const angle =
      Math.random() *
      Math.PI *
      2;

    const speed =
      40 +
      Math.random() *
      90;

    const side =
      Math.random() < .5
        ? -30
        : 30;

    stars.push({
      x:px+side,
      y:PLAYER_Y-35,
      vx:Math.cos(angle)*speed,
      vy:Math.sin(angle)*speed,
      life:.6+Math.random()*.5,
      maxLife:1.1,
      size:4+Math.random()*5
    });
  }
}

function reset() {
  score=0;
  tierMax=0;
  lastTierIndex=0;
  lane=target=1;
  scrollY=0;
  distance=0;
  acc=0;
  gap=LEARN_GAP;

  playTime=0;
  nightMix=0;
  nightOn=false;

  objs=[];
  fx=[];
  cap=null;
  mile=0;
  crashT=0;
  grinTimer=0;
  stars=[];
  nextEvent=0;
  nextRow=0;
  roadQueue=[];
  nearCd=0;
  lastHit=null;
  shownSpeed=200;
  flash=0;

  review=0;
  reviewMul=1;
  reviewGap=0;
  hitStop=0;
  laneSquash=0;

  lastLanes=[
    'none',
    'none',
    'none'
  ];

  performance = {
    foodSpawned: 0,
    foodEaten: 0,
    hazardsPassed: 0,
    collisions: 0,
    laneChanges: 0,
    nearMisses: 0,
    distance: 0
  };

  finalRating = 1;
}

function move(d) {
  if(state!=='play') return;

  const next =
    Math.max(
      0,
      Math.min(
        2,
        target+d
      )
    );

  if(next!==target) {
    laneSquash=0.09;
    performance.laneChanges++;
  }

  target=next;
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

function isFood(kind) {
  return (
    kind === 'kebab' ||
    kind === 'fish' ||
    kind === 'roast'
  );
}

function isSafeKind(kind) {
  return (
    !kind ||
    kind === 'none' ||
    isFood(kind)
  );
}

function safeLanesOf(lanes) {
  const out = [];

  for(let i=0;i<3;i++) {
    if(isSafeKind(lanes[i]))
      out.push(i);
  }

  return out;
}

function hasFood(lanes) {
  return lanes.some(isFood);
}

function paceGap() {
  if(score < 250)
    return LEARN_GAP;

  const t =
    Math.min(
      1,
      (score - 250) / 650
    );

  return (
    LEARN_GAP +
    (RUN_GAP - LEARN_GAP) *
    t
  );
}

function gapBefore(nextRow, prevRow) {
  if(nextRow && nextRow.dare)
    return DARE_APPROACH;

  if(prevRow && prevRow.dare)
    return AFTER_DARE;

  return (
    paceGap() +
    Math.random() *
    GAP_SLACK
  );
}

function forceShare(prev, lanes) {
  const next = lanes.slice();

  if(!safeLanesOf(next).length)
    next[1] = 'none';

  const prevSafe =
    safeLanesOf(prev);

  if(
    !prevSafe.length ||
    prevSafe.some(
      i => isSafeKind(next[i])
    )
  )
    return next;

  next[
    prevSafe.indexOf(1) >= 0
      ? 1
      : prevSafe[0]
  ] = 'none';

  return next;
}

function placePlate(prev, lanes) {
  const next = lanes.slice();

  if(
    hasFood(next) ||
    !hasFood(prev)
  )
    return next;

  const stay = [];

  prev.forEach(
    (k, i) => {
      if(isFood(k))
        stay.push(i);
    }
  );

  let slot = -1;

  for(const i of stay) {
    if(
      !next[i] ||
      next[i] === 'none'
    ) {
      slot = i;
      break;
    }
  }

  if(slot < 0) {
    for(
      const i of safeLanesOf(prev)
    ) {
      if(
        !next[i] ||
        next[i] === 'none'
      ) {
        slot = i;
        break;
      }
    }
  }

  if(slot >= 0)
    next[slot] = 'kebab';

  return next;
}

function prepareRow(prev, row) {
  return {
    lanes: placePlate(
      prev,
      forceShare(
        prev,
        row.lanes
      )
    ),
    dare: row.dare || false
  };
}

function cloneStretch(rows) {
  return rows.map(
    lanes => ({
      lanes: lanes.slice(),
      dare: false
    })
  );
}

function insertDare(stretch, prev) {
  const dare = {
    lanes: [
      'm',
      'roast',
      'm'
    ],
    dare: true
  };

  for(
    let i=0;
    i<=stretch.length;
    i++
  ) {
    const before =
      i === 0
        ? prev
        : stretch[i - 1].lanes;

    const after =
      i === stretch.length
        ? null
        : stretch[i].lanes;

    if(
      isSafeKind(before[1]) &&
      (!after ||
        isSafeKind(after[1]))
    ) {
      stretch.splice(
        i,
        0,
        dare
      );

      return;
    }
  }

  stretch.unshift({
    lanes: [
      'none',
      'kebab',
      'none'
    ],
    dare: false
  });

  stretch.splice(
    1,
    0,
    dare
  );
}

function nextStretch() {
  const bag =
    score < 250
      ? STRETCHES.early
      : score < 900
        ? STRETCHES.mid
        : STRETCHES.late;

  const stretch =
    cloneStretch(
      bag[
        Math.floor(
          Math.random() *
          bag.length
        )
      ]
    );

  const dareLive =
    objs.some(
      o =>
        o.dare &&
        !o.d
    );

  if(
    score >= 900 &&
    !dareLive &&
    !stretch.some(
      row => row.dare
    )
  ) {
    insertDare(
      stretch,
      lastLanes
    );
  }

  let prev = lastLanes;
  const out = [];

  for(const row of stretch) {
    const ready =
      prepareRow(
        prev,
        row
      );

    out.push(ready);
    prev = ready.lanes;
  }

  return out;
}

function spawnRow() {
  if(!roadQueue.length)
    roadQueue =
      nextStretch();

  const row =
    roadQueue.shift();

  row.lanes.forEach(
    (kind, laneIndex) => {
      if(
        !kind ||
        kind === 'none'
      )
        return;

      const item = {
        t: kind,
        l: laneIndex,
        y: -60,
        id: uid++
      };

      if(
        row.dare &&
        kind === 'roast'
      )
        item.dare = 1;

      if(isFood(kind))
        performance.foodSpawned++;

      objs.push(item);
    }
  );

  lastLanes =
    row.lanes.slice();

  if(!roadQueue.length)
    roadQueue =
      nextStretch();

  gap =
    gapBefore(
      roadQueue[0],
      row
    );
}

/* layout:end */

function collect(o) {
  performance.foodEaten++;

  review =
    Math.min(
      9,
      review + 1
    );

  reviewGap = 1.5;

  reviewMul =
    review >= 5
      ? 3
      : review >= 3
        ? 2
        : 1;

  const pts =
    FOODS[o.t] *
    reviewMul;

  score += pts;

  const col =
    (
      TIERS[tierOf(score)] ||
      TIERS[0]
    ).c;

  fx.push({
    x:lx(o.l),
    y:o.y,
    t:0,
    life:1.1,
    txt:'+'+pts,
    col:col,
    pop:1
  });

  let grin =
    o.t === 'roast' ||
    review === 3 ||
    review === 6;

  if(o.dare) {
    grin = true;

    cap = {
      s:
        CAPS[
          review %
          CAPS.length
        ],
      t:0
    };
  }

  const currentTier =
    tierOf(score);

  if(
    currentTier >
    lastTierIndex
  ) {
    lastTierIndex =
      currentTier;

    grin = true;
  }

  if(grin)
    triggerGrin();

  tierMax =
    Math.max(
      tierMax,
      currentTier
    );

  checkEvents();

  mile =
    Math.floor(
      score / 40
    );
}

function checkEvents() {
  while(
    nextEvent <
    EVENTS.length &&
    score >=
      EVENTS[nextEvent].at
  ) {
    const ev =
      EVENTS[nextEvent++];

    if(ev.say)
      cap = {
        s:ev.say,
        t:0
      };

    if(ev.grin)
      triggerGrin();
  }
}

function crash(hitType){
  performance.collisions++;

  crashT=0;
  lastHit=hitType;
  cap=null;
  state='crash_'+hitType;
}

function calculatePerformanceRating() {
  const survivalScore =
    Math.min(
      performance.distance / 1800,
      1
    );

  const foodScore =
    performance.foodSpawned > 0
      ? Math.min(
          performance.foodEaten /
            performance.foodSpawned,
          1
        )
      : 0;

  const hazardAttempts =
    performance.hazardsPassed +
    performance.collisions;

  const avoidanceScore =
    hazardAttempts > 0
      ? performance.hazardsPassed /
        hazardAttempts
      : 1;

  const nearMissScore =
    Math.min(
      performance.nearMisses / 8,
      1
    );

  const movementPenalty =
    Math.min(
      Math.max(
        performance.laneChanges - 20,
        0
      ) / 40,
      1
    );

  let rating =
      survivalScore * 3.0
    + foodScore * 2.5
    + avoidanceScore * 2.5
    + nearMissScore * 2.0
    - movementPenalty * 0.5;

  rating =
    Math.max(
      1,
      Math.min(
        10,
        rating
      )
    );

  return Math.round(rating);
}