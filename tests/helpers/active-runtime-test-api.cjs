'use strict';

// Injected only into an in-memory copy of gary-difficulty-runtime.js by the
// headless/browser harnesses. The published engine file is never modified.
module.exports = function instrumentActiveRuntime(source) {
  const end = /\n\}\)\(\);\s*$/.exec(source);
  if (!end || source.indexOf(end[0]) !== source.lastIndexOf(end[0])) {
    throw new Error('Could not locate the active runtime IIFE boundary');
  }
  const offset = end.index;
  const testApi = `
  window.__test = Object.freeze({
    ready: () => startupReady,
    bridge: () => bridge.snapshot(),
    wilderness: () => wilderness.snapshot(),
    bridgeArtwork: () => ({status:bridgeArtStatus,mode:bridgePaint===legacyBridgePaint?'legacy':bridgePaint.mode}),
    rustle: outcome => wildernessEncounters.preview(outcome,distance),
    advance: fixedUpdate,
    render: () => { prepareView(1); render(); },
    reset, move, suspend, resume, transition,
    clear: () => itemPool.clear(),
    clearOrdinary: () => itemPool.retain(item => !!item.foxEvent),
    add: (kind, laneIndex = 1, y = PLAYER_Y) => {
      const item = itemPool.acquire();
      if (!item) throw new Error('Active runtime item pool exhausted');
      Object.assign(item, {t:kind,l:laneIndex,y,previousY:y,id:uid++,patternId:'test',
        d:0,dare:0,refused:0,near:0,cleared:0,foxEvent:0});
      return item;
    },
    pickup: (kind, laneIndex = 1, y = PLAYER_Y) => {
      const item = {t:kind,l:laneIndex,y,dare:0};
      collect(item);
      return score;
    },
    ending: () => {
      const firstStretch = STREET.length * STREET_SEGMENT_H;
      const at = firstStretch + 6500;
      nightMix = rainMix = shutterMix = 1;
      nightOn = true; playTime = 60; clock = 60;
      for (const shop of BUILDINGS) shopClosureStarted.set(shop.name,
        {segment:0,side:'L',time:0});
      window.GaryRoadEvolution?.reset();
      for (let i = 0; i < 24 * 60; i++)
        window.GaryRoadEvolution?.update(1/60, firstStretch + 100 + i*200/60, 1, true);
      window.GaryRoadEvolution?.recordDistance(at);
      distance = scrollY = at;
      mystery.reset(); cutscenes.reset(); fox.reset();
      itemPool.clear(); roadQueue = []; pendingRow = null;
      rememberPositions(); prepareView(1);
    },
    skipEntrance: () => {
      if (state === 'intro_transition') {
        window.GaryIntroTransition?.cancel();
        transition('play');
      }
    },
    skipDialogue: () => stage.querySelector('.gc-skip')?.click(),
    bench: () => ({foot:mystery.footAt(distance),frame:mystery.frame(),...mystery.snapshot()}),
    snapshot: () => ({state,distance,lane,target,score,speed:shownSpeed,rain:rainMix,
      mystery:mystery.snapshot(),fox:fox.snapshot(),bridge:bridge.snapshot(),wilderness:wilderness.snapshot(),cutscene:cutscenes.snapshot(),
      objects:objs.length,items:objs.filter(item=>!item.d).map(item=>({
        kind:item.t,lane:item.l,y:item.y,foxEvent:item.foxEvent,patternId:item.patternId})),
      performance:{...performance},
      shops:{closed:allShopsClosed(),entries:[...shopClosureStarted].map(([name,entry])=>({
        name,...entry,progress:closureProgress(name,entry.segment,entry.side,clock)}))},
      errors:loadErrorLog.slice()})
  });`;
  return source.slice(0, offset) + testApi + source.slice(offset);
};
