# Gary Eats! — Safe repository cleanup audit (22 October 2026)

## Proposed change (not merged)

Delete **18 retired one-off installer/redirect HTML pages** from the current main tree. This is a maintenance-only PR. No current game code, art, test, editor, configuration, or rollback engine is modified or deleted.

Baseline: `b39af28f973fe2d4c1d4204bfe2ad72917403d78`. Branch: `cleanup/superseded-pages-20261022`.

**Total files:** 18. **Current-tree bytes:** 3,199,018 (3.05 MiB). Deletion does not purge Git history or immediately reduce storage used by old Git commits.

| Superseded file | Bytes | Recorded source blob |
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

## Verified keep decision: DRAFT01 ZIP

**Preserve `GaryEats_Wilderness_Asset_Pack_DRAFT01.zip`** even though its artwork was rejected as a production style source. The original first cleanup proposal included deletion of this 18.6-MB archive, but **GitHub Actions correctly failed**: `tests/wilderness.test.cjs` reads the ZIP and checks its SHA-256 against `art/wilderness/registration.json`. To preserve an existing regression/provenance guarantee, the archive has been restored to the cleanup branch. No test has been relaxed or removed. The extracted `art/wilderness/**` sprite files also remain, since the current renderer loads them.

## Why the 18 deletions are in scope

Each is a standalone historical publishing page, obsolete patch publisher or redirect. The current `index.html` uses `gary-difficulty-data.js` and `gary-difficulty-runtime.js` with registered modules. The current Safari editors are separate, protected pages. Removing old installers makes old direct URLs to those installers stop resolving; it does not reverse their published source changes, which persist.

## Dependency and QA evidence

- Compared base/new Git tree entries: these 18 files were the only deleted paths; no existing source, asset or test file changed, and this document was added.
- Audited active `index.html`, core editor entry pages (`gary-studio`, `gary-biome-workspace`, `gary-asset-factory`, `gary-camera-lab`, `gary-cutscene-studio`, `gary-docs-publisher`, `gary-perspective-editor`), the asset manifest, browser/asset/bench integration test entrypoints, and `AGENTS.md` for direct candidate references. None of these actively reference the obsolete installer pages. This is not a guarantee that every historical document remains link-clean.
- First PR attempt: Node unit tests **PASS**, 38/39 native integration checks **PASS**, missing ZIP source-provenance fixture caused **FAIL**. The original ZIP was restored unchanged; this PR must now pass fresh CI, including asset gate and browser checks, before merging. Do not merge on stale or failing tests.
- No physical iPhone verification is implied. The gameplay, art and renderer code are untouched.

## Protected files

Keep all live scripts, shops/Gary/fox/bench/cutscene/roast/wilderness image files, bridge assets, all test suites and CI workflows, visual director and camera documents, `ASSET_GRID`, `GARY_CLEANUP_MANIFEST.json`, current interactive studios, `gary-emergency-restore.html`, `gary-emergency-rollback-installer.html`, backups, historic engines and legacy preview harnesses. No speculative deep asset deletion.

## Owner approval / rollback

1. Inspect the PR's exact **Files changed**; expect 18 deletions and this added documentation.
2. Wait for green GitHub Actions results. If anything is red or files differ, do **not** merge.
3. Merge normally from Safari. Old deleted installer URLs will become 404 once Pages deploys.
4. Roll back by a normal GitHub revert PR, restoring the deleted paths from Git history. Do not force-reset `main`.

This is a safe first cleanup pass, not a claim that every unused file has been conclusively identified. Future asset deletion requires explicit source/runtime/test dependency proof and artistic retention decisions.
