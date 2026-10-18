# Gary Eats! Cutscene Studio V3

The narrative UI is a horizontal banner covering one third of the 360 × 640 game view. It slides in sideways while the remaining world is dimmed by 20%. The game stops safely; the bench animation completes and Gary's foot position reaches the reader before the first scene begins. Closing or skipping returns to the same world and clears any queued obstacle backlog.

The character artwork uses separate registered sheets. Gary's six-frame supplied talking sheet keeps its approved rear three-quarter view, face, clothing and clipped microphone. Talking frames animate while that speaker's text is revealed; punctuation, waiting, other speakers and completed text use the resting frame. This is simulated speech, not audio lip-sync. The hooded man never reveals a mouth or face.

## Mobile authoring

Open gary-cutscene-studio.html. Edit dialogue, reorder beats, select held frames, sequence frames during pauses, add characters and upload registered sheets. Set scene triggers and preview at full phone size. New and duplicated scenes are disabled until deliberately enabled. Drafts are stored in this browser using IndexedDB; export a project backup for durability and transfer between origins/devices. The JSON includes uploaded artwork, never tokens.

Frame numbers in the editor start at 1; JSON/runtime indices start at 0. Columns and rows must divide the supplied image exactly. Keep one scale, body centre and baseline across a sheet. Advanced registration controls set source body height, head top and body centre; they do not resize individual frames. Long speeches are paged at word boundaries. Each pause is tappable. Reduced-motion mode shortens entry/exit and shows text immediately.

## Publishing

Install once using the guarded installer. It checks original game-runtime.js and index.html blob SHAs, stages files, and updates the branch once without forcing it. If another developer pushes during publication, the update is rejected. Restore changes only the engine/entry files and checks their installed SHAs first.

In Studio, export your local draft before loading the latest live project. Load live project, edit, then publish. Publishing checks the loaded project and asset SHAs and refuses stale changes. GitHub tokens are operation-only, sent directly to api.github.com, cleared after writes and never persisted/exported. A repository-scoped token requires Contents read/write. Never paste a token into chat.

## Triggers and future chapters

- Alignment: actor ID hooded-reader is installed and supplied by the existing bench controller.
- Distance: total world distance units in the current attempt.
- Elapsed: active play seconds in the current attempt.
- Event: the game calls window.GaryCutscenes.signal('event-name').
- Stage filter: high-street, night-high-street, rainy-high-street or forgotten-road. For a future chapter the game calls window.GaryCutscenes.setStage('stage-name'); author matching scene data. The editor does not create a new biome, game actor or game event merely by naming one.

All triggers are once per run and hazard-gated. Incoming rows stop before distance/time/actor scenes; existing hazards clear naturally. The manager prewarms the next stage scene and retains at most two prepared scene views. The first scene is decoded before Play is enabled. If later artwork fails, the game remains paused with a retry control. Restart resets narrative progress; switching apps pauses text and talking frames.

## Files

gary-cutscene-project.json holds declarative content; gary-cutscene-runtime.js renders and schedules scenes; gary-cutscene-studio.js/css/html provides authoring; gary-cutscene-publisher.js handles guarded GitHub writes. game-runtime.js owns collision, pause and state transitions. No eval, framework, paid service, invented narration, item handover or time-travel reveal is added.

## Validation limits

29 automated tests pass, including a logic-only execution of the patched real engine through the full bench approach, all eight introduction frames, exact alignment, world/text pause and safe resume. They also cover script preservation, paging, mouth timing, action ordering, once-per-run triggers, hazard gating, import validation and guarded publication. Mock DOM/canvas fixtures do not verify browser layout or device performance. Browser/device preview automation is unavailable in the build environment. Full Safari/iPhone layout, publishing with a real owner token and end-to-end runner playtesting remain required; they must not be described as already verified.


## Natural banner revision (4)

The banner remains one third of the portrait screen. Its art now occupies 68% of the banner and its compact dialogue strip 32%, with automatic two-line pages. The supplied character portraits use a 255px full-body scale in the banner crop; source resolution does not change game-world sprite scale. Gary’s talking frames and the approved dialogue are preserved.

By default, installed scenes copy the exact region of the live game canvas beneath their art strip when the banner opens. The copy keeps the source width, camera, kerb, bench, weather and lighting instead of using a separately generated background. The selected background is only a fallback/editor reference; turn off “Match the live game” to use it deliberately. The frozen crop is refreshed on resize. The portraits remain foreground dialogue layers, not replacements for the world actors.

`play.html` runs the actual integrated game renderer and existing art, loaded from the live game’s GitHub Pages asset URLs. The review starts near the bench so its umbrella introduction completes before conversation. This shortcut is confined to `preview/game-preview.js`; the installer ships the normal game engine. The preview needs an internet connection for the existing game artwork.

The installer can update the previously supplied V3 engine only when its guarded file hashes match. It preserves existing scene data/artwork and the original restore point. Modified engine or tool files stop the update.

Validation: 30 automated logic checks pass, including source-canvas crop geometry and the actual engine’s encounter lifecycle. Real Safari layout, external asset loading and token-based installation have not been device-tested.


## Meeting-point placement (revision 6)

Alignment scenes now anchor the banner at the actual meeting point, with its bottom 8 design pixels below Gary’s feet. This covers the world characters’ full silhouettes rather than floating above them. Canvas offsets inside taller phone viewports are included in the placement and background crop. An older alignment scene saved with middle placement also follows the meeting point; explicit top/bottom placements remain available.

The dialogue strip is reduced from 36% to 32% of the banner, retaining the same font size and up to two lines per page. Artwork receives 68%. During entry/exit, the world character layers fade with the banner. While dialogue holds, only the foreground cutscene characters render. A separate actor-free pass captures the ground and rain, so duplicate Gary/reader sprites cannot be baked into the banner. The combined seated bench/reader sprite returns after dialogue; the existing umbrella introduction and foot-alignment trigger remain unchanged.

The Safari preview start-button test uses the real ground controller and confirms dialogue within ten simulated seconds. Engine tests check that both world character draw calls are absent during dialogue and from the crop, and that their visibility returns on completion. Real iPhone layout is not automated here.
