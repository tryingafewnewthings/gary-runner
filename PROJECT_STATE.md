# PROJECT_STATE: Gary Eats!

Source of truth for handoff between models. If a chat disagrees with the repo, the repo wins. This file describes the live tree on `main` as of 2026-10-03. `GAME_STATUS.txt` is an older blueprint (saved 2026-10-01, commit 0786856) and must not override this file or the current scripts.

Repo: `tryingafewnewthings/gary-runner` (public). Live page: `index.html`, served by GitHub Pages. Latest known tree commit before this file: `b7d7b514` ("Remove unreferenced cobble_weeds_sheet.jpg."). Script cache busters on the live page: `game-data.js?v=30`, `game.js?v=84`.

## 1. Project Overview & Premise

Gary Eats! is a mobile-portrait endless high-street runner, in the spirit of Subway Surfers, made as a love letter to YouTuber Gary Eats. The player is Gary, seen from behind with his head turned so the face stays visible: blue quilted gilet, blue knit jumper, microphone with a fuzzy windscreen. He stays low on a 360 by 640 canvas while a British high street scrolls down toward him.

Visual style is a painted British cartoon. Clean dark outlines. Semi-realistic, not cute, not pixel, not photo. Shops are flatter painted sets. Gary is the most realistic asset and his face is never simplified. One soft daylight, from the same side. Not a vanishing-point street: lanes are flat bands, shops are front-on with a little of the roof showing.

Core loop: three lanes, left and right only. Collect kebab, fish and chips, and roast dinner. Dodge plastic forks and mushrooms. Score raises speed toward a cap. Catchphrase captions and score tiers speak in Gary's voice. A late tier names his friend Danny ("I'll have to bring Danny here one day"). Danny is not a character in the run yet.

## 2. Current Goal

The handoff itself is the current task: this file is now the shared state for other models.

The last playable work, already on `main`, was street polish rather than a new mechanic:

- Pickup no longer freezes the street. Hit-stop was removed from the feel of a collect. A `hitStop` value may still be zeroed in reset and is unused.
- The bench is the seated reader: three frames in `bench.png`, cap 100, placed on the left pavement gap (`leftObject: 'bench'`).
- Pavement is painted cobble tiles (`cobble_base`, moss, weeds, light, sparse, dense, damp), not one `path.png`. The unused weed sheet `cobble_weeds_sheet.jpg` was deleted.
- A solid stone kerb covers the cobbles. Wear is a shifted copy of the same stones.
- Shops stay peeking so the next roof approaches instead of popping in. Segment height is 360px. Building height is 236px.

Do not start a biome until the floor and prop style agree with `STYLE.txt`.

## 3. Completed & Working

- Single mobile page. No engine, no framework, no build step. HTML, CSS, and plain JavaScript in strict mode. GitHub Pages serves the files.
- One canvas, logical 360 by 640, scaled to the phone. 2D context. Device pixel ratio capped around 2.5.
- One loop: `requestAnimationFrame` calls update then render. Delta is capped so a hitch cannot leap the street.
- States: `menu`, `intro`, `play`, `crash_fork`, `crash_m`, `over`.
- Gary stays at his lane x and y 540. The street scrolls. He does not run up the screen.
- Three lanes. Left and right only: A, D, arrow keys, or a tap on that half of the screen. No jump, no duck.
- Menu, skippable intro, run, crash, end card ("Proper Ruined!"), try again. Best score is kept.
- Food: kebab 5, fish 10, roast 25. Hazards: fork and mushroom. Near miss is +5 and the looked-up line "Close one."
- Road patterns live in `STRETCHES` (early, mid, late). A run picks a stretch, plays it, picks another, so the same eight rows do not loop.
- Score tiers: Absolute Rubbish, Bit Dry Needs Salt, Proper Decent Food, BEAUTIFUL!, I'll have to bring Danny here one day.
- Score lines in `EVENTS` at 25, 80, 160, 300 and 500. Captions are looked up. The run does not invent the line. `grin: true` uses the cheer picture.
- Gary walk is two frames, `gary_run1.png` and `gary_run2.png`. Legs swap a little. Arms hang and do not swing. Cheer and crash are separate pictures. Open and closed mouth pictures drive the intro.
- `gary_audio.mp3` is the intro voice. An analyser watches the track so the intro mouth can move. Skip goes to play.
- High street sprite sheet `high_street_sprites.webp` (2912 by 2688, loaded as `?v=8`). Six shops: Fish & Chips, Peri Peri Chicken, Bakery, The Red Lion, Butchers, Mallace Cafe. Keepers are clipped to the shop glass and hop when Gary draws level. Black mattes on keepers were removed. Roof gaps show cobbles, not a grey fill. Far-right sign is MALLACE CAFE.
- Street is an ordered plan in `STREET`. Each row sets left shop, right shop, and per-side gap objects (back, middle, front). A run starts at the first row and repeats. Most stretches have an object on one side only.
- Props drawn with a contact shadow: lamp (from the sheet), postbox, bin, bench, tree, A-board. Light from the left, so the shadow falls by side.
- Cobble variants and a solid stone kerb are drawn. Postboxes are capped so they do not tower over Gary.
- Food and hazard pictures: `roast.png`, `fork.png`, `mushroom.png`. Kebab and fish can fall back to drawn plates.
- Page chrome: yellow title, Play, Skip, Try Again. Page background `#0a0c14`. Title and primary button `#ffe600`.

