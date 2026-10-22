# Gary Eats! — Documentation conflict register (22 October 2026)

**Audited against main commit 688f09c4, active index.html and source.** Distinguish CODE-OBSERVED, DOCUMENTED, VISUALLY REJECTED and UNVERIFIED-ON-DEVICE. This record does not verify deployment to public GitHub Pages.

## Current source priority
1. Live `index.html` script load order and actual active source: `gary-difficulty-data.js`, `gary-difficulty-runtime.js`, `gary-game-config.json`.
2. `gary-camera-contract.json` for the fixed world contract; do not alter the provisional raised-architecture profile without multi-asset visual approval.
3. `STYLE.txt` for paint/material style and `ASSET_GRID_PROMPT.txt` / `ASSET_QUALITY_GATE.md` for reviewing imagery (their **19 October overrides supersede** 15 October numeric/status examples).
4. Current image/sprite registration, real-engine gameplay captures and user-approved visual references, not candidate concepts or dated handoff status.

## Conflict matrix

| Severity | Contradiction | Current authoritative answer |
|---|---|---|
| HIGH | `PROJECT_STATE.md` and historical `GAME_STATUS.txt` describe `game-runtime.js` or `game-data.js` as the active runtime | Main `index.html` actually loads `gary-difficulty-data.js` and `gary-difficulty-runtime.js`. Legacy engines are retained for rollback; do not reintroduce them with old installers |
| HIGH | Old `STYLE.txt` and `ASSET_GRID_PROMPT.txt` sections specify 48-unit cobbles or call 60 a preview | Active `WORLD.cobbleCell=60`. The renderer maps source texture quadrants into 60-design-unit cells. Both documents have later overrides, but the legacy text is misleading when read alone |
| HIGH | `GARY_CAMERA_SYSTEM.md`, `WILDERNESS.md`, `FORGOTTEN_BRIDGE.md`, `BRIDGE_ARTWORK_PIPELINE.md` say the work was unmerged | PR #9 merged the stacked camera/bridge/wilderness/Asset Factory into `main`. Main `index.html` loads `gary-bridge.js`, `gary-bridge-art.js`, `gary-wilderness-data.js`, `gary-wilderness-encounters.js` and `gary-wilderness.js`. **Main is not proof of Pages or phone QA** |
| HIGH | DRAFT01 wilderness assets are registered in code even though the user rejected their look | **VISUALLY REJECTED, NOT THE STYLE MASTER**. Keep reusable renderer/encounter mechanics, but require redesigned visuals coherent with the first biome and an explicit review before production approval |
| HIGH | Bridge painted art looks integrated in Camera Lab and can be mistaken for the production bridge | `gary-bridge-art-review.json` and `art/bridge/production/*.png` are an **unapproved debug candidate**. Normal Play defaults to the procedural bridge. Existing artwork has edge fringes, occasional flat patches and provisional raised perspective |
| MEDIUM | The raised-camera `heightProjection:0.8` is repeated as if exact | `gary-camera-contract.json` marks it `PROVISIONAL_NEEDS_VISUAL_APPROVAL`; the world has no physical 3D camera matrix. Code-locked ground plane: 360×640, road x105..255, lane centres 130/180/230, Gary foot y546, cobble 60. Bridge deck x138..222 (84 wide), length 620 |
| MEDIUM | `gary-asset-factory-contract.json` treats `docs/bridge/approach.png` as a 'street' screenshot | This is an explicit temporary bridge-approach QA capture, **not** the first biome. User supplied `IMG_7392.jpeg` (actual daylight high street) on 22 Oct. Rectified 360×640 visual reference and alignment overlay exist in the chat, with observed style documented in `FIRST_BIOME_STYLE_REFERENCE_2026-10-22.md`. Their image bytes are **not** committed to GitHub |
| MEDIUM | Asset Factory 'real engine' overlay is described as full candidate integration | The current interface paints a canvas OVER the isolated debug game. It is not placed within game world depth/occlusion passes and does not register new obstacles/props. The draft local 360×640 reference importer is useful comparison only |
| MEDIUM | Some historical `CUTSCENE_STUDIO.md` and rollout notes reference former engine/installers | Keep current `gary-cutscene-runtime.js` and project data in the active script route; avoid publishing installers tied to old `game-runtime.js` |
| MEDIUM | Old master/development plans describe bridge, wilderness and stranger dialogue as future or not live | Active source and current index take precedence; fox follows bench cutscene and bridge follows fox. Underpass, full cave biome, collapse gameplay, Victorian/Roman chapters, jump/slide and lantern inventory remain future |
| MEDIUM | Automated asset PASS can be mistaken for perspective/art/iPhone approval | The gate checks machine-readable metadata and some RGBA pixels, not painterly style, true 3D-facing surfaces, all animation frames, WebP pixel alpha, actual Apple-device pacing or publishing |
| LOW | Document says PR #4 and #5 still unmerged in present tense | Those are historical status notes. The current main baseline is the PR #9 merge. Historical content is retained below supersession notices for provenance |

