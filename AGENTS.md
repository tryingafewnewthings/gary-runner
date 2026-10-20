# Gary Eats! — Mandatory AI project/asset instructions

This repository is the authoritative source for a professional mobile-first narrative Canvas runner. **Never implement from old chat memory alone.**

## Every new chat, asset request or code patch

1. Retrieve the latest main-branch `index.html`, `GARY_EATS_MASTER_REFERENCE.md`, `STYLE.txt`, `ASSET_GRID_PROMPT.txt` and the relevant live files. The current `index.html` determines which scripts are active; do not assume the old `game.js`/`game-runtime.js` are active.
2. For asset generation or editing, gather the approved source image, screenshot and reference sheet where available. Confirm object identity, camera, world size, full sprite-sheet grid, true alpha, consistent feet/baseline, source and runtime dimensions, light, layer and scene timing **before** generating. Use current `gary-difficulty-data.js` / `gary-game-config.json` for actual measurements. Do not mirror asymmetric Gary art or change his microphone/outfit.
3. Assess the complete result using `ASSET_GRID_PROMPT.txt`, and execute `node tests/asset-quality-gate.cjs --all` or changed-asset mode where available. List PASS/FAIL/UNVERIFIED with evidence. Automated metadata checks do **not** prove correct art, perspective or iPhone animation playback.
4. Before changing gameplay, read the live script dependency order; preserve cutscene/reader, fox, roast pickup, shops, shutters, decay, audio, saves and rollback. Stage/tests first, then promote with a non-forced atomic GitHub commit, no deletions without dependency audit.
5. Distinguish `CODE-OBSERVED`, `DOCUMENTED`, `PLANNED` and `UNVERIFIED-ON-DEVICE`. Never describe the bridge, wilderness, Victorian/Roman biomes, slide/jump or lantern inventory as live until independently verified.

## Non-duplication and permissions

The live code and config win over stale prose. `STYLE.txt` owns style; `ASSET_GRID_PROMPT.txt` owns review; `GARY_EATS_MASTER_REFERENCE.md` owns consolidated status; `ASSET_QUALITY_GATE.md` owns executable validation. This file is only the AI workflow entry point. Never claim a generated asset was committed or a repository installer ran unless a write succeeds and the new SHA is confirmed.

A GitHub `AGENTS.md` cannot force ChatGPT in an unrelated chat to fetch this file; put the same retrieval requirement in ChatGPT's **GaryEatsRunner Project instructions**. For mobile users, provide Safari-openable GitHub Pages installer links once the file exists on Pages, and never solicit a PAT in chat.
