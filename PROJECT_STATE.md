# Gary Eats! — Project State and Developer Handoff

**Verified against the public `main` repository:** 17 October 2026
**Repository:** https://github.com/tryingafewnewthings/gary-runner  
**Live game:** https://tryingafewnewthings.github.io/gary-runner/  
**Current visual editor:** `gary-studio.html` (Studio 3.1)  
**Purpose:** An accurate, resumable engineering and creative brief. **The repository code and published configuration always take precedence over this document.**

See `RUNTIME_UPGRADE.md` for the runtime audit, validation limits and rollback. The old `game-sidestep-no-ghost.js` remains the pre-upgrade rollback engine. Current production sidestep art is four frames; no six-frame art is installed by this runtime change. Pickup sound effects are active.

## 1. Product vision and design priorities

**Gary Eats!** is a mobile-first, portrait HTML5 Canvas runner and affectionate tribute to the food-review personality Gary Eats. Its tone begins warm, recognisably British and funny, then grows mysterious: daylight high street, night, heavy rain, deserted shops, a stranger, and eventually wilderness.

The goal is **a polished, complete game with a memorable identity**, not merely a technical runner or collection of graphics. Prioritise, in order: reliable play and intuitive controls; clear world art and animation; satisfying pickups/audio and risk-reward; the persistent food-discovery catalogue; then chapter-specific narrative and abilities.

**Proposed differentiator, not yet implemented:** The *Gary Review Effect*: unusual food discoveries or deliberate pickup combinations trigger recognisable review moments and modest gameplay reactions. Prototype and playtest before adopting as the definitive USP. Avoid feature bloat or pay-to-win-style progression. The catalogue currently records discoveries; it does **not** combine ingredients or craft recipes.

## 2. What is actually live

### Gameplay and presentation

- 360 × 640 design canvas, rendered responsively at device resolution; three 50-unit lanes centred at x = 130, 180 and 230, road x = 105–255. Gary's world reference is y = 540.
- Fixed-camera scrolling high street with 360-unit repeating street segments and 89 × 236 shop drawings; movement via left/right tap or keyboard. No jump/duck mechanic in regular play.
- Food pickups: `kebab` (5), `fish` (10), `roast` (25). Hazards: `fork` and `m` (mushroom). The higher-scoring dare row may be refused safely for a smaller reward. Three score-based `STRETCHES` pools and safe-lane preparation rules are active.
- Scroll speed starts at 200, increases with score and caps at 300. Spawning gaps have a lower bound; difficulty should come from legible patterns rather than an indefinitely accelerating road.
- Intro voice, themed music, separate six-frame walk animation, celebratory and crash art, HUD/captions, near misses, rating tiers, and the performance-based 1–10 end-of-run rating. Best score persists locally.
- **Food Catalogue:** the main-menu module `food-catalogue.js` generates a locked/discovered catalogue from `ITEMS` and stores discovered-food data in the browser's `localStorage` on that device. Currently three food types; no account/cloud syncing. New definitions can appear in the catalogue, but still require spawn patterns, artwork/fallbacks and tests to be obtainable.
- Day-to-night transition over the existing high street; warm window lighting and street lamp glow. Heavy rain, animated streaks, cobble splashes, additional darkness and shop shutters are implemented as visual effects. Rain is **not** a change in collision, scoring or running speed. `?rain=1` is a rain-preview route.
- The shopkeeper and window system reads the published `gary-game-config.json`: separate keeper-position offsets/motion, **independent keeper anchors**, green clipping masks, blue lighting panes, amber shutters and door-darkening regions for all six shops. Keepers are drawn after local/storm lighting so they are not washed out by the glow.
- **Cinematic start is enabled on the main game's `index.html`.** At the time of review, it loads `gary-intro-transition.js` and `game-runtime.js`. The 4-frame sheet moves Gary from the talking portrait into the normal 6-frame walking animation. The yellow landing ellipse was removed. The unmodified original `game.js` remains in the repository for rollback.

