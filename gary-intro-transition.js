/* Gary Eats! — Cinematic Intro Bridge v1
 * Optional module: if the 4-frame asset fails to load, the normal game is unaffected.
 * Must be loaded BEFORE game.js. No input, collision, scoring, spawning or settings edits.
 */
(function () {
  'use strict';

  const DURATION = 1.22;
  const SHEET_COLUMNS = 4;
  const CELL_W = 384, CELL_H = 512;
  const image = new Image();
  let ready = false;
  image.onload = function () {
    ready = image.naturalWidth === SHEET_COLUMNS * CELL_W && image.naturalHeight === CELL_H;
    if (!ready) console.warn('Gary intro sheet must be 1536 x 512. Falling back to normal start.');
  };
  image.onerror = function () { ready = false; console.warn('Gary transition art unavailable; normal start will be used.'); };
  image.src = './gary_transition_sheet.png?v=1';

  let running = false, elapsed = 0, options = null;
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const smooth = t => { t = clamp01(t); return t * t * (3 - 2 * t); };
  const mix = (a, b, p) => a + (b - a) * p;

  function begin(settings) {
    if (!ready || !settings || !settings.canvas || !settings.avatar || !settings.walkSheet || !settings.walkSheet.ready || !settings.introFrame) return false;
    const cr = settings.canvas.getBoundingClientRect();
    const ar = settings.avatar.getBoundingClientRect();
    if (cr.width < 1 || cr.height < 1 || ar.width < 1) return false;
    const x = (ar.left + ar.width / 2 - cr.left) / cr.width * settings.width;
    const y = (ar.top + ar.height / 2 - cr.top) / cr.height * settings.height;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    options = Object.assign({}, settings, {startX:x, startY:y,
      radius:Math.min(ar.width/cr.width*settings.width, ar.height/cr.height*settings.height)/2});
    elapsed = 0;
    running = true;
    return true;
  }

  function update(dt) {
    if (!running) return true;
    elapsed = Math.min(DURATION, elapsed + Math.max(0, Math.min(0.05, Number(dt) || 0)));
    if (elapsed >= DURATION) { running = false; return true; }
    return false;
  }

  function draw(ctx) {
    if (!options || !running) return;
    const o = options;
    const u = clamp01(elapsed / DURATION);
    const travel = smooth(u);
    const landingY = o.playerY - o.playerHeight / 2 + o.footOffset;
    const x = mix(o.startX, o.targetX, travel);
    const cy = mix(o.startY, landingY, travel) - 24 * Math.sin(Math.PI * u);
    const spriteH = mix(Math.max(210, o.radius * 3.0), o.playerHeight, travel);
    const frame = Math.min(3, Math.max(0, Math.floor(clamp01((u - 0.16) / 0.69) * 4)));

    ctx.save();
    // A dark portrait-space veil dissolves as the scrolling high street is revealed.
    const darkness = 0.87 * Math.pow(1 - smooth(u / 0.64), 1.4);
    if (darkness > 0.001) {
      ctx.fillStyle = 'rgba(9,12,20,' + darkness + ')';
      ctx.fillRect(0, 0, o.width, o.height);
    }

    // Preserve the actual last talking pose and its circular frame at the instant
    // speech ends. The new full-body sheet emerges as this portrait dissolves.
    const portraitOpacity = 1 - smooth((u - 0.04) / 0.22);
    if (portraitOpacity > 0.001 && o.introFrame) {
      const f = o.introFrame;
      const scale = mix(1, 0.88, smooth(u / 0.25));
      const rad = o.radius * scale;
      ctx.save();
      ctx.globalAlpha = portraitOpacity;
      ctx.fillStyle = '#111111';
      ctx.beginPath(); ctx.arc(o.startX, o.startY, rad, 0, Math.PI * 2); ctx.fill();
      ctx.clip();
      const h = rad * 1.94;
      const w = h * f.sw / f.sh;
      ctx.drawImage(f.image, f.sx, f.sy, f.sw, f.sh, o.startX-w/2, o.startY-h/2, w, h);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = portraitOpacity;
      ctx.strokeStyle = '#ffe600';ctx.lineWidth = 3 * scale;
      ctx.beginPath();ctx.arc(o.startX,o.startY,rad-2,0,Math.PI*2);ctx.stroke();
      ctx.restore();
    }

    // Crossfade full-body takeoff into rear-facing gameplay character.
    const entranceOpacity = smooth((u - 0.12) / 0.16);
    const walkMix = smooth((u - 0.82) / 0.17);
    if (entranceOpacity > 0.001 && walkMix < 0.999) {
      const w = spriteH * CELL_W / CELL_H;
      ctx.save();
      ctx.globalAlpha = entranceOpacity * (1 - walkMix);
      ctx.drawImage(image, frame * CELL_W, 0, CELL_W, CELL_H, x - w / 2, cy - spriteH / 2, w, spriteH);
      ctx.restore();
    }
    if (walkMix > 0.001 && o.walkSheet && o.walkSheet.ready) {
      const fw = o.walkSheet.naturalWidth / o.walkColumns;
      const fh = o.walkSheet.naturalHeight;
      const w = o.playerHeight * fw / fh;
      ctx.save();ctx.globalAlpha = walkMix;
      // The exact game frame, with exactly the same foot anchor as drawPlayer().
      ctx.drawImage(o.walkSheet, 0, 0, fw, fh,
        o.targetX - w / 2, o.playerY - o.playerHeight + o.footOffset, w, o.playerHeight);
      ctx.restore();
    }
    ctx.restore();
  }

  function cancel() { running = false; elapsed = 0; options = null; }
  window.GaryIntroTransition = Object.freeze({begin, update, draw, cancel,
    get ready() { return ready; }, get active() { return running; }});
})();
