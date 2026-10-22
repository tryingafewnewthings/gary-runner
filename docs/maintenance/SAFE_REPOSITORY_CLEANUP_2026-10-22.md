# Gary Eats! — Safe repository cleanup review (22 October 2026)

**Proposal, not yet live:** delete obsolete one-off installer HTML and the duplicated, user-rejected wilderness DRAFT01 ZIP from current main tree after PR review. Based on main `b39af28f973fe2d4c1d4204bfe2ad72917403d78`. No production/game runtime, assets in use, tests, backup engines or project/visual documentation is changed.

## Why these files

The old installers are one-off publishing mechanisms for changes now represented by committed source; some are historical redirects. The game loads scripts from `index.html`, not from these pages. The `GaryEats_Wilderness_Asset_Pack_DRAFT01.zip` is a large source ZIP of rejected art whose extracted images remain available to the current, still-unapproved wilderness engine. Removing this ZIP does **not** remove those sprite images, replace the wilderness, change gameplay, or purge Git history.

Current Git snapshot has 324 entries. Review checked `index.html`, all public production editing-page entry files, the asset quality manifest, active browser/asset/integration test entry files and `AGENTS.md` for named references. None of the candidates were referenced by that active subset; **this does not claim a fully exhaustive dependency graph**.

## Exact deletion manifest

| File | Size (bytes) | Recorded blob SHA |
| --- | ---: | --- |
| `Gary_Eats_Cutscene_Studio_Installer.html` | 1216656 | `12fdf21b883f825c23962a1603d6ae330622b9bd` |
| `gary-decay-v3-repair-installer.html` | 593 | `84d5aebb7658d0258cb11b12da505eeede1c4438` |
| `gary-decay-v4-performance-installer.html` | 197026 | `057b57a1abe449f7506347dd60946f9668b6caae` |
| `gary-eats-balance-safari-installer.html` | 24673 | `aa6c04285913780eb1e38100e777da96bb5c3a51` |
| `gary-eats-difficulty-installer.html` | 47881 | `769aad66a876a8a77af545ea98f21ca7457276a0` |
| `gary-first-run-camera-stability-installer.html` | 14983 | `fc2beb3d896010b5a8ecb39c795972a59f5638eb` |
| `gary-forgotten-road-decay-installer.html` | 1044 | `5f67e6cb4e88ec1d188363c40089d125621d2441` |
| `gary-intro-border-fix-installer.html` | 11142 | `637b6a48dfdeb9b0f311659552ba5e9da85bc14e` |
| `gary-reference-quality-installer-v2.html` | 75698 | `250a9a03bb72994cbab30b181a712697b7e9e010` |
| `gary-reference-quality-installer.html` | 73429 | `0d1a79ff050f0396649a99c1090a9831d6310323` |
| `gary-road-transition-installer.html` | 26274 | `0509a480236e81fdf3895d67cfffb26c147e6c1f` |
| `gary-street-sequence-installer.html` | 652086 | `ca0ee2b0f2b7af2b0163b52821ad9be780ee0297` |
| `gary-street-sequence-v2-installer.html` | 655599 | `98f06d1fa1c6969c96e85a34fe33cd1cfcaffad4` |
| `gary-visual-director-installer.html` | 157717 | `1e10509b5def847fb5b7daf7df3fba94c70edf41` |
| `gary-wilderness-bridge-installer.html` | 861 | `bd2d6e12fe7b9906a67506e2b677626317381d24` |
| `gary-repository-cleanup-installer.html` | 25238 | `39c6e96526c4f7ce77cde6948b22e78a64763065` |
| `gary-cleanup-installer-v2.html` | 17874 | `2a84abf8ea648417a0b7917287d7ce55a015e020` |
| `installer.html` | 244 | `56b7d8330145f97469f1fd1e38193ae504784a91` |
| `GaryEats_Wilderness_Asset_Pack_DRAFT01.zip` | 18607270 | `beb172d12f43de5ce56f02b69f06e2f077023a5a` |

**Total current-tree bytes removed:** 21,806,288 (20.80 MiB). This is a reduction in HEAD/Pages files, **not** a claim about Git history size or immediate repository storage reclamation.

## Explicit protected material

- `index.html`, `gary-difficulty-data.js`, `gary-difficulty-runtime.js`, `gary-game-config.json`, cutscene, reader, fox, road-decay, bridge, current wilderness sources and **all referenced images**.
- `game.js`, archived engines, legacy preview pages/tests, historical `*-backup.json`, `gary-emergency-restore.html` and `gary-emergency-rollback-installer.html`.
- `gary-asset-factory.html`, `gary-biome-workspace.html`, `gary-camera-lab.html`, `gary-perspective-editor.html`, `gary-studio.html`, `gary-cutscene-studio.html`, `gary-docs-publisher.html`, their JS/config/dependencies.
- `AGENTS.md`, `STYLE.txt`, `ASSET_GRID_PROMPT.txt`, `ASSET_QUALITY_GATE.md`, `GARY_EATS_MASTER_REFERENCE.md`, all visual/camera references and test harnesses.
- All extracted `art/wilderness/**` files remain even though DRAFT01 visuals were rejected, because the current engine still draws them.
- `GARY_CLEANUP_MANIFEST.json` remains as historic record of the previous cleanup.

## Verification before merge

1. Review PR **Files changed**: exactly the 19 deletions above and this added documentation. If any runtime file or asset image was touched, reject.
2. Require green existing GitHub Actions checks (`npm test`, asset quality gate, Chromium/WebKit active-game tests) where available. Those tests already include the fox, reader/cutscene, roast, bridge, startup/controls, art editor and wilderness behaviours.
3. Merge only after checks and owner approval; never force-push `main`. Old direct links to deleted installers will become 404. No current editor or normal game URL should change.
4. Roll back with a normal GitHub **Revert** PR, or restore specific paths from pre-cleanup commit `b39af28f973fe2d4c1d4204bfe2ad72917403d78`; do not reset the branch or delete Git history.

## Quality status

- Repository/tree identity and filename/size existence: **PASS (GitHub metadata observed)**.
- Active entrypoint/editor/test-entry string reference scan: **PASS for audited subset**.
- Full recursive runtime dependency proof: **UNVERIFIED** (scope intentionally conservative).
- Full CI regression on PR, physical iPhone Safari smoke and published Pages: **UNVERIFIED until observed**.
- User-approved first-biome visual master/reference assets and the rejected wilderness sprites: **PRESERVED**.