### Not live yet

- The hooded-reader environmental cameo is live. Its dialogue/cutscene interaction, lantern reward/charges, and wilderness chapter remain **specification only**, held in `DEVELOPMENT_PLAN` at the end of `game-data.js`.
- The *Gary Review Effect*, special recipe combinations, more discoverable foods, chapter-specific gameplay mechanics, and an expanded food/recipe system have been discussed but **not implemented**.
- There is no account-based save system, achievements backend or cloud inventory.
- New custom eight-frame splash sprites and cinematic cutscene artwork may exist as concepts or drafts; they are not presumed to be live merely because a design was discussed.
- **Cobblestones currently use 60 × 60 destination cells** (`WORLD.cobbleCell` in `game-data.js`). This is the value checked in the 16 October baseline; verify the source before changing it.

## 3. Active code and file responsibilities

| File | Current responsibility |
| --- | --- |
| `index.html` | Live browser entry, game UI/overlays, active script loading. Uses `game-runtime.js`; older engine files are retained for rollback. |
| `game-data.js` | Authoritative `WORLD`, `GARY_SPRITES`, `STREET_ATLAS`, `BUILDINGS`, `KEEPERS`, `SHOP_PANES` fallbacks, `COBBLE_KINDS`, `ITEMS`, `DETAILS`, `STREET`, `STRETCHES`, `WEATHER`, captions and design-only `DEVELOPMENT_PLAN`. |
| `game.js` | Retained working original engine and **rollback baseline**; do not delete or overwrite. |
| `game-runtime.js` | Active engine: fixed simulation, interpolated rendering, pooled items/effects, guarded states, pause/resume, current sidesteps/audio and cinematic intro. |
| `game-core.js` | Browser-independent fixed clock, pools and swept-contact primitives. |
| `gary-intro-transition.js` | Optional 4-frame cinematic renderer/controller, runs before active engine. Graceful fallback when missing/invalid. |
| `gary_transition_sheet.png` | 1536 × 512, four horizontal 384 × 512 animation cells, true transparency. |
| `gary-intro-test.html` | Independent playtest page; its script versions may differ from live `index.html`. |
| `food-catalogue.js` | Main-menu discovery UI, locked tiles, browser-local persistence and `GaryFoodCatalogue.discover()` interface. |
| `gary-game-config.json` | Published per-shop calibration and appearance settings. **Preserve these measured values.** |
| `gary-studio.html` | Studio 3.1 for editing/publishing supported shop settings; local draft/undo and conflict checks. Not a general-purpose engine or asset editor. |
| `STYLE.txt` | Visual, geometry, layer and animation acceptance contract. |
| `ASSET_GRID_PROMPT.txt` | Review checklist/prompt for existing/new sprite assets and screenshots. |
| `GAME_STATUS.txt` | Short entry point and status summary for a new developer. |
| `ASSET_GRID.json` / `ASSET_GRID.png` | Historical asset-review snapshots; **not** a substitute for current source definitions. |

**Observed script loading on `index.html` at audit:** `game-data.js?v=runtime1`, `game-core.js?v=1`, `food-catalogue.js?v=2`, `gary-intro-transition.js?v=2`, `game-runtime.js?v=1`, with a comment recording `GaryIntroOriginal=game.js?v=102`. These are **observations, not fixed version contracts**. Read the current HTML again before any release and increment the affected file's cache version after editing.

**Dependency order:** `game-data.js` and `game-core.js` must execute before the catalogue and engine; `gary-intro-transition.js` must execute before `game-runtime.js` if the cinematic route is active. Do not load **both** engines together.

## 4. Runtime architecture and critical contracts

### Data and game states

