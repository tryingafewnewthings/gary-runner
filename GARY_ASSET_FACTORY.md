22 OCT 2026 — Automatic game-scale QA: `node tools/capture-asset-previews.cjs --asset art/candidates/<name>.png --template <measured-id>` can produce native 360×640 DAY/NIGHT/RAIN PNG screenshots and a SHA-256-linked `review.json` from the isolated real engine. No user file uploads or dragging in Factory are necessary if the agent has repository execution. This test does NOT automatically grant artistic approval.\n\n22 OCTOBER 2026 — AUTOMATIC IMAGE-REFERENCE PRODUCTION UPGRADE\nThe Factory now has **seven** geometry templates, including measured straight bridge deck (84 game units wide) and separate left/right parapets (17 units each). For reference image pixels use `gary-visual-reference-board.html`; generate briefs programmatically via `node tools/asset-visual-brief.cjs --family bridge`. The one-piece illustrated bridge concept (with baked river and tapered walls) is REJECTED. Do not reintroduce it. New production PNG/WebP sprites require `tools/visual-release-gate.cjs` and `art-visual-ledger.json` 360×640 day/night/rain evidence. These are preflight aids, not final artist or iPhone approvals. The user need not run the Factory to ask ChatGPT for new assets; the assistant should do its own reference access/geometry/preview.\n\n# Gary Eats! — Universal Asset Factory (candidate)

**Producer standard, 22 October 2026:** `GARY_VISUAL_PRODUCTION.md` and `docs/visual-master/reference-pack.json` now own the reference-first generation rule. The Factory's default daylight screenshot is a real-engine QA capture with demonstration placements, not the user's full approved 30-second gameplay source. The exported prompt explicitly requires original high-street, Gary and ground image anchors, never assumes a raised profile is locked, and treats all new renders as candidates. The owner must approve against real 360×640 gameplay before production registration. Earlier dated tool-status sections below are historical.



## Consolidated audit — 22 October 2026

PR #11 now rejects non-PNG, over-3 MB and wrong-template-dimension files before decoding; stale imports cannot populate another template. Dragging starts inside the candidate rectangle and ignores small tap jitter and secondary pointers. Chromium and WebKit mobile regressions pass, including actual engine pixel differences and PNG export. This is simulated browser evidence; physical iPhone import/share/animation/performance remains **UNVERIFIED**.

The multi-asset workflow lives in the existing stacked PR #12 Biome Workspace. Merge #11 first, then reconcile #12 onto main without losing its history. Neither editor registers candidates in normal gameplay. Historical overlay-only and unmerged-PR-#10 statements below are superseded: #10 is merged, and the isolated renderer owns candidate compositing.

## Mobile-first visual editor — 22 October 2026 (draft PR)

The previous UI required opening five developer panels and using placement numbers, layer names, masks and JSON just to view an asset on an iPhone. The **existing** Asset Factory has been reorganised into three visible steps:

1. **Choose an asset** (four currently registered example templates) and gameplay location.
2. **Add artwork** using the iPhone file picker, or save a silhouette guide and copy its detailed ChatGPT generation prompt.
3. **Preview in the real game and save a screenshot/handoff.** Drag the candidate artwork on the 360×640 preview to move the candidate. Touch positions are converted from CSS viewport pixels into exact game design units. The fixed camera/lanes and the original PNG pixels do not change.

On mobile, three fixed, large quick controls provide **Add PNG / Preview / Save preview**; desktop keeps the same interface in two columns. Reference import, X/Y fields, render-pass selector, manual perspective editor, masks and raw QA report are collapsed under **Advanced controls and diagnostics**. This is a display/workflow change, not permission to skip strict source dimensions, alpha/silhouette, first-biome stylistic matching or artistic sign-off.

Game-preview artwork is decoded/validated and composed once per asset change; pointer drags reuse the cached candidate image (no repeated mask rasterisation). Native renderer candidates remain opt-in isolated debug-only, unregistered, without collision, save or production state modification.

**Current limits:** only four example fixtures, no general-purpose sprite/biome pack importer, no automatic image generation and no raised camera approval. The user-approved first-biome source screenshot lives in the ChatGPT conversation, not GitHub; users may import its cropped 360×640 PNG for screenshot comparisons. The world geometry is source-locked; the raised-architecture art profile remains provisional.

**QA before merge:** `npm test`, the changed unit/browser factory checks including iPhone-width visibility, touch drag, real-renderer layer diffs, wrong PNG rejection and copy/export behavior; Chromium and WebKit automated simulation; actual iPhone Safari manual smoke. Preserve rollback (unchanged `main`) until those finish.


