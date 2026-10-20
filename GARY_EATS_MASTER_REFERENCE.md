# GARY EATS! — Master game reference and developer handoff

## 20 October supplied bridge artwork integration

`CODE-OBSERVED` on stacked PR #5: the externally supplied lower/deck/foreground PNGs are now registered unchanged in the real engine through Camera Lab’s **Review supplied bridge artwork** control. Broader alpha-traced geometry, independent foundation water occlusion, four 360×640 captures and full-crossing QA are documented in [BRIDGE_ARTWORK_PIPELINE.md](BRIDGE_ARTWORK_PIPELINE.md). This is an unapproved visual-review candidate; normal Play still uses PR #4’s bridge. No merge, final-art activation or physical iPhone verification is implied.

**Reference audit:** 19 October 2026 (main branch at `3790e4226992`, checked before this documentation package).  
**Repository:** https://github.com/tryingafewnewthings/gary-runner  
**Live:** https://tryingafewnewthings.github.io/gary-runner/  
**Status labels:** `CODE-OBSERVED`, `DOCUMENTED`, `PLANNED`, `UNVERIFIED-ON-DEVICE`.

> This file is a current navigation and decision reference, not a replacement for the real engine or calibrated source data. After any commit, re-check `index.html`, the loaded scripts and runtime configuration. Code observed on 19 October may have changed. An uploaded asset is not necessarily wired into the live runner, and passing synthetic tests does not prove physical iPhone behaviour.

## 20 October implementation amendment — Forgotten Bridge

`CODE-OBSERVED`: this checkout's `index.html` loads `gary-bridge.js` into the active difficulty engine. After the reader and completed fox, a once-per-run raised brick crossing narrows the 150-unit road to an 84-unit centre deck, then widens into procedural wilderness ground. Four cached Canvas layers, safe guided centre travel and a disabled, biome-gated collapse hook are implemented. See [FORGOTTEN_BRIDGE.md](FORGOTTEN_BRIDGE.md) for the real-engine preview, inspected screenshots and verification limits. This supersedes the dated bridge-as-future statements below; it does not establish deployment to main/Pages. Full wilderness encounters, historical biomes and underwater/cave gameplay remain `PLANNED`. Physical iPhone performance remains `UNVERIFIED-ON-DEVICE`.

## 1. Creative thesis and player experience

Gary Eats! is a **professional-quality, mobile-first, 2D HTML5 Canvas three-lane food-review runner** set initially on an affectionate, recognisable British high street. The protagonist, Gary, is recognisable by his microphone, blue/navy clothing, hair and rear three-quarter silhouette. The humour is dry, British and character-led, not random internet-surrealist content. Food pickups, recognisable shops, shopkeepers, the Food Catalogue and Gary's 1–10 end-of-run review establish a warm, accessible introduction.

The ordinary street gradually reveals something uncanny: an approaching evening, lights behind windows, one-time shutters, emptying shops, increasing rain, old roadworks, crumbling and overgrown cobbles, and a hooded newspaper reader on a bench. The first real encounter is with **that reader**; there is no preceding encounter with the same man. A later fox steals a miniature sausage roll from the verge; it is comedic relief inside the mystery. Subsequent chapters are planned to move through a bridge/railway underpass and wilderness, before the surprise arrival in **Victorian England**. Later historical eras may include Ancient Rome. Do not advertise time travel at the opening; seed an evolving mystery and recurring details (the bell/Last Bell is a candidate motif). A long-term food-discovery and rare-event feedback loop supports repeat play.

**Non-negotiables:** preserve the feel of a good endless runner before adding spectacle; obstacle patterns remain learnable and fair; narrative events are earned, paced and do not silently create unavoidable hits. All added systems must remain usable on older iPhones and 120 Hz screens, with reliable pause/resume and no blank loading states.

## 2. Authoritative source hierarchy and reading order

