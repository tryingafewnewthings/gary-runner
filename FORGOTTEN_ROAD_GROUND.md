<!-- GARY_EATS_REFERENCE_20261019_START -->
19 October 2026 — interaction / render contract
V4 decay remains a 30-active-second, pre-baked atlas transition with near-total side-cobble occlusion before the hooded reader. Current game uses 60-unit cobble source quadrant sampling, not a new tile set. Decay must not begin on initial Play, block the road, render giant 512px sprites, create canvases when the event starts or displace buildings. Shop closures should finish first; later emptying of off-screen segments and cutscene/fox event eligibility must not be broken by decoder/rain gates. Service-charge barrier should appear only after closure/decay readiness and remains a separate fair wide obstacle.
Check latest index.html -> gary-difficulty-runtime.js and gary-road-evolution.js for actual stage gating. Phone testing of the first transition spike and bench arrival is still unverified by synthetic source checks alone. Bridge/underpass/wilderness art and terrain are future work, not part of V4. New assets and ground-overlay revisions must pass ASSET_QUALITY_GATE.md plus visual review.
<!-- GARY_EATS_REFERENCE_20261019_END -->

# Forgotten Road ground — V4 performance and coverage repair
17 October 2026. Replaces the installed V3 overlay renderer.

## Player-facing behaviour
The original high street starts without new decay. Settled night starts the existing 30-active-second progression. Light moss develops gradually, then the final approach becomes a dense soil/matted vegetation layer. Late ground obscures almost all cobbles with a few irregular gaps. All lane centres stay clear; roadside art reaches at most 12px onto the road. The original 60px cobble textures are unchanged beneath the layer.

Mature appearance is established by 25.5 seconds of progression, before the hooded bench enters under the normal encounter gates. The remaining time sustains this appearance. Stranger scheduling still waits for 24 seconds, heavy rain, closed shutters and decoded bench art. Pause/crash freeze progression; restart clears story state without rebuilding texture caches.

This is ground deterioration for the abandoned street. A complete wasteland biome, ruined shop replacements, underpass, dialogue and wilderness remain separate work.

## Why V3 could hitch
V3 repeatedly scaled 512px PNGs down to small stamps, blended overlapping sprites and rebuilt clip/transform work during rendering. Its decay PNGs also bypassed the runtime's startup artwork decode gate, so first use could incur decoding/upload work during play. These are confirmed code-path costs; the precise device-specific cause of a reported iPhone hitch is not proven without on-device profiling.

## V4 rendering contract
- Decay images join the same retry/timeout/decode gate as the other startup artwork.
- Before Play becomes available, prepare ten immutable canvases: five stages per side, 117x512 design pixels, at DPR capped at 2. About 9.6 MB maximum atlas pixel storage, independent of run length.
- Yield between startup builds; warm the atlases on the actual game context before enabling Play. No decay baking, image decoding or new canvas creation when the transition begins or stages change.
- Gameplay draws cached 128px strips. A 512px vertically wrapped pattern, fixed world registration and sampling of the existing bounded distance/time history preserve ground position. Later terrain does not mutate previously passed terrain.
- Ground is drawn beneath shops/props, and across narrow pavement strips. The separate disjoint kerb pass is preserved. Right-side orientation is baked at startup.
- The dense late layer uses the approved small artwork (32–44px stamps) over soil/matted vegetation, with small irregular gaps. It does not enlarge the underlying stones.
- Forced stages require both debug=1 and roadstage=N. Historical roadstage-only links play the normal story.

## Validation
24 automated checks pass: fixed clock/contact/pool tests; artwork preparation; natural clean opening and 30-second progress; pause/reset; bench animation; mature coverage before first bench entry; world scroll registration; road-edge limits; bounded immutable atlas count and per-frame blits; render purity for narrative state.

Native Canvas comparison over 200 mature frames at 360x640 (including pixel readback): V3 averaged 248.08 decay image draws/frame and 4.62ms/frame; V4 averaged 24 draws/frame and 2.13ms/frame. This is approximately 90% fewer decay draw calls. These are same-environment synthetic renderer measurements, not iPhone frame-rate claims or whole-engine timings.

At maturity, 97.3% of sampled cobble-side pixels have overlay opacity at least 95%. The actual-engine integration also requires over 95% of the cobbled side to have at least 90% occlusion before the bench first enters the screen. Ground screenshots at normal gameplay scale were inspected.

`node --test tests/core.test.cjs tests/mystery.test.cjs tests/road-decay.test.cjs tests/last-orders-integration.test.cjs`
Requires jsdom and @napi-rs/canvas. Test runs clear hazards to exercise later narrative, not to prove survival balance. Physical iPhone Safari frame pacing and first transition still require acceptance testing; browser binary download was unavailable in this environment.

## Installation and rollback
Use gary-decay-v4-performance-installer.html. It validates all affected file SHAs against the audited installed V3 baseline, then publishes one atomic commit. It refuses to overwrite newer changes and checks the branch head again before promotion. The previous V3 installer is retired in the same commit. No art sources, published shop JSON, actor scale, collision, score or controls change. Revert the V4 installation commit to recover V3, preserving independent later changes.


## Subtle asphalt wear and tiny rain puddles (24 October 2026; candidate)

The 30-second settled-night depth history and all original roadside-cobble art remain intact. Two pre-baked 150x512 transparent road atlases add faint cracks, small repair marks, fine grain, lightly chipped lane paint and still puddles (about 8–17 by 2–5 logical pixels each). Puddles are limited to road edges and emerge with significant rainfall (rainMix above 0.22). World-distance anchoring means visible patches do not pop into being under Gary; the existing asphalt and white lane markers remain recognizable. No changes to lane geometry, collision, bridge art, events, scoring or player controls. Render the new road pass after existing lane markings and before narrow edge vegetation. Both atlases build and warm before Play with no new image files or draw-time canvas allocation. New QA verifies low contrast, placement, wetness threshold, fixed-world scrolling and bounded blits. Physical iPhone and artistic sign-off remain unverified.