**Draft PR #10 enhancement, 22 October:** an unregistered candidate now renders **inside the isolated real engine's named ground/rear/bridge-under-water/bridge-deck/foreground pass**, with world-scroll anchoring, exact X/Y draw placement and high-street daylight/night, bridge and wilderness presets. A structurally invalid imported PNG is never accepted as painted game art; the isolated preview uses a geometry blockout instead. No candidate is added to normal Play or collisions. Camera/artist/iPhone approval is still mandatory. See [real-engine asset review](docs/camera/REAL_ENGINE_ASSET_REVIEW_2026-10-22.md). The feature has not been merged/deployed; CI status must be checked on PR #10.


**22 October 2026 override:** The bridge, wilderness and camera/tooling branch stack reached `main` through merged PR #9 (`688f09c4`). Date-specific claims below that PR #4/5 or the factory are unmerged are historical. DRAFT01 wilderness art is **visually rejected**, even where the renderer still loads it. Painted bridge art remains a **debug review candidate**, not production-approved. Raised architecture is provisional. Do not infer iPhone/Pages verification from main-branch presence. See [current conflict register](docs/camera/CONFLICT_REGISTER_2026-10-22.md).

**New in draft PR #10, not yet merged:** the Factory accepts a local user-provided **exact 360×640** original-biome screenshot and rejects wrong-size references. It does not publish the uploaded image, modify the game, lock the raised camera or insert candidate art into real engine render passes. Use the rectified first-biome PNG generated in the chat, not the full phone screenshot.


**Branch:** `feat/universal-asset-factory`, stacked on `feat/visual-camera-calibration` / PR #5 and bridge PR #4. **No automatic merge or deployment.**

Open `gary-asset-factory.html` on the branch using a same-origin HTTP server. After review and deployment, its GitHub Pages path is `https://tryingafewnewthings.github.io/gary-runner/gary-asset-factory.html`; it is **not** available on public Pages until merged and deployed.

## What exists

- `gary-asset-factory-contract.json`: versioned definitions for four reusable fixtures (Victorian frontage, stone bridge pier, Victorian lamppost and ground decal), with **exact untrimmed source pixels, independent gameplay draw rectangles, normalized anchors, layers, safe padding, camera profiles and explicit approval states**. The 89×236 frontage and 32-unit side-masonry width are derived from current game geometry. The new fixture positions/sizes are **design candidates** and not registered gameplay objects.
- `gary-asset-factory.js`: pure geometry and mask renderer, UMD for Node and iPhone Safari; verifies current active camera contract, source-to-world aspect ratio, masks, safe padding, true pixel alpha, geometry leakage, ground contact, and registration truthfulness. **No rendering loop code changes.**
- `gary-asset-factory.html`: a zero-dependency, touch-friendly interface. Select a category, export a precisely sized **transparent template PNG**, export the silhouette mask, copy a constrained ChatGPT brief, import PNG artwork locally, inspect pixel/registration problems, export an approved-silhouette-clipped *candidate* image only if structural checks pass, and export a candidate JSON registration record. Shows a 360×640 screenshot from the actual engine and offers a separately loaded, isolated bridge-debug engine behind the overlay. The overlay is **not automatically inserted into the actual game render pass**. Preview image and candidate export are useful for review, not runtime proof.
- `tests/asset-factory.test.cjs` and `tests/asset-factory-browser.cjs`: four geometries and alpha/anchor checks, template/mask download, PNG import, masked export, candidate metadata, Chromium + WebKit simulated iPhone layouts. Included in `npm test`.

### How to produce an asset, on mobile

1. Open the Asset Factory on a GitHub Pages deployment (after PR approval) or from a branch preview served over HTTP.
2. Choose the intended profile and target. The canvas is always **360×640 design units**; source PNGs have exact dimensions independently of the game draw size.
3. Tap **Transparent template PNG** and **Copy ChatGPT art brief**. Attach the template as the image-generation reference. Generate **one** image, with no checkerboard, scenery, ground or independently invented perspective.
4. Use **Import and validate** and inspect the pass/fail report. The factory does not fix bad camera geometry: it clips to a predetermined silhouette and rejects overpaint, padding violations, wrong source size, no transparency or bad foot registration. If the imported image is correct, export the masked candidate and candidate JSON.
5. Compare the annotated 360×640 preview against a *user-approved reference screenshot*. Structural PASS is **not** a camera-angle or finished-art PASS. Sign off the material, viewpoint, identity and layer ordering.
6. Integrate through the existing asset-quality manifest + explicit runtime registration and proper layer, run `npm test`, review actual game render pass, and test physical iPhone scrolling/stutter. **Do not assume this browser's superimposed canvas is an engine-integrated object.**

### Geometry/projection truth

