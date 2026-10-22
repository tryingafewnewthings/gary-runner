# Gary Eats! camera and visual-production audit — 21 October 2026

**Status: review evidence only. Not a new camera contract, not artwork approval, not a gameplay change.**

Reviewed current `main` after PR #9 (baseline `688f09c4b73097a8944e1b9ff17fb6299864b856`) using `index.html`, `gary-difficulty-data.js`, `gary-bridge.js`, `gary-camera-contract.json`, `gary-camera-model.js`, `gary-asset-factory-contract.json`, `STYLE.txt`, `ASSET_GRID_PROMPT.txt`, `ASSET_QUALITY_GATE.md`, `GARY_CAMERA_SYSTEM.md`, `GARY_ASSET_FACTORY.md`, `BRIDGE_ARTWORK_PIPELINE.md`, `WILDERNESS.md` and the genuine Chromium engine captures linked below. Runtime code and physical iPhone were **not** executed in this review.

## 1. What is already deterministic

The active 2D Canvas renderer is a fixed screen-parallel, vertically scrolling world. **It has no physically measured 3D camera pitch, 3D projection matrix or vanishing point.** Therefore no algorithm can recover a unique physical raised-object angle from the world constants alone.

| Property | Measured from active source | Authoring implication |
| --- | --- | --- |
| Logical canvas | 360 × 640 | All placement and snapshots use design pixels, independent of phone DPR |
| Road | x105..255, 150 wide | Straight, parallel edges; no perspective taper |
| Lanes | x130 / 180 / 230 | 50 units per lane, fixed horizontally |
| Gary reference | y540; foot offset +6; target height142 | Ground contact at y546 |
| Street shop | 89 × 236 destination | Preserve individual approved source crop and shop anchors |
| Cobbles | 60-unit destination cell, one texture quadrant per cell | Ground texture perspective must stay screen-parallel and seam-safe |
| Bridge deck | x138..222, 84 wide; length620 | Preserve one safe centre deck; no 3-lane painted deck |
| Bridge architecture | two support strips, independent deck, stream/terrain, actor and foreground parapet passes | No baked water/vegetation in masonry artwork |
| Candidate raised projection | height axis [0, −0.8]; sample face depth12 | **Provisional, not a physical measurement, not production-approved** |

The ground-plane profile is **CODE_LOCKED**, while the raised-architecture profile is **PROVISIONAL_NEEDS_VISUAL_APPROVAL**. Retain those statuses and existing geometry tests until reviewed and approved across multiple representative assets.

## 2. Reviewed real-engine captures

**Existing geometry, procedural bridge**

![Entering existing bridge](../bridge/enter.png)
![Middle of existing bridge](../bridge/middle.png)

**Supplied painted bridge review candidate, not approved**

![Painted bridge candidate in actual renderer](../bridge-review/middle.png)

**DRAFT01 wilderness, user-rejected art direction**

![Wilderness first reveal](../wilderness/reveal.png)
![Dense wilderness](../wilderness/dense.png)

These images are actually generated engine captures, not unplaced isolated sprites. The painted bridge changes the illustrated depth/mass of piers, parapets and paving compared with the procedural version, and requires art sign-off; a rendered 84-unit deck does not imply a visually approved raised camera. The wilderness capture shows repeated vegetation-strip footprints and markedly different surface treatment; the existing `WILDERNESS.md` records this art as needing replacement. Do **not** use either the DRAFT01 wilderness or the unapproved bridge painted candidate as a universal visual-style master.

**22 October 2026 UPDATE:** the user supplied an actual first-biome high-street gameplay screenshot. See [`FIRST_BIOME_STYLE_REFERENCE_2026-10-22.md`](FIRST_BIOME_STYLE_REFERENCE_2026-10-22.md) for the approximately rectified 360×640 comparison, exact measured geometry, observed art/material reference and remaining approval gates. The binary image is exported in the ChatGPT conversation but **not in this text-only PR**. The current Asset Factory `street` preview still points at `docs/bridge/approach.png` and is not yet linked to this source. Raised-object calibration remains unapproved; night/rain and in-engine art placement remain to be verified.

## 3. Production calibration rules

