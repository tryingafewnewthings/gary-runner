
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

let audioCtx, analyser, dataArray;
let animTimer = 0, currentFrame = 0, introAnimTimer = 0;

let openLoaded = false, closedLoaded = false, crashLoaded = false, streetLoaded = false;
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
const imgRun = [loadGary('gary_run1.png?v=5'), loadGary('gary_run2.png?v=5')];
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
const STREET_SHEET_W = 2912;
const STREET_SHEET_H = 2688;

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
imgStreet.onload = () => { streetLoaded = true; };
imgStreet.onerror = () => { loadErrorLog.push('high_street_sprites.webp not found'); };
imgStreet.src = 'high_street_sprites.webp?v=8';

const COBBLE_KINDS = {
  base: 'cobble_base.png?v=3',
  weeds: 'cobble_weeds.png?v=3',
  light: 'cobble_weeds_light.png?v=3',
  sparse: 'cobble_weeds_sparse.png?v=3',
  dense: 'cobble_weeds_dense.png?v=3',
  moss: 'cobble_moss.png?v=3',
  damp: 'cobble_moss.png?v=3'
};
const cobbleImgs = {};
Object.entries(COBBLE_KINDS).forEach(([kind, file]) => {
  const img = new Image();
  img.onload = () => { img.ready = true; };
  img.onerror = () => { loadErrorLog.push(file + ' not found'); };
  img.src = file;
  cobbleImgs[kind] = img;
});

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
  if (objectName === 'lamp') lampGlows.push(py + propH * 0.45);
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
  The source buildings already contain a posed shopkeeper. The separate
  keeper sprites are drawn over that window with a very small, opaque glass
  shadow/backplate so the moving keeper reads as the live foreground figure
  rather than a duplicate. The movement is intentionally restrained.