Gary Eats! uses an authored 2D Canvas camera, **not an inverse-projectable 3D camera**. The world plane is code-locked at 360×640 with road x105–255, lanes at 130/180/230 and player y540/foot offset6. The physical 3D height projection `0.8` is **a provisional artistic convention** for raised architecture. The shop, bridge pier and lamppost silhouette fixtures do not prove that painterly perspective; visual sign-off is mandatory before claiming exact camera-matched on-the-fly artwork. Their source geometry can be repeated without variation.

### Limitations / acceptance

Structural geometry and deterministic registration: **IMPLEMENTED**.
Reference screenshot overlay: **IMPLEMENTED**, not exact engine in-scene compositing.
PNG clipping + alpha/anchor validation: **IMPLEMENTED**.
Authoring full image art automatically: **NOT IMPLEMENTED** — deliberately use ChatGPT for professional artwork.
Automated analysis of *internal* object face perspective: **NOT IMPLEMENTED** and cannot be guaranteed from alpha alone.
Automatic GitHub asset upload and gameplay registration: **NOT IMPLEMENTED**; candidate JSON correctly declares `registered:false`.
Physical iPhone Safari and visually approved raised-object camera: **UNVERIFIED**.

The factory is a safe stage in the pipeline, not proof that every imported image is visually correct. It keeps the existing game, cutscene, fox, roast pickup, bridge and wilderness runtime untouched. It does not allocate canvases during game play. Tests are simulated-device checks; they are not actual iPhone performance benchmarks.

## QA commands

```bash
npm run test:factory
npm test
GARY_TEST_ENGINE=webkit npm run test:browser
```

After the repo's current branch has passed CI, inspect a sample Victorian frontage, bridge pier and lamppost **inside an actual game rendering layer**, not just this overlay, before allowing automatic registration. An approved camera screenshot and template version should remain alongside each actual production asset.


## Manual Perspective Editor — review candidate (PR #7)

Open [the manual perspective editor](gary-perspective-editor.html) from the Asset Factory's per-asset **Open Manual Perspective Editor** link, or use `gary-perspective-editor.html?asset=victorian-lamppost`. This page is served from the same checkout; the published Pages path will not exist until merged/deployed.

**Quick correction:** Change apparent width, height, top skew and top-edge depth shift with bounded controls. These transform existing pixels, *not* the physical game camera. Source export stays exactly the original untrimmed PNG dimensions. The ground anchor remains locked unless the user explicitly disables it. World X/Y sliders change candidate draw-location metadata, not physics or game lanes.

**Corners mode:** Touch/drag four visible numbered handles in the image at full source coordinates. Bottom corners cannot be dragged for the whole sprite when ground-anchor lock is on. Handles are limited to safe source bounds and convex non-self-crossing quads. Undo/redo, Reset, Before/After and a built-in QA warning are provided. A piecewise Canvas-2D texture map renders the image: no additional libraries or gameplay changes.

**Separate faces mode:** For a genuine raised structure, select Front, Top/Roof or Side and import each as a *separate transparent PNG with the SAME full source dimensions*. Adjust each face's corners independently. Layer order is Side → Front → Roof. It intentionally does not guess which pixels of a flattened JPEG constitute a hidden face, and cannot reconstruct genuinely unseen walls, roofs, back sides or underside geometry. Faces are optionally combined into one composite candidate PNG only after all imported layers are in the same drawing space. Complex bridge layers still use the real renderer's named occlusion passes; this studio does not replace that layering.

**Gameplay preview:** Shows the actual 360×640 coordinate system, a review screenshot (not camera approval) or a user-supplied *exact 360×640 local screenshot*, and the candidate at its intended world rectangle. The original PNGs never leave the user's browser or get overwritten. Browser file-import cannot silently write to GitHub or make a new runtime asset registration.

**Exports:** A candidate PNG at exact source dimensions; an editable `gary-eats-perspective-edit-v1` JSON containing every quad, quick control, original filenames, profile reference, and world placement; and a composited game preview PNG. Importing JSON checks asset ID, profile and safety limits; original PNGs must be selected again on another visit/device. Exports explicitly state `UNVERIFIED_VISUAL`, `registered:false` and iPhone unverified. Neither camera calibration nor user-approved style is silently modified; preserve native originals for reversibility.

**QA:** `node --test tests/perspective-editor.test.cjs`, `node tests/perspective-editor-browser.cjs`, `GARY_TEST_ENGINE=webkit node tests/perspective-editor-browser.cjs`, plus `npm test` and the existing asset registration gate. A candidate that exceeds safe transparent padding or loses foot registration is rejected at export. Real-face perspective, shading consistency, alpha-fringe quality, multi-layer occlusion and frame pacing on a physical iPhone still require art review. The underlying camera contract's raised profile remains provisional.

**Recommended use:** Quick correct small sprite deviations; use independent face PNGs for substantial architecture corrections. Save successful face/corner settings with each individual asset and do **not** overwrite global camera defaults without explicitly approved comparative screenshots across several assets.
