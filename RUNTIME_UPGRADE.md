# Mobile runtime upgrade — 16 October 2026

Status: implementation tested locally; publishing was blocked by GitHub integration permissions. The Safari preview is
`gary-runtime-preview.html`. It loads the same new runtime proposed for release,
with snapshots of the proposed data and catalogue changes. The existing
`index.html` and live engine remain the production baseline until promotion.

## What the source audit found

Baseline main commit: `8f250275fd747d9bc522b5c9b116c9b62b319754`.
The actual active engine was `game-sidestep-no-ghost.js`, not `game.js`.
The existing game already multiplied movement by elapsed seconds, used one
named state variable, capped DPR at 3, recycled rain objects, and baked several
light textures. Those parts of the supplied critique were inaccurate or incomplete.
No mobile performance trace established garbage collection as the cause of
reported stutters. This change reduces avoidable allocation/storage work; it
cannot promise zero stutter or a particular frame-rate improvement.

## Implemented

- `game-core.js`: 60 Hz fixed simulation, bounded six-tick catch-up after stalls,
  interpolation alpha, reusable pools, relative swept contact detection.
- `game-runtime.js`: preserves the current four-frame sidesteps, their size
  calibration and 320 ms timing, pickup sound, intro bridge, scoring/spawning,
  rain, shutters and published shop settings. It is a complete successor to the
  active engine, not a patch to the archived `game.js`.
- Read-only interpolated lane/road/item/star/rain coordinates for smooth display
  on screens rendering between simulation ticks. Authoritative collisions use
  simulation coordinates. Artwork frame selection remains discrete.
- Precreated pools: 96 items, 48 floating score effects, 128 stars. Stable active
  compaction replaces hot-loop filter/splice. Every reused field is reset.
  Decorative effects may be dropped at capacity; a full item pool retries the
  entire row rather than silently dropping a hazard. Rain stays recycled.
- Player ground hurtbox half extents: 8 x 8 design units. Mushroom contact:
  12 x 12; fork: 8 x 14. Combined hit thresholds are therefore 20 x 20 for
  mushrooms and 16 x 22 for forks, versus the old 27.5 x 25.4 thresholds.
  Food retains its generous pickup sensor. Swept tests account for movement
  within a tick. Head/body hitboxes are inappropriate for the road-plane depth
  convention and are deliberately not introduced.
- Explicit state handler table with legal transitions, enter/exit hooks and
  per-state update/render dispatch. Pause button and explicit Resume overlay;
  hiding the page pauses play, narration, transitions and crashes, with no
  background-time catch-up. Delayed intro callbacks remain state-guarded.
- Main canvas retains responsive DPR scaling capped at 3. Static building and
  cobble crops are cached in up to 64 detached canvases at backing-store scale;
  caches clear on resize. Dynamic lighting, keepers, props and shutters stay live.
- Catalogue writes batch after a 750 ms window, then flush on page hide. The
  in-memory discovery count updates immediately. A force-quit before the flush
  can lose the most recent pending count, as with any deferred local save.
- Removed the optional near-miss vertical tick mark that could appear as a
  white line. Removed a sidestep metrics array allocation from every render.

## Verification and remaining acceptance

- `node --test tests/core.test.cjs`: eight tests, including identical distance
  over 10 seconds at 30/60/90/120/144 Hz, catch-up bounds, 10,000 pool reuse
  cycles, and swept collision edge cases.
- `tests/browser-smoke.cjs`: Play/Skip/entrance, pickup, crash/game over, restart,
  rapid lane reversal, pause/input guards, paused narration callbacks, DPR 3,
  viewport resize, and a five-minute simulated rain/shutter soak with bounded
  pools and no missing items. The soak clears imminent hazards to exercise
  later presentation continuously; it does not assess natural survival balance.
- Browser automation uses Chromium, not a physical iPhone. Safari/iPhone feel,
  sustained frame pacing, battery use, and the new collision generosity still
  require a phone playtest. No on-device profiling claim is made.
- Optional read-only counters: append `?debug=1` and call
  `GaryRuntimeStats.snapshot()` in developer tools. Test controls are injected
  by the test runner only and do not ship in runtime code.

## Promote or revert

The accompanying HTML installer promotes the tested preview by updating the real
`index.html`, `game-data.js`, `food-catalogue.js` and developer handoff documents.
It loads one engine only: data, core, catalogue, intro bridge, runtime.
Do not run a historical sidestep installer after promotion: those installers
may switch the entry point back to an older runtime.

To revert after installation, use Restore in the installer or revert its installation commit. The previous runtime
and sprite assets remain present, and the preview-only additions do not affect
the production entry point. No shop calibration or artwork files are changed.
The six-frame sidestep request is separate: this upgrade preserves the exact
four-frame artwork currently on main and makes no claim to install other art.
