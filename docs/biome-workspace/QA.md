# Asset Factory / Biome Workspace validation — 22 October 2026

Scope: existing PR [#11](https://github.com/tryingafewnewthings/gary-runner/pull/11) and stacked PR [#12](https://github.com/tryingafewnewthings/gary-runner/pull/12). No PR merge, deployment, art generation or approved-art replacement occurred.

## Source audit and integration boundary

Read current main/branch AGENTS.md, index.html, master reference, STYLE.txt, ASSET_GRID_PROMPT.txt, ASSET_QUALITY_GATE.md, camera system/model/contract, factory contract/docs, biome docs, live data/runtime, bridge registration and wilderness renderer. Active runtime is `gary-difficulty-runtime.js`; archived engines remain unused. Relevant discrepancies are recorded in the [conflict register](../camera/CONFLICT_REGISTER_2026-10-22.md).

World remains exactly 360×640, road x105–255, lanes 130/180/230, Gary foot y546, cobble60, bridge deck x138–222 and length620. Ground geometry is locked; raised projection remains provisional. DRAFT01 is rejected, and the owner's first-biome reference pixels remain outside this repository. Nothing here establishes a finished-art perspective/style approval.

Normal Play never exposes `GaryAssetPreview`. The workspace owns an isolated same-origin `index.html?debug=1&bridgepreview=1` session with preview saves. The only production renderer refactoring adds a default-preserving street split used when isolated ground candidates exist. Ordinary render order, gameplay clocks, saves, collisions, audio and encounter modules remain intact. New manifest entries below describe QA screenshots, not registered game sprites.

## Defects repaired

- Asset Factory: PNG weight/signature/template dimensions checked before decode; stale asynchronous imports cannot replace another template. Drag hit testing and a movement threshold prevent empty-canvas and tap-jitter placements. Browser drag regression now starts inside the actual sprite rectangle rather than empty screen space. The source-level pass-order assertion now distinguishes the early street ground hook from the later wilderness/bridge hook; browser pixel assertions verify their behaviour.
- Workspace: primary Files picker accepts PNGs or ZIP; Preview returns to the current composition instead of resetting it; original street is the initial scene. Aspect-preserving scale/layers/order/lock are visible, with technical settings collapsed.
- World anchoring: freeze synchronises fixed-step interpolation, and all candidates keep an explicit shared checkpoint origin across re-registration. Exporting after a scroll review retains checkpoint-relative world positions instead of baking the camera displacement into the layout. Scrolling guides/hit testing follow engine coordinates; screen-fixed items remain stationary. Re-layering, scaling, reordering and export preserve other placements.
- Layering: isolated street decals sit below shop/prop silhouettes; wilderness ground stays below vegetation; foreground/rear and lower-masonry/water/deck passes are compared using actual canvas pixels. Full-frame bridge source registration corrected to x0, y=near−800, 360×1000.
- Memory/import: whole-pack encoded/decoded limits checked before image decode; temporary alpha surfaces released; duplicates obey the same limits on export and reimport. Failed imports leave the existing composition untouched.
- ZIP: CRC/path/header/directory checks, local/central consistency and bounded streaming DEFLATE; ordinary external DEFLATE archives and original-byte exports tested. Exports retain source dimensions, filenames, exact placement/order, opacity and scrolling settings. All remain unapproved and unregistered.

## Automated validation

**PASS:** 50 Node unit checks, 39 active-engine integration checks, 88 registered image checks, and all eight browser programs in both Chromium and WebKit. No automated failure remains. Full `npm test` passed after the renderer repair; the final workspace checks also passed on WebKit with stable checkpoint-origin exports. Physical iPhone and artistic checks below remain open.

Node 24.19.0, locked npm dependencies and Playwright 1.64.1, Chromium 156 and WebKit 27.2 on this Linux cloud host. Both 390×844 and 375×667 phone layouts are exercised. Touch-capable contexts use real pointer movement and explicit synthetic touch-pointer jitter/cancellation/secondary-pointer sequences; this is not a physical touch-screen claim.

- `npm test`: unit, registered-asset, active-engine integration and all eight Chromium browser programs.
- `GARY_TEST_ENGINE=webkit npm run test:browser`: all eight browser programs, including active engine, bridge, Camera Lab, bridge artwork, wilderness, Factory, Workspace and Perspective Editor.
- Workspace checks assert simultaneous engine candidates, exact PNG bytes and placement metadata through JSON and ZIP round-trips, standard DEFLATE import, rejected imports without mutation, full-frame bridge registration, proportional ground-anchored scaling, same-layer order, scroll/freeze/resume, fixed-screen placement, Preview without resetting, and actual rendered occlusion. They do not merely count buttons/files.
- Existing suites exercise Gary intro/transition/walk and sidestep, roast collision/scoring/discovery, crash/restart, saved discoveries, bench/cutscene skip/pause/reset, both fox outcomes, bridge traversal/lane guidance and wilderness encounters/cache bounds. Audio setup/cues have automated checks; audible quality and on-device timing remain manual.

Local WebKit needed missing Debian libraries extracted into workspace-only browser support directories because this container has no root package installation. Playwright's host preflight was skipped only after providing those libraries; WebKit itself ran. Nothing about that host setup is shipped in the game. Cloud timing reports include slow frames under shared CPU load and are **not device FPS evidence**.

## GitHub Actions cause and repair

Latest original heads #11 `94a1456` and #12 `e960a32` had green limited Node jobs but cancelled active-engine runs, **not browser-test passes**. [Run 39775611474](https://github.com/tryingafewnewthings/gary-runner/actions/runs/39775611474) spent the entire 15-minute job downloading Ubuntu OS dependencies from `azure.archive.ubuntu.com`; every test step was skipped. The existing workflow now selects Ubuntu's primary HTTPS mirror, bounds download retries/timeouts, gives setup an explicit timeout, allows 30 minutes overall and uploads screenshots on success too. [PR #11's repaired run](https://github.com/tryingafewnewthings/gary-runner/actions/runs/39789982401) passed every stage, including Chromium and WebKit.

## Engine captures (360×640)

| Composition / comparison | Capture |
| --- | --- |
| Original street with two imported existing bush PNG placements | [Street layout](layout-street-day.png) |
| Same multi-asset composition in the bridge renderer | [Bridge layout](layout-bridge-middle.png) |
| Same composition against existing, rejected wilderness content | [Wilderness layout](layout-wilderness-reveal.png) |
| Ground / rear / foreground QA rectangles | [Ground](bridge-ground.png), [rear](bridge-rear.png), [foreground](bridge-front.png) |
| Lower masonry versus deck, separated by real water occlusion | [Under water](bridge-under-water.png), [deck](bridge-deck.png) |

Bushes reuse original bytes from `art/fox/fox-bush.png`; coloured rectangles are test fixtures. These are tool demonstrations and occlusion evidence, **not proposed approved biome art or approved final layouts**. Runtime screenshots are downsampled once into the exact design frame, without the editor's selection guides. Fresh browser artifacts include street day/night, bridge entry/exit and wilderness dense views for each engine.

## Remaining release/approval gates

**UNVERIFIED ON PHYSICAL IPHONE:** Safari Files multi-select, save/share sheet and ZIP reimport, real touch ergonomics, background/return, memory pressure, animation continuity and 60/120Hz pacing. Simulated WebKit does not remove this gate. Older Safari without raw-DEFLATE support needs STORE ZIP or embedded JSON.

**ART / RAISED CAMERA UNAPPROVED:** compare perspective/orientation, visible scale/contact, material/style consistency and clean alpha edges against the owner's original high-street reference. Ground and numeric registration passes do not approve these. Camera Lab/Perspective Editor remain linked and reusable. Do not use DRAFT01 as an artistic standard or auto-register these candidates.

Merge #11 into main first, then retarget/reconcile #12 against updated main and merge only after approval. Preserve merge ancestry (or reconcile explicitly after a squash). Deployment needs separate approval. The resulting Safari URL is `https://tryingafewnewthings.github.io/gary-runner/gary-biome-workspace.html`; factory URL is `https://tryingafewnewthings.github.io/gary-runner/gary-asset-factory.html`. These paths are not claimed deployed by this session.
