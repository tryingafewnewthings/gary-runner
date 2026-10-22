# Gary Eats! — Biome Workspace (draft PR #12)

**Status 22 October 2026:** review-only visual/editor extension. New page: `gary-biome-workspace.html`. **Not a replacement for the actual runtime or approved wilderness art.** PR #12 is stacked on the separate mobile Asset Factory PR #11; merge upstream first, review CI, then merge PR #12. The `main` branch remains the production rollback until both are approved.

## Intended one-hand mobile workflow

1. Open the Biome Workspace in Safari. The **actual existing `index.html` engine** loads inside the editor in an isolated `debug=1&bridgepreview=1` session, never normal Play.
2. Choose a game environment: original street (day/night), bridge approach/entry/middle/exit, wilderness reveal/dense. Use the progression slider or Earlier/Later controls. This **jumps between actual real-engine presets**, not a continuous automatic story transition.
3. Add up to **20 separate PNG artwork files** from the device, or import a previously exported complete `biome.zip` / `.gary-biome.json`. A ZIP without the workspace manifest will import up to 20 standalone PNGs as a **candidate assembly requiring all placements to be reviewed**. No player photo, screenshot or rejected DRAFT01 style is used as an automatic sprite master.
4. Tap any asset in the list or preview; **drag it** directly in the 360×640 engine frame. Change X/Y, width/height, alpha and layer per asset. Objects use the real `ground`, `rear`, `under-water`, `deck` and `front` engine render passes (including whether Gary is in front of/behind the candidate).
5. Save a 360×640 preview screenshot, a complete **ZIP** containing `manifest.json` and the original separate PNGs, a self-contained JSON containing embedded PNGs, or layout-only JSON for a developer handoff. The ZIP is built using dependency-free PKZIP STORE: pre-compressed PNGs need no second deflation and standard ZIP tools can open it. ZIP import also handles common DEFLATE when the browser provides `DecompressionStream('deflate-raw')`; otherwise it displays a clear fallback instruction.

## Registration/quality contract

- Logical world coordinates remain fixed: 360×640, road x105–255, lanes x130/180/230, Gary contact baseline y546, single bridge deck x138–222 and length 620. Do **not** scale or warp the *game* to match source art.
- When filename and exact intrinsic PNG dimensions match a currently recorded **technical** wilderness/bridge sprite, the tool proposes the pre-existing source-to-draw ratio. The old DRAFT01 *visuals* are user-rejected and its measured technical sizes are still **not an approved camera or art reference**. Any unknown file receives a clearly provisional display estimate and must be separately inspected, calibrated and approved.
- Imported PNGs undergo a decoded alpha check and size caps (3MB/file, 3MP per image, 18MB source art total). Opaque artwork is surfaced for review rather than falsely validated as a transparency pass. Full `ASSET_QUALITY_GATE.md` and visually correct gameplay registration remain mandatory for promotion.
- JSON and ZIP manifests include `approval: UNVERIFIED_VISUAL`, `approved:false`, `registered:false`, `collision:'NOT_DEFINED'`. They never write to `gary-game-config.json`, asset manifests, world physics, encounter flow, score, localStorage or game source. No auto-promotion/deployment exists.
- ZIP import checks safe paths, sizes, CRC32, entry count and unsupported compression. ZIPs not made by the workspace may require scene placement and alpha/dimension review; DRAFT01 is not an approved style source.
- Dynamic engine candidate list is strictly **debug-only** and limited to 20, with no image decoding, callbacks, masks or DOM allocation in the normal render loop. Existing one-asset `GaryAssetPreview.set` and Camera Lab remain intact.

## Real acceptance criteria

- Source/unit: `node --test tests/biome-workspace.test.cjs tests/biome-zip.test.cjs`.
- Mobile browser: `node tests/biome-workspace-browser.cjs` and `GARY_TEST_ENGINE=webkit node tests/biome-workspace-browser.cjs`. Test complete PNG-pack save/import, ZIP byte integrity, touch drag, multiple actual engine candidates, pass order, scene progression and no horizontal overflow at 390 and 375px widths.
- Full regression: `npm test` including source images, fixed-step controller, reader/fox/cutscene, roasted-food pickup, 84-unit bridge, wilderness gameplay, cold startup, resume and crash.
- **Physical iPhone Safari is required** before release. Check multi-image upload via Files, iOS Share Sheet/save ZIP, ZIP reimport, PNG thumbnail display, scrolling/layer occlusion, daylight/night legibility, 120Hz pacing, device memory and accidental touches while scrolling. CI WebKit is *not* equivalent to the actual phone.
- **Visual authority:** use the owner's original daylight high-street screenshot, `STYLE.txt`, `ASSET_GRID_PROMPT.txt`, `ASSET_QUALITY_GATE.md` and `gary-camera-contract.json`. Raised 2.5D structures remain provisional; a tech PASS never authorises production artwork.

## Remaining for a true automated asset *production* pipeline

The current workspace can assemble, preview and export an entire unregistered candidate biome **but it does not create its painted sprites automatically, author collision logic, edit animations, integrate the manifest into normal gameplay or approve raised-camera art**. Those require an approved style master and per-family sprite geometry. The existing DRAFT01 wilderness needs **replacement artwork**, not rubber-stamping.

Maintain the same named engine render-pass contract so future prefab metadata and batch asset registration can be added without rewriting the runtime or requesting Codex for normal sprite painting.