## 4. Pending Tasks & Known Bugs

- `GAME_STATUS.txt` is stale. Do not treat its embedded copies of `index.html`, `game-data.js`, or `game.js` as live code.
- `game.js` is still one large file. Logic, input, rendering, and state are not yet split into modules. That split is a standard, not a finished job.
- Bench sits in the gap, but furniture on a flat painted pavement can still read as pinned to the wall. Floor and prop contact need another art pass before biomes.
- Bin, postbox and bench are nearer a model than the shops. Tree is flatter. Mushroom and fork are softer than the shops. Art lock says props sit between Gary and the shops, closer to the shop.
- Score lines at 25, 80, 160, 300 and 500 still open on the pickup that crosses them, not on a clean beat of their own.
- The roast between mushrooms is a toll, not a dare. A roast the player can refuse is the next real mechanic.
- One-tap restart polish is waiting until a run still starts cleanly after it.
- Biomes are wanted later only. A biome may change floor, weather, shop paint and local props. It must not change the camera, Gary, plate size, or outline.
- Danny is a name in a tier and a caption only. There is no Danny sprite, no table, and no table interaction.
- No dedicated pickup or crash sound effects yet. Intro voice is the only audio cue.
- A failed picture must not stop the loop. A bad caption path has frozen a run before. Do not pile unrelated changes into one commit.
- Odd filenames remain: `gary_closed.png.PNG`, `gary_open.png.PNG`. Do not rename them without updating every reference.
- `path.png` and `path_damp.png` are no longer in the tree. Do not load them.
- Cache: after a script or picture change, bump the `?v=` on that file and close the phone tab. The user tests on iPhone only.

## 5. File Architecture

Live code:

- `index.html` — the page. Stage, canvas, intro audio tag, menu, intro overlay, game-over overlay, and the CSS. Loads `game-data.js` then `game.js` with cache busters. This is the page GitHub Pages serves.
- `game-data.js` — lists only. `TIERS`, `FOODS`, `LINES`, `CAPS`, `EVENTS`, `DETAILS`, `STREET`, `STRETCHES`. Add a line, a prop, or a road pattern here without rewriting the rules.
- `game.js` — rules and drawing. Loop, state, input, collision, speed, captions, shops, keepers, cobbles, kerb, props, Gary, plates, HUD. Building and keeper crop lists live here (`BUILDINGS`, `KEEPERS`).
- `STYLE.txt` — art lock. Every new picture is checked against this before it is used.
- `GAME_STATUS.txt` — old blueprint. Historical only.
- `PROJECT_STATE.md` — this handoff.

Pictures and sound:

- `gary_run1.png`, `gary_run2.png` — walk frames.
- `gary_cheer.png`, `gary_crash.png` — cheer and crash.
- `gary_open.png.PNG`, `gary_closed.png.PNG` — intro mouth and menu portrait.
- `gary_audio.mp3` — intro line.
- `high_street_sprites.webp` — shops, keepers, and the lamp crop.
- `bench.png` — seated reader, three frames, cap 100.
- `bin.png`, `postbox.png`, `board.png`, `tree.png` — pavement props.
- `fork.png`, `mushroom.png`, `roast.png` — hazard and roast plate.
- `cobble_base.png`, `cobble_moss.png`, `cobble_weeds.png`, `cobble_weeds_light.png`, `cobble_weeds_sparse.png`, `cobble_weeds_dense.png` — pavement tiles.

There is no `index-new.html` on `main`. Do not recreate a second page.

## 6. Visual Cohesion & Art Direction Prompt

Paste this block to another model or an image generator. Do not loosen it.

MASTER VISUAL HANDOFF PROMPT — Gary Eats!

You are making assets or code for Gary Eats!, a mobile-portrait endless runner and a tribute to YouTuber Gary Eats. Match the existing game. Do not invent a new style.

Camera. Not a vanishing-point street. Lanes are flat bands. Shops are front-on with a little of the top showing. Props use that same camera. Gary is from behind, head turned so the face is visible. One ground line. One light, soft daylight, from the same side (the left). Reject a picture that is the right style and the wrong angle, or the right angle and a different outline.

Style. Painted British cartoon. Clean dark outlines. Semi-realistic, not cute, not pixel, not photo, not 3D render, not sticker. Same face, hair, blue quilted gilet, blue knit jumper, mic with a fuzzy windscreen. No black fringe, no white border, no drop shadow baked into the picture. Cut out on flat black so the game can clip it. Do not simplify Gary's face. He is the most realistic asset. Shops are the other end: flatter, more like a painted set. Props, food and hazards sit between them, closer to the shop than to Gary. A bin should not be as rendered as Gary. It should not be a flat icon either.