*/
function drawKeeper(index, x, y, w, h, isRight, phaseSeed) {
  const keeper = KEEPERS[index];
  if (!streetLoaded || !keeper) return;

  // Glass under the awning. Most fronts have the door on the right, so the
  // pane is left of centre. Red Lion is a wider glazed front.
  const panes = [
    { x: 0.06, y: 0.560, w: 0.56, h: 0.280 },
    { x: 0.06, y: 0.558, w: 0.55, h: 0.282 },
    { x: 0.07, y: 0.558, w: 0.54, h: 0.282 },
    { x: 0.12, y: 0.628, w: 0.52, h: 0.248 },
    { x: 0.08, y: 0.575, w: 0.52, h: 0.255 },
    { x: 0.06, y: 0.560, w: 0.55, h: 0.280 }
  ];
  const pane = panes[index] || panes[0];
  const wx = x + w * pane.x;
  const wy = y + h * pane.y;
  const ww = w * pane.w;
  const wh = h * pane.h;

  const phase = clock * 2.1 + phaseSeed;
  const ahead = PLAYER_Y - (y + h * 0.72);
  const near = ahead > -40 && ahead < 150;
  const cheer = near ? Math.max(0, Math.sin(clock * 10)) : 0;
  const bob = Math.sin(phase) * 0.7 - cheer * 5;
  const breathe = 1 + Math.sin(phase * 0.9 + 0.8) * 0.012 + cheer * 0.06;
  const shift = Math.sin(clock * 0.75 + phaseSeed * 1.7) * 0.6;

  // Other windows are large, so the keeper fills them. The pub glass is smaller,
  // so match the other keepers' size and let the frame crop him.
  const size = [1, 1, 1, 1.55, 1, 1][index] || 1;
  const fitH = wh * 0.96 * size;
  const fitW = ww * 0.86 * size;
  let keeperH = fitH;
  let keeperW = keeperH * (keeper.w / keeper.h);
  if (keeperW > fitW) {
    keeperW = fitW;
    keeperH = keeperW * (keeper.h / keeper.w);
  }
  const baseX = wx + ww * 0.5 + shift;
  const drop = index === 3 ? wh * 0.22 : 0;
  const baseY = wy + wh - 1 + bob + drop;

  ctx.save();
  ctx.beginPath();
  ctx.rect(wx + 1, wy + 1, Math.max(1, ww - 2), Math.max(1, wh - 2));
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
  sheen.addColorStop(0, 'rgba(255,255,255,0.12)');
  sheen.addColorStop(0.38, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(8,16,28,0.08)');
  ctx.fillStyle = sheen;
  ctx.fillRect(wx, wy, ww, wh);
  ctx.restore();
}

function drawStreetBuilding(buildingIndex, x, y, w, h, isRight, phaseSeed) {
  if (buildingIndex < 0) return;
  const b = BUILDINGS[buildingIndex];
  if (!streetLoaded || !b) return;

  ctx.drawImage(imgStreet, b.x, b.y, b.w, b.h, x, y, w, h);
  drawKeeper(b.keeper, x, y, w, h, isRight, phaseSeed);
}

function cobbleFor(kind) {
  const img = cobbleImgs[kind] || cobbleImgs.weeds;
  return img && img.ready ? img : (cobbleImgs.weeds && cobbleImgs.weeds.ready ? cobbleImgs.weeds : null);
}

function drawCobbles(x, y, w, h, kind) {
  const img = cobbleFor(kind || 'weeds');
  if (!img) {
    ctx.fillStyle = '#6e7276';
    ctx.fillRect(x, y, w, h);
    return;
  }
  const tile = img.height;
  const off = ((scrollY % tile) + tile) % tile;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.translate(0, off);
  ctx.fillStyle = ctx.createPattern(img, 'repeat');
  ctx.fillRect(x, y - tile, w, h + tile * 2);
  ctx.restore();
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
  const peek = 56;
  const base = Math.floor((distance + peek) / STREET_SEGMENT_H);

  for (let pass = -1; pass <= 3; pass++) {
    const index = base + pass;
    if (index < 0) continue;
    const y = distance - index * STREET_SEGMENT_H + (STREET_SEGMENT_H - peek);

    const plan = STREET[((index % STREET.length) + STREET.length) % STREET.length];
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
  }
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

const imgMush = loadGary('mushroom.png?v=1');
const imgFork = loadGary('fork.png?v=1');
const imgRoast = loadGary('roast.png');
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
  score=0;tierMax=0;lastTierIndex=0;lane=target=1;scrollY=0;distance=0;acc=0;gap=LEARN_GAP;
  objs=[];fx=[];cap=null;mile=0;crashT=0;grinTimer=0;stars=[];nextEvent=0;nextRow=0;roadQueue=[];nearCd=0;lastHit=null;shownSpeed=200;flash=0;
  review=0;reviewMul=1;reviewGap=0;hitStop=0;laneSquash=0;
  lastLanes=['none','none','none'];
}
function move(d) {
  if(state!=='play') return;
  const next=Math.max(0,Math.min(2,target+d));
  if(next!==target) laneSquash=0.09;
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
function isFood(kind) { return kind === 'kebab' || kind === 'fish' || kind === 'roast'; }
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
    const item = { t: kind, l: laneIndex, y: -60, id: uid++ };
    if (row.dare && kind === 'roast') item.dare = 1;
    objs.push(item);
  });
  lastLanes = row.lanes.slice();
  if (!roadQueue.length) roadQueue = nextStretch();
  gap = gapBefore(roadQueue[0], row);
}
/* layout:end */
function collect(o) {
  review = Math.min(9, review + 1);
  reviewGap = 1.5;
  reviewMul = review >= 5 ? 3 : review >= 3 ? 2 : 1;
  const pts = FOODS[o.t] * reviewMul;
  score += pts;
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
  while (nextEvent < EVENTS.length && score >= EVENTS[nextEvent].at) {
    const ev = EVENTS[nextEvent++];
    if (ev.say) cap = { s: ev.say, t: 0 };
    if (ev.grin) triggerGrin();
  }
}
function crash(hitType){crashT=0;lastHit=hitType;cap=null;state='crash_'+hitType;}
function endGame(){
  state='over';cap=null;
  if(score>best){best=score;try{localStorage.setItem('garyBest',best);}catch(e){}}
  try{
    $('fScore').textContent='Score: '+score;
    const T=TIERS[tierMax]||TIERS[TIERS.length-1];
    $('fTier').textContent='Tier: '+T.n;$('fTier').style.color=T.c;$('over').classList.add('show');
  }catch(e){}
}
function startGameplay(){
  $('introOverlay').classList.remove('show');garyAudio.pause();garyAudio.currentTime=0;reset();state='play';
}
function getActiveImage(isOpen){
  if(isOpen&&openLoaded)return imgOpen;
  if(!isOpen&&closedLoaded)return imgClosed;
  return openLoaded?imgOpen:closedLoaded?imgClosed:null;
}
function initAudio(){
  if(audioCtx)return;
  try{
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    audioCtx=new AudioContext();analyser=audioCtx.createAnalyser();analyser.fftSize=256;
    dataArray=new Uint8Array(analyser.frequencyBinCount);
    const source=audioCtx.createMediaElementSource(garyAudio);source.connect(analyser);analyser.connect(audioCtx.destination);
  }catch(e){console.warn('Audio Context init error:',e);}
}
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

