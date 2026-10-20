# Forgotten Bridge — registered artwork handoff

**Framework provisionally accepted; raised masonry and final illustration remain NOT APPROVED.** PR #5 remains stacked on bridge PR #4. Neither main nor either PR is merged by this work. The attached JPEG informs only reddish masonry, pale caps, broad slabs and repeated exterior arches. It is not imported, cut out or used as a camera reference. No material artwork has been generated.

## Review in Camera Lab

Serve this checkout (`python3 -m http.server 8000`) and open `gary-camera-lab.html` (use the computer's LAN address on iPhone). Select **Real game**, then **Registered artwork blockout** or **Test registered PNG layers**. The latter decodes the three actual template files, validates their dimensions and composes them through the same replacement masks. Entry/Middle/Exit, play/freeze, guides, support height, parapet height, height projection and candidate JSON export all use the existing engine. Sliders update preview geometry only; the published camera contract stays provisional and unchanged. Slider input is debounced to avoid rebuilding caches every animation frame.

Normal Play and the original bridge preview keep the existing PR #4 renderer. Candidate artwork is accepted only in the isolated `debug=1&bridgepreview=1` session. A failed pack leaves the previous renderer intact. A switch back to the legacy renderer is immediate. There is no change to the 60 Hz update loop, encounters, centre guidance, score, collisions, saves, lane centres or collapse gate.

### Actual 360×640 candidate captures

These were generated through Camera Lab's **real-engine** iframe, not the geometry overlay or a standalone scene. Opened and inspected: entry shows the near supports descending beneath the deck; middle shows repeated recesses, deep piers and submerged bases; exit shows Gary on the widening path and the remaining end supports. Flat colours and hard edges deliberately identify a geometric blockout. The existing captures in `docs/bridge/` are the before comparison.

| Entry, near=560 | Middle, near=850 | Exit, near=1210 |
| --- | --- | --- |
| ![Entry blockout](docs/bridge-art/enter.png) | ![Middle blockout](docs/bridge-art/middle.png) | ![Exit blockout](docs/bridge-art/exit.png) |

[Exported Camera Lab candidate](docs/bridge-art/camera-candidate.json) · [Authoring pack](gary-bridge-art-contract.json) · [Actual alpha/bounds/hash report](art/bridge/templates/registration-report.json)

The revised **connected-arcade-v2 candidate**, not a recommendation for approval, uses the existing provisional height factor 0.80, an 80-unit support descent (64 screen units), and a 14-unit parapet height (11.2 screen units). Deck and actors remain on the original screen plane. Raising Gary or changing collision/world geometry is outside this calibration. Review the side-face convention, entrance/exit massing, arch rhythm and waterline in motion before locking any silhouette. The angular banks, simple slab outlines, abutment returns and caps are diagnostic geometry rather than art acceptance. The structural side-face convention is explicitly provisional: for local longitudinal coordinate u and downward depth z, left=(112−26z/64,u+z), right=(248+26z/64,u+z) at the default depth64. This is a local masonry projection only; it never transforms the road, Gary, water or world camera. The deck-to-side ledge connects these exterior elevations to the unchanged x138/222 deck edges so that arch crowns remain visible outside the parapets.

## Exact artist specification

All three structural files are **720×2000 RGBA PNG**, one untrimmed cell, 2 source pixels per design unit, true transparent background. Each draws at **360×1000 design units**, at **x=0, y=bridgeNear−800**. Common source anchor **(360,1600)** maps to design anchor **(180,bridgeNear)**. Far deck edge: source y360 / design y180; near deck edge: source y1600 / design y800. Do not trim, rescale individual layers, rotate, change the camera, or move this anchor. Main gameplay remains 360×640, deck x138..222 (84), bridge length620; approaches x105..255 (150), lanes130/180/230.

| Order | Pass / source | Exact destination and anchor | Content and exclusions |
| --- | --- | --- | --- |
| 1 | Terrain/stream/banks — existing engine environment and independent blockout bank cache | Existing world distance; all local bridge masks use the common anchor above | Water, vegetation, rocks, ground and bank shapes belong ONLY here. The normal legacy environment stays separate. |
| 2 | [lower.png](art/bridge/templates/lower.png) | 360×1000 at (0,near−800); source anchor (360,1600) | Connected side elevations have top edges x112/248 and base edges x86/274 at depth64. Three arch spans u236..384,416..564,596..744 are genuine transparent openings; each has an 8-unit inset soffit band and a continuous upper spandrel/string course. Supports occupy u180..236,384..416,564..596,744..800 and end in battered plinths and pointed cutwaters. Near/far abutment returns flare 44 units along the approach, without changing the 620-unit deck. Flat face colours are geometry guides only. |
| 2b | [water-occlusion-mask.png](art/bridge/templates/water-occlusion-mask.png) — ENVIRONMENT ONLY | Same 720×2000 source / 360×1000 draw and anchor | Eight cached depth bands follow each submerged sloping plinth from z51..75 at default depth64. The two interior supports (u384..416 and564..596) have separate masks on both sides, not rectangular wipes through the arch voids. Independent stream-colour overlap and small horizontal contact ripples embed the cutwater bases. Never include this water in the masonry image. |
| 3 | [deck.png](art/bridge/templates/deck.png) | Same registration | x138..222 y180..800; broad 52-unit slab guide intervals. 150-unit-long taper at each end returns to x105..255. The untrimmed source extends through the approach/exit to y0/1000. Paving only, no characters, water or vegetation. |
| 4 | Existing gameplay actors/items | Original engine foot anchors; Gary y546 | No new sprite, projection, apparent scale or collision proxy. |
| 5 | [foreground.png](art/bridge/templates/foreground.png) | Same registration | Raised parapets on original x117/x223 footprints, top/side coping and end posts. Current candidate projects 14×.8=11.2 units upward. Keep the playable centre clear. No rocks, grass, water, floor or background. |

The template alpha channels ARE the candidate geometry masks. After geometry approval, an artist paints inside these registered layers; replace each independently through `GaryBridgeArt.loadImages(pack, Image)` and `create({makeCanvas,pack,images,environment})`. `images` accepts `lower`, `deck`, and/or `foreground`; omitted layers retain blockout geometry. The engine API `GaryBridgePreview.artwork(pack, images)` is intentionally preview-only. Each supplied image is decoded, checked for exact size and composited once with `source-in` against its geometry mask. This prevents a full opaque background or shifted canvas from replacing the world footprint. Alpha/registration checks do not detect painted trees or photographic content inside an allowed mask: artistic review remains mandatory.

Five fixed 720×2000 caches are prepared on pack selection: three structure layers, independent bank cache and water mask (about 27.5 MiB RGBA). Existing legacy caches are reused as the environment provider. Draw calls use the common anchor, never distance scaling. No image decoding, pixel scans, template construction or canvas allocations occur in active per-frame rendering. At most four contact ripple curves animate using the engine clock. Masks are NOT automatically promoted as production assets; candidate approval flags are required to remain false. A future reviewed promotion must explicitly update approval policy and bind the human-approved geometry/art, not bypass it by renaming these templates.

## Reproduce and validate

- `node tools/export-bridge-templates.cjs` deterministically exports geometric templates, separate water mask, candidate registration and measured alpha report. It creates no illustration. Register newly painted replacements separately in `asset-quality-manifest.json` and retain exact source sizes/anchors.
- `npm test`: complete existing tests plus eight pipeline regressions and the Camera Lab registered-art browser check. Existing camera contract tests still enforce the unchanged PR #4 dimensions/profile status. Pipeline regressions cover alpha/registration, mask clipping and independent replacement, bad-pack rejection, allocation bounds, submerged water overlap, active engine layer order, opt-in isolation, pause/reset and crossing progression, connected spandrels, true arch openings and soffit thickness, and base/occlusion registration through seven scroll positions. The actual browser also checks water-coloured bases over six consecutive live scrolling samples and verifies freeze afterward. Projection slider limits are also checked to keep the water mask outside the actor corridor.
- Browser captures: `node tests/bridge-art-browser.cjs` (also runs in npm browser checks and Chromium/WebKit CI); artifacts in ignored `test-results/bridge-art-<engine>/`. Asset gate checks all templates and committed screenshots.

| Assessment | Status / evidence | Remaining action |
| --- | --- | --- |
| Dimensions, registration, pass order, true alpha | PASS in executable tests and measured report | Revalidate every professional replacement and changed camera mask |
| 360×640 depth, occlusion and Gary position | Visually inspected three engine captures; candidate, NOT APPROVED | User chooses/adjusts the projection, arch silhouette, supports and caps in Camera Lab |
| Illustration | NOT PRODUCED / NOT APPROVED | After geometry sign-off: professional reddish brick/soffit material, pale stone caps and paving, with matching upper-left light; no environmental bake-in |
| Physical iPhone Safari and performance | UNVERIFIED-ON-DEVICE | Inspect first pack load, memory/frame pacing, waterline motion, scrolling and export on phone |

No camera projection, geometry or artwork is approved by these tests or this implementation. To roll back this preparation, revert its commit on PR #5; PR #4's playable default bridge remains separate.

## Structural refinement review

The rectangular overlay piers were removed. One affine side elevation now joins each set of arch crowns to its piers; opening interiors are genuinely transparent, with a separate dark soffit band and a restrained edge value to expose thickness. Foundation silhouettes continue from the same side-face map and taper into cutwaters. Water overlap is an environment-only mask following those foundation edges; no water, banks, rain, grass or rocks were added to the three structural images. The deck and foreground PNGs remain byte-for-byte unchanged from the prior preparation. Entry/middle/exit captures were reopened and inspected after the revision. At exit the stream has naturally scrolled below the camera; the far abutment returns remain visible at the bottom edge. Final paint and raised-geometry approval remain pending.

## External PNG delivery — engineering handoff

The engineering interface is ready for external PNGs. No additional artwork is produced by this handoff. Raised masonry and final illustration still require visual approval; the fixed source sizes and world registration below are the import contract, not a camera/art approval.

Deliver **three separate, untrimmed, true-alpha RGBA PNGs**, each **720×2000 pixels**, one cell with no animation or atlas. Use these production destinations when the supplied files are imported:

| Renderer key | External PNG destination | Existing geometry/alpha reference — preserve this file | Paint content only |
| --- | --- | --- | --- |
| `lower` | `art/bridge/production/lower.png` | `art/bridge/templates/lower.png` | Reddish lower masonry, connected spans, arch soffits, piers, foundations and abutments; opening interiors stay transparent |
| `deck` | `art/bridge/production/deck.png` | `art/bridge/templates/deck.png` | Broad stone deck slabs and the registered entrance/exit paving |
| `foreground` | `art/bridge/production/foreground.png` | `art/bridge/templates/foreground.png` | Raised parapet faces, pale coping stones and foreground end posts |

The production PNGs are **not supplied, registered in the executable asset manifest, or activated yet**. Do not replace files under `templates/`: regression tests compare those files with the generated geometry masks. Keep `art/bridge/templates/water-occlusion-mask.png` independent and unchanged during the art import.

All three images share source anchor **(360,1600)** and scale **2 source px : 1 design unit**. Their complete 720×2000 canvas draws at **360×1000**, origin **(0, bridgeNear−800)**, placing the anchor at **(180,bridgeNear)**. The central deck rectangle has source coordinate edges **x276..444, y360..1600** → design **x138..222, y180..800**: **84×620 units**. Approaches/exit retain 150-unit width. Preserve the full canvas, alpha silhouette, openings, registration, camera and scale; do not crop to the masonry or to the 84-unit deck. The source bounds and alpha/hash report remain in `art/bridge/templates/registration-report.json`. Match the actual engine captures and supplied masks; do not infer a new camera from the reference JPEG.

Do not include water, reflections, stream foam, banks, vegetation, rocks, sky, ground outside the registered paving, rain, HUD, Gary or other actors in these structural PNGs. No white background, checkerboard background, baked night filter, artificial zoom or vanishing-point distortion. Material paint must fit the reviewed masks; runtime clipping is not a substitute for accurate alpha and registration.

### Registration when the PNGs arrive

1. Keep the three mask/template PNGs and the independent water mask unchanged. Place supplied artwork at the three `production/` destinations above. Those files are deliberately absent until provided.
2. Copy the current `gary-bridge-art-contract.json` for the external preview pack. Preserve `schema`, `registration`, every candidate geometry field, dimensions/anchors and `approved:false`. Change only `layers.lower.path`, `layers.deck.path`, and `layers.foreground.path` to the corresponding production destinations. The existing default pack continues to reference blockouts until a reviewed integration changes it.
3. Add these exact entries to `asset-quality-manifest.json` **when the files exist** (not before):

```json
"art/bridge/production/lower.png": { "width": 720, "height": 2000, "alpha": true },
"art/bridge/production/deck.png": { "width": 720, "height": 2000, "alpha": true },
"art/bridge/production/foreground.png": { "width": 720, "height": 2000, "alpha": true }
```

4. Decode the supplied pack with `GaryBridgeArt.loadImages(pack, Image)`; pass the returned `images` to the actual engine's `GaryBridgePreview.artwork(pack, images)` in the isolated Camera Lab iframe. This interface already accepts independent layers, checks dimensions and composites them once against the registered geometry masks. The PNG import does not require camera, deck, timing, collision, scrolling or gameplay changes.
5. Run the unchanged complete regression suite and asset gate, inspect entry/middle/exit and moving waterlines, then obtain final visual approval before any production activation or merge. Both PRs remain unmerged until separately authorised.
