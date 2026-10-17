# Gary Eats! — Forgotten Road Ground Evolution V1

## Status
Installer-only until installed through `gary-road-transition-installer.html`. Installation adds `gary-road-evolution.js`, hooks the live `game-runtime.js` renderer, and loads the module from `index.html`. No collision, speed, spawn or three-lane geometry changes.

## Design geometry
Portrait design canvas 360×640. Road from x=105 to x=255 (150px wide, 3 lanes × 50px). Pavement strips 16px. Shop display footprint 89×236px. Repeating original cobble quadrants occupy 60×60 design-pixel cells. Overlay stage art is built in 60×60 offscreen canvases and cached after first visible use.

## Six visual stages
0. Original high street: preserve approved textures.
1. Wet & neglected: subtle stains and puddle flecks.
2. Cracks appear: thin fractures, sparse moss.
3. Broken surface: missing mortar, chipped tarmac, exposed earth.
4. Overgrown: darker soil, weeds, leaf litter, moss creeping inward.
5. Wilderness road: roots, low vegetation, mud and old stone; running lanes remain readable.

## Trigger and transition
After the hooded-reader mystery system begins clearing the street, record a one-time `start` depth slightly ahead of the current world position. Blend adjacent stage overlays over 3,000 design world-distance units using a smoothstep progression. Texture variations use deterministic world-cell hashes; no frame-dependent randomness and no allocations during gameplay after initial caching. Existing original cobbles and tarmac stay underneath, so the first implementation is a non-destructive overlay system. No new large texture downloads.

## Preview / QA
After installing, append `?roadstage=0` through `?roadstage=5` to the game URL to force any visual stage. `?roadpreview=1` accelerates the beginning only after the street event has triggered. Check legibility of lane markings, shop collisions, mobile Safari frame rate, no visible cell pops as the ground scrolls, reset on retry, and clarity in heavy rain. The stage-5 overlay is a prototype requiring further art direction before declaring a complete forest biome.

## Production intent
This environmental deterioration belongs to the Forgotten Road transition before wilderness and the unrevealed Victorian time-travel reveal. Do not introduce Victorian/Roman artwork in this first ground pass. Keep seamless narrative and art coherence with STYLE.txt and PROJECT_STATE.md. Visual progression is cosmetic; gameplay stays accessible and deterministic.
