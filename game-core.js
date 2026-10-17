/* Gary Eats! — small, browser-independent runtime primitives. */
(function (root) {
  'use strict';
  class FixedStepClock {
    constructor(hz = 60, maxSteps = 6) {
      this.step = 1 / hz;
      this.maxSteps = maxSteps;
      this.ticks = 0;
      this.droppedSeconds = 0;
      this.reset();
    }
    reset(now = null) { this.last = now; this.accumulator = 0; }
    frame(now, update) {
      if (!Number.isFinite(now)) return 0;
      if (this.last === null) { this.last = now; return 0; }
      const elapsed = Math.max(0, (now - this.last) / 1000);
      this.last = now;
      const budget = this.step * this.maxSteps;
      this.droppedSeconds += Math.max(0, elapsed - budget);
      this.accumulator += Math.min(elapsed, budget);
      let steps = 0;
      while (this.accumulator + 1e-10 >= this.step && steps < this.maxSteps) {
        update(this.step);
        this.accumulator = Math.max(0, this.accumulator - this.step);
        this.ticks++;
        steps++;
      }
      return Math.min(1, this.accumulator / this.step);
    }
  }

  class ObjectPool {
    constructor(capacity, factory) {
      this.capacity = capacity;
      this.active = [];
      this.free = Array.from({length: capacity}, factory);
      this.peak = 0;
      this.misses = 0;
    }
    acquire() {
      if (!this.free.length) { this.misses++; return null; }
      const object = this.free.pop();
      this.active.push(object);
      this.peak = Math.max(this.peak, this.active.length);
      return object;
    }
    // Stable compaction preserves render and collision order without filter/splice.
    retain(keep) {
      let write = 0;
      for (let read = 0; read < this.active.length; read++) {
        const object = this.active[read];
        if (keep(object)) this.active[write++] = object;
        else this.free.push(object);
      }
      this.active.length = write;
    }
    clear() {
      for (const object of this.active) this.free.push(object);
      this.active.length = 0;
    }
  }

  // Relative swept point vs an expanded ground-contact box. Both participants
  // can move in the tick; display sprites, bobbing and body lean are irrelevant.
  function sweptContact(x0, y0, x1, y1, halfWidth, halfDepth) {
    let enter = 0, exit = 1;
    const dx = x1 - x0, dy = y1 - y0;
    if (Math.abs(dx) < 1e-10) { if (Math.abs(x0) > halfWidth) return false; }
    else {
      const a = (-halfWidth - x0) / dx, b = (halfWidth - x0) / dx;
      enter = Math.max(enter, Math.min(a, b)); exit = Math.min(exit, Math.max(a, b));
    }
    if (Math.abs(dy) < 1e-10) { if (Math.abs(y0) > halfDepth) return false; }
    else {
      const a = (-halfDepth - y0) / dy, b = (halfDepth - y0) / dy;
      enter = Math.max(enter, Math.min(a, b)); exit = Math.min(exit, Math.max(a, b));
    }
    return enter <= exit;
  }
  const api = Object.freeze({FixedStepClock, ObjectPool, sweptContact,
    lerp: (a, b, t) => a + (b - a) * t});
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GaryCore = api;
})(typeof window === 'object' ? window : globalThis);
