# Forgotten Road ground presentation — V3, 17 October 2026

## Behaviour
The original daylight high street starts clean of these overlays. Once night has settled (nightMix >= .98), decay develops over **30 seconds of active play**, as chosen by the game owner. Light moss enters first, then medium deterioration, with heavy artwork reserved for the final 12% of the transition. The existing cobble texture mixture is preserved, including its original small weeds.

The stranger may be scheduled only after 24 seconds of this transition and after the existing storm/shutter/artwork gates pass. His segment then approaches naturally, with safe slowdown after hazards clear. This aligns heavy decay with the final approach. The exact second his bench becomes visible varies with the street segment boundary and running speed; it is not a timer-driven pop-in. Dialogue, a complete barren-wasteland biome, underpass and wilderness remain future work. Moss overlays alone are not the finished wasteland environment.

## Architecture
`game-runtime.js` calls `GaryRoadEvolution.update()` from the fixed gameplay update. Rendering never starts or advances narrative progression. A bounded, preallocated map of distance to transition progress records the entering ground during those 30 seconds. Ground retains its authored appearance as it scrolls; changing running speed cannot compress the transition into a few seconds. Pause/crash do not advance it; restart clears it.

`gary-road-evolution.js` draws the existing transparent 512px PNG assets at **32–48 design pixels**, square with preserved aspect ratio. Three deterministic columns distribute small patches across each cobbled side, including the 16px pavement strips. Cobble overlays draw before buildings and street objects. A disjoint final pass covers the 3px kerbs and permits at most 12px of late encroachment onto the road. Growth is sampled per world patch; all three lane centres stay clear. Source PNGs and the 60px cobble/quadrant assembly are unchanged. No new per-frame objects, random decal positions or whole-screen texture stretching.

The kerb asset has its dense edge on the right: unmirrored on the left roadside, mirrored on the right. Building, keeper, lighting and bench calibration are unchanged by V3.

## Cause of the previous failure
The V2 installer's primary test link used `?roadstage=5`, forcing heavy overgrowth immediately. V2 also excluded x=89–105 and x=255–271 from the cobble pass, centred 70–118px overlays over the road edge, and used only a 1,400px approach. V3 removes render-time story mutation, restores cobble coverage, reduces decal scale and gives the transition a deliberate 30-second progression.

The previous installer is retired so its embedded V2 source cannot overwrite this repair. Open the main game directly; no new installation or token is needed.

## Preview and verification
- Normal story: `index.html` with no query parameters.
- Forced artwork inspection only: `?debug=1&roadstage=0` through `?debug=1&roadstage=5`.
- Historical `?roadstage=5` links without `debug=1` now play the normal clean-opening story.
- `gary-decay-preview.html` loads the same repaired production engine as a separate smoke-test entry.

Automated checks: source parsing; original fixed-clock/pool/contact tests; mystery animation/safe slowdown; actual-engine Play/Skip, natural clean opening, night progression, pause/resume/reset; native Canvas rendering with real PNG alpha; both cobbled sides and narrow pavement coverage; road-edge bounds; scroll registration (within native raster rounding); render purity; bounded progression history. Tests clear hazards to exercise narrative progression, rather than claiming to measure natural survival balance.

Run with Node and installed `jsdom` and `@napi-rs/canvas`:
`node --test tests/core.test.cjs tests/mystery.test.cjs tests/road-decay.test.cjs tests/last-orders-integration.test.cjs`

Native Canvas and simulated DOM checks do not certify physical iPhone Safari performance, feel, or audio. Physical-device visual acceptance remains required. Rendered QA screenshots were inspected at 360x640. Browser download was unavailable in the repair environment, so no Chromium/Safari execution is claimed.

## Recovery
Revert the V3 repair commit to restore V2, including its old installer. Prefer reverting the commit to copying an old engine over newer changes. `game.js`, sprite sources, shop JSON, player controls and collision rules are not modified by this repair.
