# Bridge ground handover — 24 October 2026

## Goal and approval boundary

Bridge appearance: the owner's latest accepted bridge mock-up is the VISUAL TARGET, not proof that a flattened illustration is a registered sprite. Keep the existing owner-supplied bridge image untouched in this change. This PR fixes the currently loaded bridge's transition infrastructure only.

Visual source pixels: native original high-street IMG_7141…IMG_7148 cobbles, painted first-biome high street, and the existing supplied bridge sprite. **All existing `art/wilderness/**` art is user-rejected and must never be used as a visual reference, texture source, model-conditioning reference or palette master.** No new old-wilderness sprite is promoted.

## Measured invariant geometry

- Canvas: 360×640 logical game units; stable 2D screen-aligned ground.
- Asphalt: x105–255 (150 units); bridge deck x138–222 (84 units).
- Supplied stone bridge: original source 174×620 pixels, drawn at x93 and cache y180–800.
- World-space screen transform: deck top = near − 620; near entrance = screen y `near`; far exit = screen y `near-620`.
- Stone sill remains only 26 units deep; no 150-unit cobblestone wedge or texture stretching.
- Bridge collision/one-lane lock, water motion, rope barriers, foreground draw, Gary anchor, saves, food, weather and gameplay logic are unchanged.

## Handover render order

1. Street (existing engine) while visible, or neutral underpaint when full street rendering is skipped.
2. Existing wilderness's actual game layer may render in its previous position **but cannot be used as artistic reference**.
3. Stream animation and bank substrate. Bank texture is clipped to outside x0–104 and x256–360.
4. Bridge-anchored **native original street tail**: two original-cobble clips outside the road, using the SAME bottom-water edge function; 150-unit asphalt and original road lines/kerbs, stopping at the 84-unit stone sill.
5. Unmodified supplied bridge image / 26-unit threshold, actors, foreground parapets.
6. Normal in-engine night, rain, vignette and HUD.

When the main renderer skips the expensive full street at near>=500, only the street portion that still has to be visible below the bridge entrance is redrawn. Before near=500, redraw only a 100-unit shoreline zone. This avoids a frame-dependent street disappearance and bounds work.

## Automated evidence

- `node --test tests/bridge-transition-no-wedge.test.cjs tests/bridge-ground-handover.test.cjs` confirms no stretched wedge, world bounds, road masks, road/bridge order and 500-unit seam continuity.
- `npm run test:browser` includes `tests/bridge-ground-handover-capture.cjs` and writes 15 actual native 360×640 captures PER browser: five checkpoints (approach 210, pre-handover 480, entrance 560, crossing 850, far exit 1210) × day/night/rain. Captures and a JSON report appear in `test-results/bridge-ground-handover/{chromium,webkit}/`.
- These are *technical* snapshots, never automatic visual approval. Human visual inspection should compare against first-biome originals and the accepted bridge target only. Physical iPhone Safari testing is separate.

## Explicit non-goals

- Do not reuse, approve or redesign old wilderness textures.
- Do not alter collision lanes, movement, physics or the accepted bridge identity.
- Do not declare the standalone approved bridge mock-up installed without actual source image integration and game evidence.
- Do not create another editor, installer, floating terrain texture or hidden long cobblestone ramp.

## Rollback

Single PR can be reverted if any comparison introduces a new artefact. No force pushes, asset deletions or changes to production image binaries.