1. `index.html` is **the live script map**. At the 19 October audit it loads, in order: `gary-difficulty-data.js`, `game-core.js`, `food-catalogue.js`, `gary-intro-transition.js`, `gary-crash-config.js`, `gary-street-mystery.js`, `gary-road-evolution.js`, `gary-cutscene-runtime.js`, `gary-fox-encounter.js`, `gary-difficulty-core.js`, `gary-difficulty-runtime.js`. Observe the exact HTML again before edits. The old `game.js`, `game-runtime.js` and sidestep test variants are **not** the currently loaded engine.
2. `gary-difficulty-data.js` is the active WORLD/item/biome/pattern/content data. Do not assume `game-data.js` is the currently loaded data. `game-data.js` and older engines remain for rollback, historical context and source comparison. Do not delete casually.
3. `gary-game-config.json` owns the published, per-shop GOLD keeper anchors, GREEN clipping masks, BLUE window panes and AMBER shutter/door-light geometry. Those areas must remain independently adjustable.
4. `gary-cutscene-project.json` is the currently authored scene data. `gary-cutscene-runtime.js` is the live scene manager; `gary-cutscene-studio.html`, CSS, JS and publisher support mobile authoring. `CUTSCENE_STUDIO.md` owns authoring details.
5. `STYLE.txt` is the visual contract; `ASSET_GRID_PROMPT.txt` is the evaluation procedure; this file summarises decisions and actual routing. `GAME_STATUS.txt` is the quick start. `ASSET_QUALITY_GATE.md` and `asset-quality-manifest.json` describe executable checks; they do not replace artistic review.
6. Relevant specialist notes: `RUNTIME_UPGRADE.md`, `FORGOTTEN_ROAD_GROUND.md`, `LAST_ORDERS_UPGRADE.md`, `FOX_ENCOUNTER.md`. Old baseline claims in these documents are historical; current loaded code wins.

**Critical conflict correction:** old documents mention `WORLD.cobbleCell = 48` and the `game-runtime.js` route. Active `gary-difficulty-data.js` declares **`cobbleCell: 60`** and `index.html` loads **`gary-difficulty-runtime.js`**. Never propagate superseded measurements into new artwork or code.

## 3. Camera, world geometry and visual design

- **Logical canvas:** 360 × 640 portrait units, fixed camera, world scrolling vertically. Phone backing resolution does not change authored coordinates; DPR scaling is only raster resolution.
- **Road:** x = 105..255, three 50-unit lanes at centres **130, 180, 230**. Pavement 16 units each side. Gary reference y = 540, standard visible target height 142 and foot offset +6. Source pixel dimensions and on-screen display dimensions are separate concepts.
- **Shop presentation:** shop destination rectangle **89 × 236** design units. On left x = 0 and on right x = 271; 360-unit street segments. Atlas `high_street_sprites.webp` 2912 × 2688; preserve current atlas crops and published shop overrides.
- **Perspective:** fixed, slightly elevated near-orthographic/oblique painted-cartoon viewpoint. Shop front faces towards the road with its long wall parallel to the road. **No pronounced perspective vanishing point, no diagonal road-block bars, no arbitrary isometric rotation and no artificial depth shrink as objects move.** A horizontally oriented two-lane roadworks barrier remains horizontally aligned across its span while showing a modest top face.
- **Style:** hand-painted cartoon British street; clean dark outlines, restrained texture, soft coherent highlights/shadows and readable silhouettes at actual iPhone scale. Gary remains visually recognisable across walk, transition, cutscene, celebration and crash. Keep short brown hair, navy quilted gilet, patterned blue jumper, dark trousers, black shoes and fuzzy grey microphone. No anime, dramatic 3D lighting, photorealism or pasted-on stock icons.
- **Lighting:** warm daylight from upper left. Night = cool environment tint with restrained warm amber windows/lamps, legible hazards and pickups, rain that never obscures the safe lane. Shutters draw in front of keepers, local light behind keepers; keeper position must not move when blue window panes are edited.
- **Ground:** eight WebP cobble variants share one scrolling quadrant-based grid at **60 logical units per cell** (verified in the currently loaded data file). Both pavements and kerbs remain phase-aligned; decay is transparent overlay, not a replaced road texture.
- **Sprites:** true transparency rather than fake checkerboard or white fringe. Keep full, untrimmed registered cells, stable body scale/foot baseline and consistent head orientation. Test actual gameplay-size animation, not just one source frame. On a separate transparent sprite, don't bake road, grass or a drop shadow unless the asset's documented design specifically requires it.

### Approved / observed sprite references