## Existing asset/style evidence

The user-supplied original-game screenshot confirms hand-painted UK high-street material: irregular cool-grey rounded cobbles, dark slate straight road, red-brick shopfront with dark outlines/awnings, warm window light, detailed Gary in navy quilted gilet and blue jumper, clean stylised food and contact shadows. It does **not** determine a unique height/pitch for buildings, bridge supports or trees. Ground camera fidelity and artwork-style fidelity must be reviewed separately.

## Blocking production checks

1. Source control and unit/snapshot tests: `npm test`, camera contract tests and changed-image quality gate on a test branch.
2. One approved reference per class: first-biome frontage/ground; freestanding vertical roadside prop; bridge/masonry with separate water.
3. Match exact source pixel dimensions, world draw sizes, anchors, alpha, layers, independent shopkeeper/window/shutter geometry, animation baselines and gameplay legibility.
4. **Actual in-engine candidate compositing:** check scrolling under actors, foreground props, water, rain, UI and safe collision space, not only a static screenshot overlay.
5. Record visual review and actual Safari/iPhone performance and first load, before approving new biome art or promoting any change to normal Play.
6. Never replace working assets with the visually rejected DRAFT01 pack, nor spend Codex prompts generating ordinary replacement art.

**Status:** Documentation conflict registry + isolated Asset Factory reference-import enhancement proposed in draft PR #10. No gameplay modifications; raised-object perspective unapproved. Browser regression added but not yet verified in CI.

## Consolidated PR #11/#12 audit (22 October, supersedes tool-status rows above)

- `index.html` still loads `gary-difficulty-data.js` / `gary-difficulty-runtime.js`; `WORLD.cobbleCell=60`, canvas 360×640, road 105–255, lanes 130/180/230, foot y546 and bridge deck 138–222/length620 are unchanged. The active data file's introductory comment still names the old runtime; index.html is authoritative.
- PR #10 is merged. The Factory's historical overlay-only descriptions are superseded by its actual isolated `GaryAssetPreview` render-pass API. PR #11 keeps its four template fixtures; PR #12 extends that API with bounded pack candidates and a separate existing Biome Workspace page. No alternate gameplay runtime was introduced.
- PR #12's initial pack UI could register moved assets against an interpolated world position and draw street ground over shops. Both are corrected and checked against engine pixels. The original daylight high street is the initial preview; rejected DRAFT01 remains existing wilderness content, never the style master.
- Full-frame bridge filenames previously received an incorrect default horizontal offset for lower masonry and arbitrary vertical placement. Verified 720×2000 sources now use the actual 360×1000 draw and shared `near−800` anchor. Filename and dimension matches remain technical hints, never artistic approval.
- [Consolidated QA](../biome-workspace/QA.md) records evidence and remaining physical-iPhone/art approval gates. Public Pages availability is still contingent on approved merge/deployment.