1. **Ground decals/road:** project exclusively onto the fixed world XY plane; no object height, vanishing point, isometric/skew or zoom. Registration, tile seams and left/right scroll phase are independent tests.
2. **Freestanding roadside objects:** author a stable ground-contact/base anchor; align to the *approved* character/shop stylistic viewpoint. For cubic/plinth/ruined forms, separate top/front/side silhouettes when more than one physical face matters.
3. **Shops/frontages:** preserve the 89×236 destination and existing facade direction; source atlas crop and the independently calibrated keeper/clip/window/shutter geometry take precedence over generated source aspect ratios.
4. **Bridge/underpass:** maintain structural faces and stream/environment in **different render passes**: ground and water → masonry below water → water occlusion → deck → Gary/food/hazards → foreground parapets → weather/UI. Do not flatten the bridge into an image of the entire surrounding scene.
5. **Characters:** retain approved pose, asymmetry, microphone and exact foot baseline. Never use architecture height-extrusion profile to invent Gary's camera; no mirroring.
6. **Animated sheets:** exact frame/cell sizes, unchanged full cell alignment and baseline; validate full playback and first/last join, not one attractive pose.
7. **Pixel QA:** true alpha, correct exact dimensions, safe margins, no white extraction fringe, no independent sprite resizing. Run the existing registered image gate and in-engine review for each asset.

`gary-perspective-editor.html` is for *minor reversible corrections* and independent faces. It does not infer missing architecture, solve the game's non-existent 3D view matrix, nor grant artistic approval. Store an individual candidate export with the asset; never copy per-sprite corrective warps into the global world camera.

## 4. Approval gate, before future biome packs

- **G0 — fixed code geometry:** PASS if `tests/camera-contract.test.cjs` remains green; source coordinates above must match `index.html`'s active runtime and data.
- **G1 — approved style master:** BLOCKED pending original first-biome gameplay screenshot signed off as the reference. Reject visual material differences, not only dimension mismatches.
- **G2 — raised-object convention:** BLOCKED pending a comparative **street frontage + freestanding prop + bridge** review, including visible top/front/side planes where applicable, across daylight and heavy rain. An arbitrary `0.8` slider setting cannot clear this gate.
- **G3 — actual engine registration:** BLOCKED until a candidate is inserted into the named render pass with its source/draw dimensions, anchor, z-order, collision-safe footprint and scroll behavior. A Canvas overlay superimposed on the game is **not** equivalent.
- **G4 — animation and phone:** BLOCKED until full 360×640 motion, lighting/occlusion, Safari touch, cold load, stutters and pause/resume are verified on a physical iPhone.
- **G5 — final promotion:** only after G0–G4, updated `asset-quality-manifest.json`, CI and explicit art approval. Preserve old assets/runtime for rollback; do not assume artwork on `main` is approved or publicly deployed.

## 5. Next highest-impact implementation, without duplicate infrastructure

Extend **existing** `gary-asset-factory.html` rather than introducing another editor. Required minimal upgrade: choose an actual screenshot-specific background from *approved* baseline refs; insert the **candidate** art into the isolated real engine's correct render pass (ground/behind-actor/foreground) with correct scroll anchor and world draw rect; freeze/step across scene positions; show day/night/rain and layer comparisons; export a reproducible unregistered candidate package containing PNG, placement JSON, candidate approval state and 360×640 captures. Require a deliberate visual-review click before any later gameplay registration. Keep all painting/source edits in ChatGPT, not in Codex.

**Do not** trigger Codex just to paint, re-render, resize or split basic sprites. Use a single targeted technical handoff only after the first-biome master and raised-object reference convention are approved.

## Review result

**PASS (source-observed):** fixed ground geometry and distinct draw-layer architecture are specified by current code; standalone factory/editor exist on `main`.

**FAIL (visual-production readiness):** DRAFT01 wilderness rejected and not a style master; the factory lacks final in-engine render-pass integration and a real original-biome visual reference.

**UNVERIFIED:** raised-object projection's artistic correctness, source bridge art cleanup/perspective, physical iPhone quality, current Pages deployment, and a complete automatic biome import.

This report does not alter camera profiles, change live gameplay, merge rejected art, or claim final approval.