| Family | Authoring dimensions / contract | Runtime notes |
|---|---|---|
| Gary intro | `gary_intro_sheet.PNG`: 1536×1024, 4×2 at 384×512 | Talking intro; last pose links to transition. |
| Gary intro-to-walk | `gary_transition_sheet.png`: 1536×512, 4×1 at 384×512 | Code owns movement and scale; latest commit includes border cleanup. |
| Gary walking | `gary_walk_sheet.PNG`: 6 frames horizontally | Stable ground line; inspect game data for frame duration. |
| Fox approach / return | `art/fox/fox-approach.png`, `fox-return.png`: 1536×256, 6×1 at 256×256 | Registration source: `art/fox/registration.json`, baseline y=220. |
| Fox snatch / turn | `fox-snatch.png`: 1024×256, 4×1; `fox-turn.png`: 768×256, 3×1 | Same frame coordinate system and alpha padding. |
| Fox bush | `art/fox/fox-bush.png`: 512×512 | World draw box 224 units; fox roughly 80 units. |
| Half-eaten sausage roll / custard cream | `art/food/*.png`: 512×512 each | General pickups about 42 / 36 display units; special stolen roll is a much smaller scripted 16-unit prop. |
| Roadworks barrier | `art/obstacles/gary-service-charge-barrier.png`: horizontal 1024×512 | Message: **5000% SERVICE CHARGE AHEAD**, two-lane hazard (~98–100-unit display). Verify actual in-game legibility and orientation. |
| Ground decay overlays | `art/forgotten-road/decay-{light,medium,heavy,kerb}.png`: nominal 512×512 | Transparent art baked into bounded atlases at startup, not scaled from raw PNG in active frames. |
| Hooded reader on bench | `gary-mysterious-bench.png`: 4×2, 384×512 cells | Rain-only once-per-run animation; last two frames alternate. |
| Cutscene characters and backdrop | `art/cutscene01/*` and `gary-cutscene-project.json` | Distinct scene artwork and interactive UI; validate current project registration. |

These contracts document expected exports and code references. The automated gate validates exact metadata on modified or registered PNGs; visual consistency remains a separate human/AI review.

## 4. Active runtime architecture (code-observed unless noted)

### Browser modules

- `game-core.js`: 60 Hz fixed-step clock, bounded catch-up, object pools, swept contact and interpolation primitives.
- `gary-difficulty-core.js`: deterministic seeded pattern generator, reachable-lane validator, 2-lane hazard footprint and difficulty/assist controller. Never spawn an impossible three-lane wall or disguise collision geometry.
- `gary-difficulty-runtime.js`: **current live engine** with fixed simulation, separated render, interpolated movement, pooled effects/items, menu/intro/intro_transition/play/cutscene/crash/paused/over states, camera/shops, scene pacing, audio and input. Avoid allocation or texture baking in the hot path, mutation inside draw/render, or double-loading an old engine.
- `gary-difficulty-data.js`: mutable content definitions and frozen world/biome policy. Two currently defined difficulty environments: `high_street_day` and `high_street_night`, with additional story stages managed separately. Planned ten-biome structure does **not** mean ten playable environments.
- `gary-road-evolution.js`: precomputed ten decay atlas variants (left and right × five stages), gradual 30-active-second visual encroachment, late near-total cobble coverage, cached bounded blits and weather/bench gating. Stage overlays cannot start immediately at run start.
- `gary-street-mystery.js`: rain-and-shutters-gated bench cameo; ground-anchored, hazard-safe introduction. 
- `gary-cutscene-runtime.js`: prepared, once-per-run dialogue banner; registered character illustrations, staged triggers, typewriter/paginated text and pause interaction. Live project scene is **`first-bench-meeting`**, triggered by alignment with the `hooded-reader` in `forgotten-road`; 16 dialogue beats observed in authored JSON. There is no established gameplay reward/lantern inventory to claim live solely from dialogue.
- `gary-fox-encounter.js`: once-per-run fox story beat after bench / dialogue, with a hazard-free staging corridor and one result sampled per encounter. 90% scripted theft / 10% spared collectible roll; 3.5-second minimum readiness delay. Animation sequence: bush → approach → snatch → turn → retreat. Speed floor 80% of ordinary run pace. Stolen food yields no points and cannot unfairly lower the rating denominator.
- `food-catalogue.js`: same-device localStorage discovery collection; do not erase saves on restart. New food types must be obtainable through current patterns, not merely present in a static catalogue.