function update(dt){
  clock+=dt;
  lane+=(target-lane)*Math.min(1,dt/0.09);
  if(laneSquash>0)laneSquash=Math.max(0,laneSquash-dt);
  if(grinTimer>0)grinTimer=Math.max(0,grinTimer-dt);

  for(let i=stars.length-1;i>=0;i--){
    const s=stars[i];s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;if(s.life<=0)stars.splice(i,1);
  }
  if(cap){cap.t+=dt;if(cap.t>2.2)cap=null;}
  for(const f of fx)f.t+=dt;
  fx=fx.filter(f=>f.t<f.life);

  const aim=Math.min(300,200+Math.floor(score/150)*10);
  shownSpeed+=(aim-shownSpeed)*Math.min(1,dt*0.7);
  const speed=shownSpeed;
  if(state==='menu'||state==='intro'){return;}
  if(state.startsWith('crash')){crashT+=dt;if(crashT>0.55)endGame();return;}
  if(state!=='play')return;
  if(nearCd>0)nearCd-=dt;
  if(flash>0)flash-=dt;
  if(review>0){
    reviewGap-=dt;
    if(reviewGap<=0){review=0;reviewMul=1;}
  }

  distance+=speed*dt; scrollY=distance;
  acc+=dt;
  let spawned = 0;
  while (acc >= gap && spawned < 3) { acc -= gap; spawnRow(); spawned++; }

  for(const o of objs){
    o.y+=speed*dt;
    if(!o.d&&Math.abs(o.y-PLAYER_Y)<32*S&&Math.abs(lane-o.l)<.55){
      o.d=1;
      if(o.t==='m'||o.t==='fork'){review=0;reviewMul=1;crash(o.t);return;}
      collect(o);
    }else if(o.dare&&!o.d&&!o.refused&&o.y>PLAYER_Y+36){
      o.refused=1;o.d=1;
      score+=10;
      fx.push({x:lx(1),y:PLAYER_Y-28,t:0,life:1.1,txt:'+10',col:'#ffe600'});
      cap={s:LINES.close,t:0};
    }else if(!o.near&&(o.t==='m'||o.t==='fork')&&Math.abs(o.y-PLAYER_Y)<26&&Math.abs(lane-o.l)>0.55&&Math.abs(lane-o.l)<1.05){
      o.near=1;
      if(nearCd<=0){
        nearCd=1.4;score+=5;
        fx.push({x:lx(lane),y:PLAYER_Y-20,t:0,life:1,txt:'+5',col:'#fff',tick:1});
      }
    }
  }
  objs=objs.filter(o=>!o.d&&o.y<H+60);
}

function drawRoad(){
  ctx.fillStyle='#3a3f47';ctx.fillRect(ROAD_LEFT,0,ROAD_WIDTH,H);
  const dashH=42*S,gapH=28*S,totalD=dashH+gapH,offY=scrollY%totalD;
  ctx.fillStyle='#c5c8cc';
  for(let l=1;l<=2;l++){
    const lineX=ROAD_LEFT+l*LANE_WIDTH-2.7*S;
    for(let y=-totalD+offY;y<H+totalD;y+=totalD)ctx.fillRect(lineX,y,5.4*S,dashH);
  }
}

