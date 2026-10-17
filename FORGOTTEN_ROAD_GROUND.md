# Gary Eats! — Forgotten Road Ground Evolution V2

## Shipped by this upgrade
This version retains the original cobble master `IMG_7141.webp` and the complete existing cobble variant set, with their original quadrant assembly and 60-design-pixel render cells. All new decay is transparent PNG artwork layered on top of the existing pavement and road; no cobblestones are enlarged or regenerated. The existing 360×640 canvas, three-lane 150px road, movement, collision and pickup systems remain unchanged.

Assets (512×512 PNG with actual alpha):
- `art/forgotten-road/decay-light.png`
- `art/forgotten-road/decay-medium.png`
- `art/forgotten-road/decay-heavy.png`
- `art/forgotten-road/decay-kerb.png`

`gary-road-evolution.js` V2 world-anchors their occurrence to deterministic positions and clips them in the outer-cobble passes and one final pavement-plus-road pass after the live pavement renderer; the same decal straddles the kerb, avoiding an abrupt stop or double opacity at the pavement boundary. On the left roadside, the kerb growth artwork is mirrored. The centre lane stays comparatively clear. No per-frame sprite creation or randomness is used.

## Encounter-driven timing
The active runtime calls `GaryRoadEvolution.trigger(view.distance, mystery.footAt(view.distance))` when the hooded-reader mystery signals that the street has begun clearing. The second argument is required: it pins the transition to the bench's actual world-coordinate entry, not an arbitrary timer.

A gentle amount of light moss first appears about 1,400 design-world pixels before the bench reaches the top of the screen. Medium moss develops through the shuttered, increasingly empty street. Dense/heavy moss is withheld until the final short approach to the hooded reader, and becomes fully established around and after the encounter. This progression is spatial, so objects never jump between states as they scroll.

## Bench calibration
The original newspaper `bench.png` prop is rendered with `DETAILS` height cap = 100 design pixels. The mysterious `gary-mysterious-bench.png` eight-frame sheet now uses `GaryStreetMystery.SPEC.height = 100` (down from 128) without changing its source 384×512 frame dimensions, individual foot anchors, eight-frame animation or last-two-frame idle loop. Its screen-scale is now compatible with the original bench asset.

## Debug & QA
Live URL: https://tryingafewnewthings.github.io/gary-runner/
- `?roadstage=0` — original clean surface.
- `?roadstage=1` — scattered light moss.
- `?roadstage=2` — growing light/medium.
- `?roadstage=3` — established medium and kerb growth.
- `?roadstage=4` — late medium, just before heavy.
- `?roadstage=5` — full post-encounter overgrowth for inspection.

QA on an actual phone in day/night/rain: look for true PNG transparency, no white halos, small underlying cobbles unchanged, no repeating-square seams, left/right kerb growth, centre-lane readability, no texture popping when the street scrolls, bench matching normal seat scale, and no lost collision responsiveness. The six forced stages are illustrative art checks and must not be interpreted as separate playable biomes. Unlock logic, forest scenery and new historical-food systems are outside this upgrade.

## Rollback
The Safari installer publishes one Git commit on the current default branch. The previous commit SHA is shown in its log. Roll back by reverting that commit in GitHub (preserving any subsequent independent work). Do not delete the original `game.js` or `game-data.js` baselines.