### Transition sequence currently coded / intended

1. Familiar playable street: food and ordinary hazards, humour, recognisable shops and shopkeepers.
2. Night/settled rain: progressive environmental tint, warm lit windows, shop closures. Each **unique shop** closes once per run and stays shut; keeper motion should suggest closing without jumping outside its clip.
3. Heavy rain + decal/ground corruption: shutters complete before decay begins; 30 seconds of active-time progression rather than decay immediately on Play. Buildings/props occlude ground overlays; decay is predominantly on side cobbles and pavement, not a giant texture pasted across road. Street clears progressively.
4. Later roadworks hazard: wide horizontal **5000% SERVICE CHARGE AHEAD** barrier enters after shop/decay gates and only in the fair wide-hazard generator, preserving an available lane.
5. Hooded newspaper reader bench is first real narrative encounter. The once-per-run cutscene uses a cinematic side-to-side composition: stranger on left, Gary on right, world still visible/dimmed beneath the horizontal UI banner. First meeting must not reveal the time travel premise.
6. After that scene/corridor, a comic fox emergence and sausage-roll theft/spared outcome; no prior fox encounter should steal focus from the first bench meeting.
7. Future environmental boundary: bridge / railway underpass → vegetation → wilderness and glowing eyes → an unexpectedly lively **Victorian England**. Later Rome, thematic foods, rarities and returning mystery anchors remain proposals.

**Release uncertainty:** The currently loaded scripts and assets prove code wiring, not that each scripted event definitely fires on every phone or that all artwork is polished. There were recent user reports of missing cutscene/fox and missing roast pickup after regressions. Preserve explicit smoke checks for all three before declaring a release sound.

## 5. Gameplay, progression and replayability

Core loop: input left/right across three fixed lanes, gather food, avoid hazards, accumulate rating/score and discovered food, encounter events, crash and replay. Difficulty uses distance/biome based procedural patterns with deterministic seeds, reachability budget and capped speed. Avoid arbitrary unfair obstacle stacks, inconsistent source/collider sizing or visually invisible hazards during rain.

**Proposals, not shipped:** jump (swipe up) / slide (swipe down), swipe left/right in place of taps; a large bird dropping a full-width log, with fair jump-only readability; a modular event director choosing occasional scripted/branching encounters; catalogue recipe discovery and rare foods (e.g. roughly 1 in 20 runs for certain special foods); Gary review/response effects; optional rewarded-ad continuation that never harms fairness or hides core content. First prototype, test controls and performance before committing to permanent mechanics or monetisation.

Recurring encounters should create memory and surprising replay outcomes **without** slowing every run to a cutscene. Use limited story event budget, priority/coexistence rules, rarity windows, eligibility tests and seeded replayable outcomes. Narrative beats should pause gameplay state cleanly, never leave spawn or pooling systems polluted on reset, and resume only in a verified hazard-free corridor.

## 6. Cutscene direction and authoring

The first hooded-man scene is a **first meeting**, not a callback. The reader's face stays hidden; no premature “yeah, used to be” exchange, identity reveal or exposition about eras. Tone: wry, warm, increasingly off-kilter rather than overt horror. Text must be legible on iPhone; keep safe areas and sufficient contrast. Cutscene visuals preserve in-game identity and perspective, while portrait-like art can be more detailed without changing characters. Reuse the cutscene studio and a data-driven scene schema rather than cloning cutscene runtime code. Review `gary-cutscene-project.json` for actual current dialogue; do not overwrite published dialogue with an older brainstorm transcript.

The iconic gift/lantern is **story design** until a runtime pickup, catalogue/inventory state, artwork and save policy are actually implemented. `gary-cutscene-project.json` and game state are separate responsibilities.

## 7. Performance, test and operational policy

