# Gary Eats! — Executable asset-quality gate

**First packaged:** 19 October 2026. **Scope:** pixel/structural preflight for assets; **not** artistic approval or physical iPhone testing.

## Components

- `asset-quality-manifest.json`: explicit path-to-contract mappings for selected approved assets and sprite grids, with source dimensions, required transparent alpha, source cell sizes, safe-padding and foot baseline when dependable.
- `tests/asset-quality-gate.cjs`: Node-only offline validator. No packages or external service required. Reports PASS / FAIL / UNVERIFIED. Uses actual PNG decoded pixels (not just alpha-channel presence) to detect whether transparency exists. Inspects frame baseline and safe padding for registered RGBA PNG sprites.
- `tests/asset-quality-gate.test.cjs`: self-contained synthetic image/manifest regression tests.
- `.github/workflows/asset-quality.yml`: tests gate code and validates new/changed images in PRs and pushed commits. Because this is a GitHub Actions workflow, creating it requires PAT permissions to edit workflows.
- `AGENTS.md`: AI producer entry point; describes when to fetch and follow the visual contract. **Also** add the rule to ChatGPT Project instructions; a repository file alone cannot guarantee automatic cross-chat retrieval.

## Commands

```bash
node --test tests/asset-quality-gate.test.cjs
node tests/asset-quality-gate.cjs --all
node tests/asset-quality-gate.cjs --base <base-commit-sha>
```

`--all`: checks every asset explicitly registered in `asset-quality-manifest.json`; useful after installing the gate and before major releases. `--base`: checks only PNG/WebP assets newly created or changed between the named base commit and HEAD. **Any newly changed binary image must be registered** with an appropriate contract. `--base` also checks registered assets if the manifest itself was changed. The GitHub workflow runs `--base` using the correct pull-request base or push-before SHA. No uploaded asset is automatically promoted to runtime.

## Machine-checkable faults

1. Missing/empty/broken file; unsupported format; corrupted PNG chunk data; unreasonably large raster; wrong file extension versus actual format.
2. Wrong source width/height, frame-sheet width not divisible by columns or height not divisible by rows, wrong declared cell size.
3. PNG with no **actually transparent pixels** despite an asset contract requiring transparency; fake checkerboard may still need visual assessment.
4. Registered RGBA sprites: cropped/bleeding cells if detected alpha crosses the configured cell padding; wrong grounded baseline beyond tolerance. Other PNG colour modes may be reported UNVERIFIED for per-pixel registration and require inspection.
5. Per-file weight over documented allowance; changed unregistered image assets are blocked until asset metadata is recorded.

For WebP, the gate validates container structure and dimensions when the compressed header exposes them. **It cannot decode WebP pixels with Node built-ins:** actual transparency, fringe and per-frame registration are `UNVERIFIED`; accept only after image-based inspection. A passing status must never imply a visual camera check was performed.

## Human/AI visual review (still mandatory)

Read `STYLE.txt` and `ASSET_GRID_PROMPT.txt`; compare with approved gameplay screenshot and current sprite/atlas. Inspect artwork at target display size in the live 360×640 renderer, across daylight, night and heavy rain. Check the camera and road-lane perspective, character identity and direction, outlines, painted material and saturation, scale, layering, safe zones and HUD legibility. Play **every** animation and test handoffs; verify actual device load and Safari performance. Report any uncertain case as UNVERIFIED.

## Changing the manifest

Record the **asset as actually exported**; never invent dimensions simply to satisfy a test. Prefer a dedicated image asset with a unique path over reusing a cropped or resized existing file without source tracking. New sprites require `width`, `height`, `alpha`, optional `grid` containing `cols`, `rows`, `cellWidth`, `cellHeight`, optional `baselineY`, `baselineTolerance` and `padding`. The baseline is **local to each cell**. Background-only images may use `alpha: false`.

If a known legacy asset is being intentionally modified, add an explicit manifest entry in the same PR. The gate must not rewrite the image, invent invisible pixels or fix registration through arbitrary runtime scaling. A failure reports the smallest correction and rejects the change.

## Safety / rollback

The gate **does not edit gameplay**. A red workflow blocks asset approval for review; it does not delete source or revert a game. The accompanying Safari installer changes documentation and QA tooling only, using a single atomic Git tree and non-forced reference update. Its prior commit SHA is the rollback checkpoint. Restore via a targeted revert, not a forced branch reset if other work has landed.
