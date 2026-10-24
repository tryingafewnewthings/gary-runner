# Gary Eats! World Explorer — visual QA

**URL:** `https://tryingafewnewthings.github.io/gary-runner/gary-world-explorer.html`

## Purpose

A Safari-friendly, read-only visual inspector using the **active game renderer** and the 360×640 logical camera. It does not create new art, edit gameplay, or replace the real game. The embedded game loads `index.html?debug=1&bridgepreview=1&worldexplorer=1` and the World Explorer API exists **only** in this isolated debug/preview session.

## Controls

- **Journey timeline:** scrub through five implemented inspection segments: daylight high street, night/rain street, stone bridge, wilderness transition, deeper wilderness. Segment positions are *visual review coordinates*, not a promise of a deterministic continuous game-distance map.
- **Checkpoint buttons:** jump to a region without playing.
- **Auto flythrough / Stop:** presentation-only advancement, without game physics or collision.
- **Weather:** natural story appearance or forced day/night/heavy rain.
- **Gary/HUD toggles:** isolate the artwork.
- **Screenshot:** export the actual rendered frame resampled to native logical 360×640 PNG.
- **12-view contact sheet:** render twelve checkpoint views into one 720×960 PNG for comparison.

## Limitations

The world is event-gated and procedurally authored. The timeline inspects implemented **environments**, not a complete linear replay of one run. The stranger, fox, cutscenes, and rare events depend on gameplay state and are not fabricated by the explorer. Future biomes are not included until implemented. Physical iPhone Safari validation and artistic approval remain separate from automated Chromium/WebKit QA.

## Maintenance

World Explorer source: `gary-world-explorer.html`, `gary-world-explorer.js`. Debug-only engine integration: `gary-difficulty-runtime.js` under `worldExplorerSession`. Browser smoke: `tests/world-explorer-browser.cjs`. Keep the logical 360×640 camera, gameplay rendering order, asset registration, and bridge geometry unchanged; never make debug preview behavior available in normal Play.

## Release gate

The pull request must pass Node tests, active-engine Chromium/WebKit tests, and the dedicated World Explorer smoke tests. Check screenshot quality and mobile touch behavior on a physical iPhone before marking the tool artistically approved.
