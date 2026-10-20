# Gary Eats! — Camera Lab and reusable visual calibration

## Supplied artwork review — 20 October update

Camera Lab now has **Review supplied bridge artwork** in addition to the v2 geometry comparison. It loads `gary-bridge-art-review.json` and the three unchanged `art/bridge/production/*.png` files into the actual isolated game engine. The new rounded silhouette is alpha-calibrated rather than clipped by v2 masks. Painted-source projection sliders are locked; all world/deck/camera contracts remain fixed and raised architecture remains provisional. See [the integration and QA record](BRIDGE_ARTWORK_PIPELINE.md) and [four current engine views](docs/bridge-review/QA.md). Normal Play and main/Pages are not promoted by this work.

20 October 2026 · Initial system · **CODE-OBSERVED/IMPLEMENTED IN THIS BRANCH**; not deployed or artist-approved.

This branch is **stacked on PR #4** (`feat/forgotten-bridge`). The current published GitHub Pages `main` does not contain PR #4 or this lab until their changes merge. Do not open an undeployed Pages URL and assume a 404 means the files were never created.

## Open

Serve the checkout from its root with an HTTP server and navigate to `gary-camera-lab.html`. After both PRs have been merged and Pages updated, the phone URL will be:

https://tryingafewnewthings.github.io/gary-runner/gary-camera-lab.html

The lab runs without a paid service. Its "Real game" tab embeds the *actual* PR #4 `index.html?debug=1&bridgepreview=1` entry, using the bridge preview API from the real runtime. Its screenshot tab uses `docs/bridge/{approach,enter,middle,exit}.png`, the four PR #4 Chromium captures, **not artwork approved by the user**. You may also import a 360×640 screenshot locally: this file is not uploaded.

## Why this matters

The 2D Canvas gameplay camera has **no 3D view matrix**, perspective lens or ray-cast geometry. In previous asset prompts the phrase "slightly elevated oblique" allowed each image generator to invent a different set of vanishing points and visible faces. Camera Lab establishes:

1. **Fixed screen geometry** measured from `gary-difficulty-data.js`: canvas 360×640, road x105..255, lanes x130/180/230, foot reference y546, 60-unit cobbles. Its ground plane never gets extra perspective.
2. **Measured bridge overlay** from PR #4 `gary-bridge.js`: deck x138..222 (84 units), length620, two lower masonry strips x101 and x227, and two 17-unit parapets at x117 and x223. The bridge spans the screen vertically as `[near - 620, near]` and is checked against all four engine viewpoints.
3. **Separate object projection profiles:** the ground-plane reference is code-locked. The raised-architecture height projection is **only a candidate**, initially 0.80 screen px per model-height unit. Characters keep approved illustrated sprite registration; do not project characters from an unrelated cuboid profile.
4. **Explicit layered asset authoring:** terrain/water and rocks/grass, lower masonry and piers, deck, gameplay actors, foreground parapets. Material passes must preserve the geometry and never bake water into brick, nor bake grass/rocks into structural artwork.

There is no mathematically determined single "true pitch" in the present hand-painted game. The lab lets the visual director *choose* a precise, repeatable height/extrusion convention from actual screenshots, then lock it in a future reviewed commit. **An auto-PASS or a slider value alone must never be called camera approval.**

## Phone review steps

1. Select "PR screenshot" and "Enter". Compare the yellow deck, tan lower supports and coral parapets with the captured game. Adjust **Bridge position** when the capture occurred after the initial preset, because screenshot and world scrolling time can differ.
2. Compare "Approach", "Middle", and "Exit". The measured world footprint must not drift or taper. Use "Real game" to freeze the actual engine at a selected view, then "Play preview" to inspect scrolling and overlays in motion.
3. Tune only the **provisional** height projection and sample parapet height for raised objects; the lane centres and 84-unit deck are immutable. Local PNGs can be imported for direct screenshot comparison.
4. Export **overlay PNG** (image with guides) and **candidate calibration JSON**. The export explicitly sets `approved:false`. Share both with the art reviewer and record what was checked on a physical iPhone. Require a user-approved gameplay view before changing the contract status to locked.
5. Only then create/edit structural art using the approved geometry masks. Keep its 360×640 world placement and alpha registration stable. Compose separately on the engine's existing terrain, stream, supports, deck and foreground passes. Regenerate textures/materials only; do not let image generation change perspective or add a self-contained environment.

## Files and single-source policy

- `index.html` is the real runtime script map. The lab **does not inject scripts into the gameplay page** and does not alter normal game saves or collisions.
- `gary-camera-contract.json` is the **only authored camera profile and calibration document**. Its measured numerical entries are mirrors of actual engine code, not competing gameplay configuration. `tests/camera-contract.test.cjs` fails when these mirrors drift.
- `gary-camera-model.js` provides pure `validate`, `screenPoint`, `bridgeFrame`, `prism` and `draw` functions. Its shapes are previews, not runtime physics or finished illustration.
- `gary-camera-lab.html` is Safari-friendly and uses no libraries or network services beyond same-origin repository resources.
- `STYLE.txt`, `ASSET_GRID_PROMPT.txt` and `ASSET_QUALITY_GATE.md` remain authoritative for style, registration, alpha checks and artistic QA.
- The prior 48-unit cobble references are historic. `WORLD.cobbleCell=60` in active data is what the validator enforces.

## Verification / acceptance

Run `node --test tests/camera-contract.test.cjs` for this system, followed by `npm test` for the full baseline after the PR stack is checked out. The model checks code constants, projected world geometry, placement, profile approval flags and export intent. Automated visual matching and device testing are **not** implemented or claimed. Preview the four scenes, confirm local upload and export in iPhone Safari, then run the asset quality gate when real images are registered.

Status at creation: source code and PR #4 geometry **CODE-OBSERVED**; Safari playback, share/export on a physical iPhone, artistic projection, and source-to-photo error tolerance **UNVERIFIED**. Current screenshots are QA captures rather than final approved visual masters.

## Next production step once calibration is approved

Create bridge masks/silhouettes based on the locked profile, with unchanged 84-unit deck and existing traffic progression. Produce only transparent structure layers: lower masonry/piers, independent deck surface, front parapets (with caps). Do not generate the river, rocks, banks or vegetation inside the bridge structure image. Ensure the structural bases extend under water that occludes the bases; the water is an independent runtime plane. A later PR should replace procedural paint with these layered assets after asset-gate + iPhone checks.

## Registered artwork preparation (PR #5 continuation)

Camera Lab now offers an explicit unapproved structural blockout and a **Test registered PNG layers** path in its real-engine view. See [BRIDGE_ARTWORK_PIPELINE.md](BRIDGE_ARTWORK_PIPELINE.md) for three inspected captures, exact source/draw/anchor specification and alpha report. The 80-unit support descent is an adjustable review candidate, not a locked profile. Terrain/water, deeper masonry, water occlusion, deck, actors and foreground structure have separate passes. The existing bridge stays the default; normal game geometry and the camera contract are unchanged. Templates are flat geometric guides, not final art derived from the supplied JPEG. User visual sign-off still precedes any material-art production or promotion.

### Connected arcade candidate

The current opt-in blockout is `connected-arcade-v2`: continuous spandrels, three actual alpha-cut openings with visible inset soffits, battered foundations/cutwaters, and flared end abutments. Its exterior side-face top edges x112/248 and 26-unit outward depth are structural review parameters, explicitly provisional. The ground camera and original deck/foreground registration are unchanged. Updated captures, local face equations and waterline scrolling checks are documented in BRIDGE_ARTWORK_PIPELINE.md.