`requestAnimationFrame` renders independently of 60 Hz fixed simulation ticks. The catch-up budget is six ticks; interpolated presentation coordinates are separate from collision coordinates. State update handlers own gameplay mutations. Drawing must not award pickups, alter saves or advance cutscenes. The cinematic-enabled engine uses `menu`, `intro`, `intro_transition`, `play`, crash states, `paused` and `over`. A guarded handler table owns legal transitions and enter/exit hooks. Page hide pauses the game and requires explicit Resume. While `intro_transition` runs, ordinary spawning, scoring and movement are paused until control resumes.

Reset restarts the run and score, but **must not erase catalogue discoveries or published shop calibration**. Shop settings load asynchronously from `gary-game-config.json` with safe fallbacks: do not assume the config has loaded synchronously during initial frames.

### Camera, pavement and cobbles

`WORLD` uses 360 × 640 game coordinates, not source image pixels or retina backing pixels. Road and kerb positions must remain consistent. `drawCobbles()` in the engine uses a **single scrolling world grid** and a quadrant of each WebP cobble texture per cell. Current value is `WORLD.cobbleCell = 60`; one cell corresponds to a quadrant, not an entire source image. When changing cell size, keep left/right grids phase-locked to the world scroll and recheck joins between mixed textures, ground-detail segments and kerbs. Increasing cell size preserves grid geometry but cannot fix an intrinsically nonseamless texture.

### Shop geometry: no more hidden coupling

Every shop sprite is rendered in an 89 × 236 destination rectangle. The active per-shop published overrides in `gary-game-config.json` are authoritative:

- `shopKeeperAnchors[shop]`: independent base x, y, width and height for keeper placement.
- `shopKeepers[shop]`: offsets, scale, idle/cheer amounts and `clip` (green visibility mask).
- `shopWindowPanes[shop]`: blue interior lighting/glass region; moving it must not shift the independently anchored keeper.
- `shopClosures[shop]`: shutter and optional door-light rectangles, plus closure duration.

`SHOP_PANES` in `game-data.js` supplies **legacy/default values** only. Its fractions are **not** the current manually calibrated rectangles. Never overwrite the JSON with old values or combine gold keeper anchors and blue window-light geometry again. Preserve each shop's distinct glass and shutters.

### Assets and animation

- Talking intro: `gary_intro_sheet.PNG`, 4 columns × 2 rows, cell 384 × 512.
- Walk: `gary_walk_sheet.PNG`, 6 horizontal equal frames; see `GARY_SPRITES.walk` for timing and actual source bounds.
- Cinematic: `gary_transition_sheet.png`, 4 columns × 1 row, 384 × 512 each; code handles movement, scale, fade and matching the walking sprite.
- Shop atlas: `high_street_sprites.webp`, 2912 × 2688 source pixels. Do not casually recrop its `BUILDINGS`/`KEEPERS` arrays.
- Cobbles: `IMG_7141.webp` through `IMG_7148.webp` (base, weeds, light, sparse, dense, leaves, grime, cracked). All variants share the same grid contract.

Every new image must be reviewed at **actual 360 × 640 gameplay scale** in daylight and rain/night, not only in an enlarged asset preview.

## 5. Development safety: mandatory release process

**No direct-to-live, untested engine patch.** An earlier intro installer accidentally published an empty `game.js`; the engine was restored from GitHub history. Treat that as a process failure to prevent permanently.

