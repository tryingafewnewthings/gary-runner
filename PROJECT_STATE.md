# PROJECT_STATE: Gary Eats!

Source of truth for handoff. If a chat disagrees with the repo, the repo wins. This file describes `main` as of 2026-10-03, commit `70340079` ("Start the theme audibly and load the new script."). Live page: `index.html`, GitHub Pages. Script cache busters: `game-data.js?v=30`, `game.js?v=86`.

`GAME_STATUS.txt` is a short pointer only. It no longer embeds scripts. `STYLE.txt` is the art lock.

## Finish bar

This project needs to end as a professionally made game, not a prototype with notes. The finish is a phone game a stranger can play without a guide: one camera, one Gary, one pavement language, looked-up captions, no dead files, no second page, and feel that matches the action on the same frame. Art that fails `STYLE.txt` is not wired in. Do not call it done while the floor, props, and plates still disagree.

## 1. Where to pick up

Start here. Do not rebuild the runner.

1. Play the live page on a phone. Close the tab after a script change so `?v=` is honoured.
2. Read `STYLE.txt` before making or wiring a picture.
3. Change lists in `game-data.js`. Change rules and drawing in `game.js`. Keep one page.
4. Next art job, before a biome: floor and props must sit in the same world. The bench can still read as pinned to the wall. Bin, postbox, and bench are nearer a model than the shops. Tree is flatter. Mushroom and fork are softer than the shops. Props belong between Gary and the shops, closer to the shop.
5. Next mechanic, after that art pass: a roast the player can refuse. The current roast between mushrooms is a toll, not a dare. Then one-tap restart, only if a run still starts.
6. Do not add a biome until the floor and prop style agree with `STYLE.txt`. A later biome may change floor, weather, shop paint, and local props. It must not change the camera, Gary, plate size, or outline.

The person directing the game is not a coder. Explain changes in plain language. The player is on an iPhone.

## 2. Premise

Gary Eats! is a mobile-portrait endless high-street runner, a tribute to YouTuber Gary Eats. Gary is seen from behind, head turned so the face stays visible: blue quilted gilet, blue knit jumper, microphone with a fuzzy windscreen. He stays at y 540 on a 360 by 640 canvas. The street scrolls down.

Painted British cartoon. Clean dark outlines. Semi-realistic, not cute, not pixel, not photo. Shops are flatter painted sets. Gary is the most realistic asset. One soft daylight, from the left. Lanes are flat bands. Shops are front-on with a little of the roof showing.

Core loop: three lanes, left and right only. Collect kebab, fish and chips, and roast dinner. Dodge plastic forks and mushrooms. Score raises speed toward a cap. Captions and tiers speak in Gary's voice. A late tier names Danny ("I'll have to bring Danny here one day"). Danny is not a character in the run yet.

## 3. What is live

- One page. No engine, no framework, no build step. HTML, CSS, plain JavaScript in strict mode.
- One canvas, 360 by 640, scaled to the phone. Device pixel ratio capped around 2.5.
- Loop: `requestAnimationFrame` calls update then render. Delta is capped.
- States: `menu`, `intro`, `play`, `crash_fork`, `crash_m`, `over`.
- Input: A, D, arrows, or a tap on that half of the screen. No jump, no duck. A lane change starts on that frame.
- Menu, skippable intro, run, crash, end card ("Proper Ruined!"), try again. Best score is kept.
- Food: kebab 5, fish 10, roast 25. Hazards: fork and mushroom. Near miss is +5 and the line "Close one."
- Road patterns are `STRETCHES` (early, mid, late).
- Tiers: Absolute Rubbish, Bit Dry Needs Salt, Proper Decent Food, BEAUTIFUL!, I'll have to bring Danny here one day.
- `EVENTS` at 25, 80, 160, 300, and 500. Captions are looked up. `grin: true` uses the cheer picture.
- Walk frames `gary_run1.png` and `gary_run2.png`. Cheer and crash are separate. Open and closed mouth pictures drive the intro and the menu portrait.
- `gary_audio.mp3` is the intro voice. An analyser moves the intro mouth. Skip goes to play.
- `gary_theme_song.mp3` is the theme. It starts audibly with the intro, stays under Gary's voice, rises for the run (including crash and game over), and fades out on Try Again. Loaded as `gary_theme_song.mp3?v=1`.
- Pickup does not freeze the street. `hitStop` is still zeroed in reset and is unused. Do not bring hit-stop back.
- High street sheet `high_street_sprites.webp` (2912 by 2688, `?v=8`). Shops: Fish & Chips, Peri Peri Chicken, Bakery, The Red Lion, Butchers, Mallace Cafe. Keepers are clipped to the glass and hop when Gary draws level.
- Street plan is `STREET`. Segment height 360. Building height 236. The next roof peeks in. Props: lamp (from the sheet), postbox, bin, bench (three frames, cap 100), tree, A-board. Contact shadow is drawn in code.
- Live pavement is `IMG_7141.webp` through `IMG_7148.webp`, loaded as `?v=6`: base, weeds, light, sparse, dense, leaves, grime, cracked. Drawn as a mixed cell grid. A stone kerb covers the edge.
- Food and hazard pictures: `roast.png`, `fork.png`, `mushroom.png`. Kebab and fish can fall back to drawn plates.

## 4. Known gaps

- `game.js` is still one file. Logic, input, rendering, and state are not split. Split only when a change needs it. Do not mix a new mechanic into the draw function.
- Score lines still open on the pickup that crosses them.
- No dedicated pickup or crash sound effects. Intro voice and the theme are the audio.
- A failed picture must not stop the loop. A bad caption path has frozen a run before. One change per commit.
- After a script or picture change, bump `?v=` on that file and close the phone tab.

## 5. Files

- `index.html` — page, canvas, intro voice tag, menu, intro, game over, CSS. Loads the two scripts.
- `game-data.js` — `TIERS`, `FOODS`, `LINES`, `CAPS`, `EVENTS`, `DETAILS`, `STREET`, `STRETCHES`.
- `game.js` — loop, state, input, collision, speed, captions, shops, keepers, cobbles, kerb, props, Gary, plates, HUD, theme fade. `BUILDINGS` and `KEEPERS` live here.
- `STYLE.txt` — art lock.
- `PROJECT_STATE.md` — this handoff.
- `GAME_STATUS.txt` — pointer to this file.

## 6. Standards for the professional finish

- Lane change, pickup, crash, and near miss happen on the frame of the action. No delay added to smooth input. No full-screen shake that hides the lanes.
- Captions are looked up. The run does not write them.
- Data stays data. A new food, prop, caption, or street row is a list entry.
- Target 60 FPS on a phone. Cap delta. Do not allocate images, arrays, or gradients inside the loop. Do not stack listeners on restart.
- Biomes, when allowed, swap floor, weather, shop paint, and local props through data. They do not fork the renderer.
- Cache bust with `?v=` on changed files only. Commit the picture and the reference together.
