<!-- GARY_EATS_REFERENCE_20261019_START -->
19 October 2026 — cross-system handoff
The 18 Oct fox is present in current index.html via gary-fox-encounter.js; it is scheduled AFTER the first hooded-reader bench dialogue and safe corridor. SPEC in active source: probability .9, 3.5s lead-in threshold, minSpeedRatio .8, bush draw 224, fox draw 80, 256px registered cells and baseline y220. Art/fox/registration.json is the exact export source; do not mirror/resize individually. Fox stays on verge and is NOT a collision obstacle. The stolen 16-unit roll must disappear from ground exactly when carried; theft must not count toward attainable food/rating.
The first bench meeting must remain the game's first cutscene, even if encounter pacing changes. New foods: half-eaten sausage roll and custard cream. Preserve roast and ordinary hazard patterns. The eventual bridge/underpass boundary remains planned and needs independent art, logic and quality acceptance. New sprite corrections should update asset-quality-manifest.json and pass visual in-game animation review.
<!-- GARY_EATS_REFERENCE_20261019_END -->

# Fox encounter implementation


## Fox encounter V2 — 18 October 2026

Applies after installing the Fox Encounter package. Adds a once-per-run, non-hazard fox event after the bench has passed off screen and dialogue has completed. Stops new hazard rows, waits at least3.5 active seconds and until all hazards clear, then reveals a small16px sausage-roll pickup in the left lane. The encounter targets80% of the score-adjusted normal speed and never lowers actual speed below that floor. Its action is retimed to finish on screen at the faster pace. A224px bush canvas gives approximately196px of visible foliage, tall enough to conceal the80px fox, with a shared ground anchor and front foliage occlusion.

The outcome is sampled once:90% fox theft,10% no fox and roll collectible. On theft the fox emerges from a left-verge bush, runs to the roll, lowers its head, grips/lifts it, pivots, and runs back behind that bush. The ground roll disappears on the exact first carrying frame. All later fox frames include the roll; no second mouth overlay is drawn. The food uses normal pooled collection and awards no points/discovery when stolen. Scripted theft is removed from the rating's obtainable-food denominator. Pause/hide/cutscenes stop its active clock. The event cannot retrigger until a new run. After departure a short caption reads “Fair enough. He was here first.”

Both new foods are included: custard cream5pts/36px display box and half-eaten sausage roll10pts/42px display box, registered512px transparent PNGs. After the bench, normal kebab/fish slots alternate these foods. The event roll uses a smaller constant16px box, on ground and in mouth, to fit the fox. The fox is not a collision obstacle. Roast rewards, score multipliers, existing lane geometry, normal hazard patterns and installed cutscene source remain intact.

Assets: fox-approach6frames, fox-snatch4frames, fox-turn3frames, fox-return6frames; equal256px square cells in horizontal sheets; bush512px. One uniform scale per clip, consistent body/ground registration and generous alpha padding. Source resolution is independent of runtime size. Generated key poses are played as a compact stylised animation, not claimed as fluid hand animation.

The actual bridge/wilderness boundary remains future work. Do not imply the bridge itself was added. Keep this module constrained to the Forgotten Road when a formal biome boundary is introduced.


Validation:21 focused automated checks cover prerequisites, missing art, hazard clearing, single probability draw, theft timing at30/60/120Hz, early collection, renderer purity, reset, both actual-engine scoring routes, pause/resume, both Safari preview Start-to-Replay routes, installer readiness/conflict/already-installed/V1-upgrade guards, 80% speed-floor checks across normal speeds200–300, and faster action timing at30/60/120Hz using the real ground controller. Exported PNG dimensions, transparent borders and frame padding are checked separately. This does not establish physical iPhone FPS or browser layout.

The installer uses exact source and new-file hashes and one non-forced atomic Git commit. It refuses concurrent/newer code. It includes the two foods if they have not yet been installed. Supports the original game and the complete V1 fox install as two separate exact baselines. If the separate food installer was already used, ask for a refreshed fox installer instead of bypassing guards. Existing GaryCutscene code and authored dialogue are preserved.