1. **Establish a baseline.** Read the current `main` tree and record the original file sizes/SHAs and the `index.html` script order. Preserve `game.js`, `gary-game-config.json` and GitHub commit history.
2. **Stage new gameplay separately**, e.g. on a test HTML page using a distinct engine path. Never replace the working `game.js` with generated code without full source verification. Prefer a branch/PR when workable; publishing a test page is acceptable on an iPhone.
3. **Validate before upload:** parse JavaScript; check matching braces and exact patch anchors; verify all required symbols and image files; refuse empty/unexpectedly short source; check the relevant HTML references. Avoid dynamic execution, `eval` or Safari CSP-incompatible installers.
4. **Phone acceptance gate:** launch via Play; intro/Skip; transition; lane responsiveness; collect each food type; food catalogue save/reopen; near miss; crash/restart; day/night/rain; shopkeeper/window/shutter alignment; performance and audio.
5. **Promote only a tested build.** Keep one reliable rollback route. Update cache versions only for changed files, verify GitHub Pages deployment, close/reopen the Safari tab, and perform a production smoke test.
6. **Do not claim production success from a syntax check.** Record separately: syntax PASS, staged browser PASS, iPhone PASS, production PASS, or UNVERIFIED.
7. **Change one meaningful subsystem per commit/PR**; never overwrite the current studio JSON while modifying cinematic or food modules. Preserve drafts and allow rollback.

If an automated install step fails, **inspect actual GitHub contents and the latest commit before retrying**. GitHub write operations may be partially successful even when the installation UI reports failure.

## 6. Next development order

1. **Stabilise and document the activated cinematic branch.** Confirm the live entrance, Play/Skip, restart, fallback if the asset fails, and mobile performance. Retain the original `game.js` until the tested code can be consolidated deliberately.
2. **Complete the food-collection experience.** Catalogue UI polish, discoverability, a delightful first-discovery notification, accessible locked/unlocked states and clearly labelled food. Add new foods only with complete visual/collision/spawn definitions.
3. **Profile and playtest on iPhone.** Pickup SFX and 60-unit cobbles are active. Check the runtime upgrade's frame pacing, collision generosity, sound and quadrant seams at gameplay scale.
4. **Prototype one signature review mechanic.** Make food choices matter within a short 60–90-second vertical slice, without making the run unreadable or awarding automatic wins.
5. **Implement a robust biome/encounter controller** when the existing runner is stable: continuous rain/darkness, safe cleared corridor, temporary slow/stop, text cutscene, once-per-run gift, safe restart. Follow `DEVELOPMENT_PLAN`'s proposed guardrails but confirm timing on-device.
6. **Deliver lantern and wilderness** with readable hazards and recognisable camera/asset scale. Do not use darkness to make essential safe lanes impossible to identify.

## 7. Ownership and decisions still open

**Game direction:** owner chooses art/creative changes; no speculative design should be reported as shipped. **Developer responsibility:** inspect files, preserve working builds, design around iPhone-only workflow, present changes in plain English and demonstrate the exact behaviours that changed.

Open decisions include: definitive USP beyond discovery; whether the menu should call it a *Food Catalogue* versus a *Recipe Book* (there is currently no crafting); rarity, chapter-locking and review text for foods; exact later chapter pacing; stranger visual identity and lantern interaction; and whether to consolidate the two engines after the cinematic route is fully regression-tested.

**Source-of-truth rule:** when code, editor preview, config and this handoff disagree, verify and correct the live runtime/config first. Do not silently change the design contract to fit an inaccurate preview.


## Hooded bench and discovery upgrade (17 October 2026)
See LAST_ORDERS_UPGRADE.md for the new rain-driven end-of-street cameo, animation timing, safe slowdown, discovery banners and unread catalogue markers. The actor is environmental scenery with stable identity hooded-reader; interaction/lantern/wilderness remain future work. Preview and production verification are separate; use gary-last-orders-preview.html before promotion.

## Ground decay correction (17 October 2026, V3)
See FORGOTTEN_ROAD_GROUND.md. Original cobbles remain at 60px cells. Small 32–48px overlays cover both cobbled sides and pavement strips, with a maximum 12px road intrusion. Decay begins after settled night and develops over 30 active seconds; the stranger cannot schedule until 24 seconds into that progression and the storm/closure gates pass. Narrative state advances only in fixed gameplay updates. Old roadstage-only links no longer force immediate overgrowth; forced stages require debug=1. The former decay installer is retired to prevent reinstalling V2. Full wasteland scenery and later narrative chapters are not shipped by this ground repair.