- Test Play → Skip intro → running → lane moves → pickups (including roast) → shop night/rain → decay → reader/cutscene → fox → crash/rating → replay → Food Catalogue; then repeat after pause and page hide.
- Actual active animation frame deltas and on-phone 60/120 Hz smoothness must be profiled. Native/synthetic Canvas timing, although useful, is **not** physical iPhone FPS evidence.
- Preload and decode images/audio safely with visible start feedback. Control memory, pooled objects and render draws. Never allocate scaled canvases/atlases during the first live decay progression.
- Preserve existing save keys, audio unlock on first gesture, cache-busting asset/script query params and production references. Validate script dependency order and only one active engine. Clean obsolete files only after a reliable **reachability audit** and safe rollback; archival engines/installer backups are not inherently unused.
- Every production change: snapshot exact branch+file SHAs; make smallest diff; stage and run native tests; render at 360×640 in day/night/heavy rain; test Safari on real phone; promote as one non-force commit and record rollback. No destructive multi-step uploads to `main` from an untested installer.
- Previous failed installs included SHA/tree mismatches. New Git trees should use GitHub's own returned SHA; do not compare it to a home-rolled predicted digest. Git refs advance **non-forced** only. If branch head changes, stop with no publication and re-audit. Log resulting commit SHA and previous commit SHA for rollback.
- Never store a GitHub PAT in repository, localStorage, console, query strings or uploaded documents. Safari installers should use it only for direct `api.github.com` calls, then clear the input.

## 8. Asset QA gate and review matrix

`ASSET_QUALITY_GATE.md`, `asset-quality-manifest.json`, `tests/asset-quality-gate.cjs` and `.github/workflows/asset-quality.yml` specify the proposed/installed *executable* gate. It checks new or modified PNG/WebP assets for parseability, source dimensions, transparency, sprite sheet divisibility, alpha padding and foot registration where metadata exists. Unregistered image changes should fail with a message asking for manifest registration; a missing asset referenced in the manifest is a fail when checking all entries. Geometry and material consistency must still be reviewed in the 360×640 renderer and marked PASS/FAIL/UNVERIFIED.

`STYLE.txt` sets rules; `ASSET_GRID_PROMPT.txt` defines review; the executable gate tests machine-checkable parts. **Do not claim artistic checks or on-phone tests ran just because the automated job is green.**

## 9. Producer roadmap (not commitment)

1. **Stability first:** stable intro/transitions with no white fringe; never-blank first frame; proper fox/cutscene/roast triggers; no decay-start hitch; genuine alpha and consistent lane-change character scale; asset gate active. Measure.
2. **Complete street-to-forgotten-road story:** smooth shops closing once, natural keeper motion, sequential rain and ground loss, roadworks readability, coherent first encounter/cutscene, correctly paced fox.
3. **Playable bridge/underpass and wilderness:** approved orthographic, lane-aligned bridge art (all three lanes), terrain transition, fair hazards, low rendering cost. The bridge is still not confirmed live by the 19 Oct code audit.
4. **First great reveal:** distinct but cohesive Victorian environment with its foods, shopkeepers, sound and subtle story continuity. Do not spoil the premise in onboarding. Plan route length for a full-length run rather than every playthrough requiring excessive forced dialogue.
5. **Extend replay value:** rare meals, discoverable catalogue, event pools, optional jump/slide only if they demonstrably improve control/gamefeel; then potential later historical chapters and commercially appropriate, non-intrusive monetisation.

## 10. Handoff contract for every future ChatGPT chat

When asked for *any* Gary Eats! image or edited sprite, retrieve the **latest repository** `AGENTS.md`, `STYLE.txt`, `ASSET_GRID_PROMPT.txt`, this master reference, relevant live source and approved gameplay/art references **before generation**. Where direct retrieval or visual reference is unavailable, label checks UNVERIFIED rather than guessing. New character/prop art must fit exactly the existing 360×640 road camera and registered source-to-world scale. After creating/editing, run the executable gate where available, inspect full sheet and runtime preview, and record which tests actually ran. The `AGENTS.md` prompt supplements but does not guarantee retrieval in a separate ChatGPT chat; place the same trigger in ChatGPT Project instructions.

For coding tasks: fetch current `index.html` script ordering and main branch SHA, preserve all existing encounters and user saves, stage, verify with tests and provide a rollback, never pretend a repository file was updated if GitHub refused write access. Prefer one narrow change per revision and one atomic commit.
