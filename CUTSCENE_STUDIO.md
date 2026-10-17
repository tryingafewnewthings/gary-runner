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
