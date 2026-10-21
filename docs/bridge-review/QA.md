# Supplied Forgotten Bridge artwork — QA record

20 October 2026 · PR #5 on `feat/visual-camera-calibration`, stacked on PR #4. **UNAPPROVED_ART_REVIEW**. Normal Play retains the legacy bridge; no merge, public deployment or final-art activation.

Open a served checkout's `gary-camera-lab.html` and select **Review supplied bridge artwork**. Play the preview for the full safe crossing. All three PNGs are lazy-loaded only for candidate selection; normal Play does not decode them. Source files match the supplied ZIP hashes. See [pipeline and artist handoff](../../BRIDGE_ARTWORK_PIPELINE.md).

| Approach | Enter | Halfway | Wilderness exit |
| --- | --- | --- | --- |
| ![Approach](approach.png) | ![Enter](enter.png) | ![Middle](middle.png) | ![Exit](exit.png) |

These are genuine **360×640 active-engine Chromium** captures. All four Chromium and all four WebKit views, plus intermediate scrolling samples from both browsers, were opened and visually inspected. They show the unchanged 84-unit centre deck, connected lower masonry, transparent rounded openings, submerged outer supports, Gary above the deck/below the foreground, and the existing road transitions. No new illustrations were produced.

## Automated results — PASS

| Check | Result |
| --- | --- |
| `npm run test:unit` | 30/30 |
| `npm run test:integration` | 31/31, including 12 bridge-art checks |
| `npm run test:assets` | All 36 registered contracts pass |
| `npm run test:browser` — Chromium | All four existing suites pass: active-engine smoke, bridge, Camera Lab, registered-art/full crossing |
| `GARY_TEST_ENGINE=webkit npm run test:browser` | All four suites pass, actual WebKit execution |
| Deterministic review exports | Reproduced from the supplied alpha; committed template/mask bytes verified |
| Source preservation | All three SHA-256 hashes match delivery; cached original paint matches one registered draw, excluding intentional paving-boundary feather |
| Layering / water / guidance | Centre-deck roast visible and collectible; nine-position native water checks; continuous approach→done browser runs; lane lock/release and collapse-disabled checks pass |
| Existing gameplay regressions | Reader→fox (both outcomes)→bridge, food/roast, shutters/decay, saved discoveries, crash/replay, pause/page lifecycle and fixed simulation checks pass in the existing suites |
| Changed-asset gate | All new/changed PNGs registered; passed against PR #4 base |
| `git diff --check` | PASS |

`npm test` passed as a complete run, including all Chromium suites. The final registered-art browser checks were rerun after tightening the water pixel probe to avoid HUD-covered screen rows. Native tests still inspect the complete registered mask rather than the HUD composite.

Local WebKit needed missing Debian shared libraries extracted into its local browser bundle because this executor has no sudo. Playwright's global `ldconfig` preflight was bypassed after installing those libraries; all actual WebKit browsers and assertions executed. No test, browser suite or runtime feature was skipped. CI uses its existing `playwright install --with-deps` setup; no dependency or workflow changes were added to the repository.

## Performance — measured host diagnostics, not phone claims

| Continuous crossing | Chromium | WebKit |
| --- | --- | --- |
| Sampled frame intervals | 285 | 84 |
| Median / p95 | 16.7 / 16.7 ms | 57 / 98 ms |
| Maximum | 33.3 ms | 144 ms |
| Intervals over 50 ms | 0 | 49 |
| Dropped simulation time | 0 s | 0.127 s |
| New artwork canvases during play | 0 | 0 |
| Existing early-approach street crop warmups | 8 | 8 |

A separate moving-middle comparison measured candidate versus legacy medians **16.7 vs16.7 ms in Chromium**, **56 vs89 ms in WebKit** (p95 **82 vs144 ms** in WebKit). The WebKit cloud software/browser path is slow with both renderers; the candidate is not slower in this sample. These short runs are diagnostics, not sustained FPS guarantees or physical Safari certification. Cold source decode, GPU residency, browser GC and thermal behaviour need device measurement.

Memory estimate: five design-resolution caches **6.87 MiB**, decoded supplied PNGs **16.48 MiB**, combined candidate **23.35 MiB**. Existing legacy bridge/environment caches add about **5.49 MiB**; other game caches, browser/GPU copies and screenshots are additional. No phone resident-memory measurement was performed. Design-resolution caches save 75% of cache bytes relative to the previous five 2× caches; high-DPI sharpness needs phone review.

The engine skips the street/buildings/lighting render passes once the bridge terrain fully covers the viewport (near≥500), while continuing all simulation and actor/weather/HUD passes. Camera Lab reuses selected artwork across view changes. No decode, trace, readback or artwork construction occurs in game frames. Existing small street-crop warmups during the early approach remain bounded and were recorded rather than misreported as zero total allocations.

Evidence: [Chromium crossing](chromium-live-crossing.json), [WebKit crossing](webkit-live-crossing.json), [Chromium comparison](chromium-performance-comparison.json), [WebKit comparison](webkit-performance-comparison.json), [candidate export](camera-candidate.json), [source/geometry report](../../art/bridge/review-masks/registration-report.json).

## Visual findings and remaining approval

- **Source-art cleanup needed before final approval:** pale extraction fringes/specks around some arch cut-outs and parapet/post outlines; small flat brown support-edge patches. These are in the supplied PNGs, not added backgrounds or runtime halos. They remain a ChatGPT/artist repaint/alpha-cleanup handoff. Sources are preserved; no procedural repaint or destructive outline erosion was attempted.
- **Visual approval pending:** rounded masonry perspective and massing, heavier supports and water contact, parapets, and the delivery's inferred approach paving. The canvas-edge road join is feathered, with the central 84×620 deck unchanged.
- **Environment scope:** stream, banks, grass and rocks remain independent existing engine rendering. Procedural wilderness ground remains simpler than the bridge illustration; no new wilderness art or encounters are claimed.
- **UNVERIFIED-ON-DEVICE:** physical iPhone Safari load/memory, sustained frame pacing/thermal behaviour, high-DPI sharpness, touch crossing, audio/pause/resume and export/share. Automated mobile viewport/touch checks do not substitute for this.
- Both PRs remain open and unmerged. Final-art activation and merges each require explicit approval. Bridge collapse remains disabled until the underwater/cave destination ships.
