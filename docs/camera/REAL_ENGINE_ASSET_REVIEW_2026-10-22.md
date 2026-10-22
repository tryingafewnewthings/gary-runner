# Asset Factory — isolated real-engine render-pass review

22 October 2026. **Implemented on draft PR #10 only; not published or approved for production until CI, visual sign-off and iPhone QA.**

## What it adds

The browser factory already provides exact mask geometry, source-dimension/alpha checks, a 360×640 screenshot comparison, and candidate JSON with `approved:false` and `registered:false`. This extension additionally inserts a **candidate masked PNG or a silhouette blockout into the ACTUAL rendering passes of the existing active `gary-difficulty-runtime.js`**, rather than just a canvas overlay over the game.

The real-engine candidate controller is **only exposed on `?debug=1&bridgepreview=1`**. The normal game has no access to `window.GaryAssetPreview`; that code cannot spawn items, update physics, change lane widths, change saves or register gameplay assets. The candidate is held in ephemeral memory in an isolated same-origin iframe. Switching template/scene/layer reuses existing game image assets; candidate mask compositing occurs **on selection**, not during gameplay frames. Only `ctx.drawImage` is performed in the selected game render pass.

## Actual passes and usage

| Pass | Exact draw ordering | Suitable candidates |
| --- | --- | --- |
| `under-water` | After existing bridge masonry, before existing water-occlusion mask | Bridge piers/foundation art that must disappear beneath water |
| `deck` | After existing bridge deck but before items, Gary and foreground walls | Independent crossing surface or deck decoration |
| `ground` | After active bridge/world/wilderness ground; before rear scenery and actors | Ground decal, moss, tile/terrain surface for in-engine QA |
| `rear` | After rear wilderness scenery, before items and Gary | Shops, vertical roadside props and world-object silhouettes |
| `front` | After Gary, front wilderness props and bridge parapets but before rain/weather/UI | Intended foreground obstructions/parapet-top or canopy review |

**Important:** `front` genuinely draws over Gary while `rear` draws behind him. `under-water` and `deck` are **bridge-only**; changing to a street/wilderness scene won't show them because bridge-specific passes aren't active there. A ground or rear asset should not be tested in a bridge-only pass by accident.

## Repeatable iPhone Safari procedure (after deploy)

1. Open `gary-asset-factory.html` from approved Pages build. Import the **locally stored, rectified 360×640 original first-biome screenshot** under *Scene reference* (not the full 1320×2382 phone JPEG). That screenshot is the visual **style** master, not a solved 3D projection.
2. Choose one of the four fixed geometry templates and export its true-transparent silhouette. Generate matching source PNG using ChatGPT, preserving the untrimmed source size, camera family and ground anchor.
3. Import generated PNG and require `STRUCTURAL PASS`. Incorrect/unregistered art can still be displayed as a **geometry blockout**, never as accepted painted art.
4. Choose `Gameplay view` (high street day/night, bridge approach/enter/middle/exit, wilderness reveal/dense) and `Renderer layer`. Adjust `Screen/world X/Y` as needed; these change **candidate preview placement only**, not collision and not the fixed road camera.
5. Click **Real engine (bridge debug)**. The isolated active game loads, begins the named preset and freezes; candidate pixels are inserted into the actual pass. Press *Play engine* to inspect world-anchored scrolling, then *Freeze engine*. Toggle rear/front as appropriate to check Gary occlusion. For bridge foundations, compare `under-water` versus `front`.
6. Export annotated preview and JSON. Confirm `approved:false`, `registered:false`, `actualRenderPassPreview:true`; include source/draw size, anchor, pass, view preset and current world-scrolling setting in a handoff.
7. Review **day/night/heavy rain**, scroll motion, edges on light/dark backgrounds, food/hazard visibility, first/last sprite frames, foot contact, proportion and Safari frame pacing before declaring an asset ready.
8. Only after explicit user/artist approval, register asset in `asset-quality-manifest.json` and actual runtime data/placement; run `npm test` and physical iPhone acceptance and preserve rollback.

## Known limitations

- This is a **single-candidate preview fixture**, not an automatic biome pack importer, not a replacement for texture painting and not a collision preview. The current four templates are candidates, not a complete biome schema.
- World anchoring uses the actual `view.distance` captured at candidate insertion, so vertical scrolling follows gameplay correctly. Screen-fixed review is separately selectable. Ground registration is exact in design units, but true architecture perspective still remains **PROVISIONAL_NEEDS_VISUAL_APPROVAL**.
- `rear` is an actual behind-actor pass, but complex geometry may need independent face sprites and multiple passes. An external photo flattened into one image cannot reconstruct occluded roof/under-arch pixels.
- The review screenshot source remains local and **is not committed** to GitHub by this draft. `docs/bridge/approach.png` is not an approved first-biome reference.
- Debug session is opt-in and does not count as full device or production verification. Browser regression can verify real canvas output, pass ordering, preset selection and export truthfulness, not painterly quality or sustained Safari thermal performance.

## Regression checklist

Run `npm run test:factory`, `node tests/asset-factory-browser.cjs`, `GARY_TEST_ENGINE=webkit node tests/asset-factory-browser.cjs`, `npm test`, and `node tests/asset-quality-gate.cjs --all`. CI should additionally exercise active engine smoke, bridge/wilderness progression, reader/fox/roast, pause/reset, saves and 120Hz simulation. Compare actual browser output **with versus without** debug candidate pixels. If a build fails or the candidate appears outside its intended layer, do not merge.

In normal Play `index.html` loads the same authoritative engine, but `GaryAssetPreview` does **not** exist without `debug=1&bridgepreview=1` and should incur no visual or allocation overhead.
