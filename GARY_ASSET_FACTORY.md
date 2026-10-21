# Gary Eats! — Universal Asset Factory (candidate)

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
