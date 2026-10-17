# Last Orders bench and discovery upgrade — 17 October 2026

## Implemented
- New `gary-street-mystery.js` controller and transparent eight-frame `gary-mysterious-bench.png` (4 columns × 2 rows; 384 × 512 cells). Bench-foot registration compensates for source-cell offsets without rescaling individual poses. Stable actor ID: `hooded-reader`.
- The high street's outgoing section begins after heavy rain (rainMix ≥ .8) and shutter closure (shutterMix ≥ .95). This treats the whole day/night/rain high street as the first environment. Existing daytime and night timing stays intact.
- Only future, entirely offscreen shop segments change. One side empties first, then both; the bench sits two segments after clearing starts. The emptied outgoing street continues after the cameo, pending a future biome controller.
- New rows stop during the cameo approach. Existing items finish naturally. Slowdown is permitted only after every active hazard clears, and only near the bench. Speed eases to 72 design units/second, with lane controls active. It eases back after the bench passes; the spawn accumulator resets for a fresh approach gap. Rain itself does not otherwise change speed.
- Animation starts when the complete figure is inside the screen beneath the HUD and rain is present. Frames 1–6 play once (2.7 seconds total); frames 7 and 8 alternate every .7 seconds. The fixed simulation owns time; pause/hide freezes it. Resets once per new run. The actor remains scenery: no collision, dialogue, lantern, gift or reward.
- New discoveries display a short, nonblocking banner. Notices queue, pause with gameplay and never repeat for an already-found food. Catalogue tiles have text NEW markers and a border; the menu button reports unread discoveries. Viewing and closing the catalogue acknowledges them. Existing saved counts migrate without resetting progress. Storage remains local to the browser; unavailable storage falls back to memory.
- Loading gate waits for the new sheet to load, validate and decode before enabling Play.

## Preview / release
`gary-last-orders-preview.html` uses the staged runtime and catalogue. Its Rainy ending button skips directly to the cameo approach; Discover food exercises the real pickup handler. Preview food progress uses `gary-eats-last-orders-preview-food-v1`, separate from the production save. Reset preview foods clears only that preview key.

The installer publishes the preview first, then promotes the tested production files in one commit. It records original and installed blob SHAs for rollback and refuses incompatible source or concurrent changes. `game.js` and `gary-game-config.json` are preserved.

## Validation
- Syntax and unique file/patch guards: PASS.
- Pure simulation tests: weather/readiness triggers, future-only shop removal, safe slowdown, all frames, idle loop, pause/dry-clock behaviour and reset: PASS.
- Real engine in jsdom + native Canvas: startup/Play/Skip, hazard clearing, slowdown, complete animation/idle, pause, reset, existing-save migration, first-only notification and unread persistence/acknowledgement: PASS.
- Rendered at 360 × 640; hood/umbrella readable on the left pavement without entering the road: PASS.
- Physical Safari/iPhone layout, touch/audio and sustained performance: UNVERIFIED; use preview before promotion.
- Production deployment: UNVERIFIED until installer promotion and GitHub Pages rebuild.

Tests: `node --test tests/core.test.cjs tests/mystery.test.cjs`. Integration: install test dependencies `jsdom` and `@napi-rs/canvas`, then `node --test tests/last-orders-integration.test.cjs`. Test dependencies are not shipped to browsers.