function drawObj(o){
  const x=lx(o.l),y=o.y;
  const hazard=o.t==='m'||o.t==='fork';
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
  const bob=Math.sin(clock*6+o.id)*3*S,sz=o.t==='fork'?44:(o.t==='roast'?46:(hazard?52:63*S));
  const pic=o.t==='m'&&imgMush.ready?imgMush:(o.t==='fork'&&imgFork.ready?imgFork:(o.t==='roast'&&imgRoast.ready?imgRoast:SP[o.t]));
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

function drawIntroAvatar(dt){
  introCtx.clearRect(0,0,180,180);introCtx.fillStyle='#111';
  introCtx.beginPath();introCtx.arc(90,90,90,0,Math.PI*2);introCtx.fill();
  introAnimTimer+=dt;
  let isOpen=isTalkingAudio();
  if(!garyAudio.paused)isOpen=Math.floor(introAnimTimer/.35)%2===1;
  const img=getActiveImage(isOpen);
  if(img){
    const ar=img.naturalWidth/img.naturalHeight;let h=175,w=h*ar;
    if(w>175){w=175;h=w/ar;}
    introCtx.drawImage(img,90-w/2,90-h/2,w,h);
  }else{introCtx.save();introCtx.translate(90,90);fbFace(introCtx,60);introCtx.restore();}
  introCtx.lineWidth=6;introCtx.strokeStyle='#ffe600';introCtx.beginPath();introCtx.arc(90,90,86,0,Math.PI*2);introCtx.stroke();
}

function drawPlayer(dt){
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
    runTimer+=dt;
    if(runTimer>0.22){runTimer=0;runFrame=runFrame===0?1:0;}
    imgToDraw=imgRun[runFrame].ready?imgRun[runFrame]:(imgRun[0].ready?imgRun[0]:null);
  }
  const h=142;
  const step = runFrame===1 && !isCrashing && grinTimer<=0 ? -3 : 0;
  if(imgToDraw){
    const ar=imgToDraw.naturalWidth/imgToDraw.naturalHeight;
    const w=h*ar;
    ctx.drawImage(imgToDraw,-w/2,-h+6+step,w,h);
  }else fbFace(ctx,36*S);
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
  loadErrorLog.forEach((err,i)=>ctx.fillText('⚠️ ERROR: '+err,10,6+i*22));
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

function drawBubble(){
  const px=lx(lane);
  if(state==='over')return;
  const line=lastHit==='fork'?"Plastic fork.":"Mushrooms. No.";
  ctx.save();
  ctx.font='700 13px Arial,sans-serif';
  const w=ctx.measureText(line).width+16;
  const x=Math.max(8,Math.min(W-w-8,px-w/2));
  const y=PLAYER_Y-124;
  ctx.fillStyle='rgba(12,14,18,.92)';
  rr(ctx,x,y,w,24,6);ctx.fill();
  ctx.fillStyle='#f4f1ea';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(line,x+w/2,y+12);
  ctx.restore();
}

function drawStreetLight(){
  if (!lampGlows.length) return;
  const flick=.92+Math.sin(clock*7)*.04+Math.sin(clock*3.1)*.03;
  ctx.save();
  ctx.globalCompositeOperation='lighter';
  ctx.beginPath();
  ctx.rect(ROAD_LEFT, 0, ROAD_WIDTH, H);
  ctx.clip();
  for (const cy of lampGlows) {
    const grad=ctx.createRadialGradient(W/2,cy,0,W/2,cy,70);
    grad.addColorStop(0,'rgba(255,180,90,'+(.05*flick)+')');
    grad.addColorStop(1,'rgba(255,180,90,0)');
    ctx.fillStyle=grad;
    ctx.fillRect(ROAD_LEFT, cy-40, ROAD_WIDTH, 80);
  }
  lampGlows.length = 0;
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

function render(dt){
  if(state==='intro')drawIntroAvatar(dt);
  ctx.setTransform(K,0,0,K,0,0);ctx.save();
  drawHighStreet();drawPavements();drawRoad();drawStreetLight();

  if(state!=='menu'&&state!=='intro'){
    for(let i=objs.length-1;i>=0;i--)drawObj(objs[i]);
    drawPlayer(dt);
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
  ctx.restore();drawVignette();

  if(state!=='menu'&&state!=='intro'){
    drawHud();drawCap();
    if(state.startsWith('crash')){
      if(state.startsWith('crash')){ctx.fillStyle='rgba(255,40,40,'+Math.max(0,.45-crashT)+')';ctx.fillRect(0,0,W,H);}

    }
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

$('startBtn').addEventListener('click',e=>{
  e.currentTarget.blur();initAudio();$('menu').classList.remove('show');state='intro';introAnimTimer=0;
  $('introOverlay').classList.add('show');
  if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume();
  garyAudio.currentTime=0;
  const playPromise=garyAudio.play();
  if(playPromise!==undefined){
    playPromise.catch(err=>{
      console.warn('Autoplay blocked or audio missing:',err);
      setTimeout(()=>{if(state==='intro')startGameplay();},2500);
    });
  }
  garyAudio.onended=()=>startGameplay();
});

$('skipIntroBtn').addEventListener('click',startGameplay);

$('againBtn').addEventListener('click',e=>{
  e.currentTarget.blur();$('over').classList.remove('show');reset();state='menu';$('menu').classList.add('show');
});

function resize(){
  const w=stage.clientWidth,dpr=Math.min(window.devicePixelRatio||1,2.5);
  cv.width=Math.round(w*dpr);cv.height=Math.round(w*16/9*dpr);K=cv.width/W;
  ctx.imageSmoothingQuality='high';
}

let last=performance.now();
function loop(ts){
  const dt=Math.max(0,Math.min(.05,(ts-last)/1000));last=ts;
  update(dt);render(dt);requestAnimationFrame(loop);
}

addEventListener('resize',resize);
resize();
requestAnimationFrame(loop);
})();
