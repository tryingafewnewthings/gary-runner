/* End of the high street: a once-per-run, rain-driven environmental cameo.
 * No dialogue, reward or interaction is implemented here. Ground position is
 * distance-based; animation time advances only in visible, rainy, active play.
 */
(function (root) {
  'use strict';
  const SPEC = Object.freeze({
    id: 'hooded-reader', file: 'gary-mysterious-bench.png?v=1', columns: 4, rows: 2,
    frameWidth: 384, frameHeight: 512, height: 100, pivotX: 44,
    anchorX: Object.freeze([144.5,161.5,141.5,148.5,139.5,161,158,171]),
    anchorY: Object.freeze([504,506,506,506,506,506,506,506]),
    slowSpeed: 72, rainThreshold: 0.8,
    openingTimes: Object.freeze([0.45, 0.35, 0.4, 0.4, 0.6, 0.5]), idleTime: 0.7
  });
  function create(street, segmentHeight = 360, screenHeight = 640) {
    // Precompute plans once. Never mutate STREET or allocate plans while drawing.
    const clearing = street.map(plan => Object.freeze({...plan,
      left: 'none', leftBack:'none', leftMiddle:'none', leftFront:'none', leftObject:'none'
    }));
    const empty = street.map(plan => Object.freeze({...plan,
      left:'none', right:'none', leftBack:'none', leftMiddle:'none', leftFront:'none', leftObject:'none',
      rightBack:'none', rightMiddle:'none', rightFront:'none', rightObject:'none',
      leftGround:'cracked', rightGround:'sparse'
    }));
    let emptyFrom = Infinity, benchSegment = Infinity, time = 0, started = false, passed = false;
    function reset() { emptyFrom=benchSegment=Infinity; time=0; started=passed=false; }
    const footAt = distance => distance - benchSegment * segmentHeight + segmentHeight - 56 + 240;
    function update(dt, distance, rain, shutters, hazardsClear, ready) {
      if (!ready || passed) return;
      if (!Number.isFinite(emptyFrom) && rain >= SPEC.rainThreshold && shutters >= 0.95) {
        // Only change incoming segments whose entire building is still offscreen.
        emptyFrom = Math.ceil((distance + screenHeight) / segmentHeight) + 1;
        benchSegment = emptyFrom + 2;
      }
      if (!Number.isFinite(benchSegment)) return;
      const foot = footAt(distance);
      if (foot >= SPEC.height + 68 && foot <= screenHeight && rain >= 0.12 && hazardsClear) started=true;
      if (started && foot >= SPEC.height && foot <= screenHeight + SPEC.height && rain >= 0.12)
        time += dt;
      if (foot > screenHeight + SPEC.height + 16) passed=true;
    }
    function frame() {
      let remaining=time;
      for (let i=0;i<SPEC.openingTimes.length;i++) {
        if (remaining < SPEC.openingTimes[i]) return i;
        remaining-=SPEC.openingTimes[i];
      }
      return 6 + Math.floor((remaining + 1e-9) / SPEC.idleTime) % 2;
    }
    return Object.freeze({reset,update,frame,footAt,
      planFor(plan,index) {
        if (index < emptyFrom) return plan;
        const slot=((index%street.length)+street.length)%street.length;
        return index===emptyFrom ? clearing[slot] : empty[slot];
      },
      clearingStart:()=>emptyFrom,
      quiet:()=>Number.isFinite(emptyFrom) && !passed,
      slow(distance,hazardsClear) { return !passed && hazardsClear && footAt(distance)>=-180; },
      visible(distance) { const foot=footAt(distance); return foot>0 && foot<screenHeight+SPEC.height && !passed; },
      snapshot:()=>({emptyFrom,benchSegment,time,started,passed,frame:frame()})
    });
  }
  const api=Object.freeze({SPEC,create});
  if(typeof module==='object' && module.exports)module.exports=api;
  else root.GaryStreetMystery=api;
})(typeof window==='object'?window:globalThis);