Scale. Gary is the ruler. A plate is about a third of his height. A hazard is no taller than a plate. A bin, postbox, bench or board is between his knee and his chest. A tree is about chest height. A shop is taller than him and the window is not resized. Postbox draw cap is 64. Bin cap 52. Bench cap 100 (seated reader, three frames across one file). Board cap 58. Tree cap 78. Pack a sprite sheet only after the set is agreed.

Palette, exact. Page background `#0a0c14`. Stage `#111111`. Canvas fallback `#1a1e24`. Overlay `rgba(10, 12, 20, 0.95)`. Intro overlay `rgba(8, 10, 16, 0.98)`. Title, primary button, stars, top tier: `#ffe600`. Pressed button `#e5ce00`. Button label `#111111`. Body copy `#cfd6e0`. Secondary button text `#8a99ad`, border `#333c4d`. Tier colours: `#ff4d4d`, `#ffb02e`, `#39ff88`, `#00ffff`, `#ffe600`. Road `#3a3f47`. Lane dashes `#c5c8cc`. Kerb stone `#c4c2bc`, kerb inner `#8d8a84`. Cobble fallback `#6e7276`. Gary's clothes stay blue gilet over blue knit. Shop paint may vary by shop, not by a new theme, until a biome is explicitly requested.

UI CSS standards. System font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`. Headings 900 weight, uppercase, slight negative tracking. Primary button: pill, 32px radius, padding 16px 42px, yellow glow `0 6px 24px rgba(255,230,0,0.35)`, press scale 0.96. Secondary button: transparent, 2px border, 24px radius. Portrait rings use a 4px `#ffe600` border. No extra chrome, no score pop that covers Gary's face, no font that is not the system stack.

Asset scaling rules. Logical canvas is 360 by 640. Road is 150px wide, three lanes, centred. Player y is 540. Street segment is 360px. Building draw height is 236px. Gap under a shop is the rest of the segment and is pavement, not a grey void. Draw props with a contact shadow in code. Do not bake the shadow. New pictures are PNG or WEBP, cut out on black. Bump `?v=` when replacing a file. Do not change camera, Gary's outline, or plate size to make a new asset fit.

Code that draws new art must use the existing lists: a prop goes in `DETAILS`, a placement goes in `STREET`, a line goes in `EVENTS` or `LINES`. Do not hard-code a one-off sprite in the loop.

## 7. Studio Vision & Engineering Standards

This project must be engineered with the polish, performance, and modularity of a professional game studio. The player is on an iPhone. The person directing the game is not a coder. Explain changes in plain language. The repo remains the source of truth.

Game Feel & Polish ("Juice"):

- Interaction timing is tight. A lane change starts on the frame of the tap or key. Do not add a delay to "smooth" the input.
- Pickup does not freeze the street. Feedback is the floating points, the cheer frame, and a caption looked up from `LINES` or `EVENTS`. Do not bring hit-stop back.
- Screen feedback is short: a small flash, a point floater, a tier colour. No full-screen shake that hides the lanes.
- UI overlays fade on opacity, about half a second. Buttons press to 0.96 scale. Do not add bounce that blocks the next tap.
- Audio cues fire on the same frame as the action. Intro voice already does this. Future pickup, crash, and near-miss cues must start instantly, not after a fade.
- A future Danny's table is an interaction, not a hazard. If it is built, touching it or drawing level with it must trigger its audio cue on that frame, show one looked-up caption, and must not stop the scroll. Until that prop exists in `DETAILS` and `STREET`, do not fake it.

Production-Grade Architecture:

- Strict separation of concerns. Today the split is page (`index.html`), lists (`game-data.js`), rules and drawing (`game.js`). The next split, when done, isolates game logic, input handling, rendering, and state management into distinct modules. Do not mix a new mechanic into the draw function.
- Data stays data. New tribute food, a prop, a caption, or a street row is a list entry. Rules stay in the rules file.
- One live page. Do not fork `index-new.html`.
- Captions are looked up. The run does not write them.
- Art lock is `STYLE.txt`. A picture that fails the lock is not wired in.

Performance & Scalability:

- Target 60 FPS on a phone. Cap delta. Do not allocate images, arrays, or gradients inside the loop.
- Zero memory leaks in the game loop. Reuse object slots. Remove off-screen plates. Do not stack listeners on restart.
- Extensible components: a new tribute item, a new Gary frame, or a later mechanic is added through `FOODS`, `DETAILS`, `STREET`, `STRETCHES`, or `EVENTS` without rewriting collision or the camera.
- Biomes, when allowed, swap floor, weather, shop paint and local props through data. They do not fork the renderer.
- Cache bust with `?v=` on changed files only. Commit the picture and the reference together.
