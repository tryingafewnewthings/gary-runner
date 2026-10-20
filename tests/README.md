# Gary Eats! automated checks

These checks provide unit, controller, native Canvas integration and simulated browser coverage. They do not establish complete gameplay coverage, physical iPhone Safari compatibility, visual approval or real-device performance.

## Reproduce locally

Use Node **24.19.0** (matching integration CI) and the committed lockfile:

```sh
npm ci
npx --no-install playwright install --with-deps chromium webkit
npm test
GARY_TEST_ENGINE=webkit npm run test:browser
```

`--with-deps` installs Linux operating system libraries and requires administrator access. Browser revisions are selected by the pinned Playwright package. Do not substitute system Chromium when reproducing CI; `GARY_CHROMIUM_PATH` is an optional local diagnostic override only. No dependency is loaded by the published game.

## CI and coverage

- `.github/workflows/node-regression.yml` remains the dependency-free Node 22 check on every PR and push to main: fixed-step/pool/collision primitives, bench-reader controller and asset parser/contract unit tests.
- `.github/workflows/asset-quality.yml` remains unchanged. It validates changed registered image assets and gate unit tests.
- `.github/workflows/active-engine-tests.yml` runs on every PR, push to main and manual dispatch. One Ubuntu job uses `npm ci`, installs pinned Chromium/WebKit revisions and their OS libraries, then runs unit/controller tests, all 14 registered asset metadata checks, headless/native Canvas integration, and both browser smokes. The npm cache, job concurrency cancellation and 15-minute cap keep this economical. A nonzero test exit fails the job; there are no allowed failures or test retries.

| Check | What it exercises |
| --- | --- |
| `npm run test:unit` | Existing unit/controller checks plus fox readiness, safe staging, one-time outcome sampling and completion callbacks for theft/spared branches. |
| `npm run test:assets` | Every registered PNG/WebP metadata contract. Artistic quality remains outside this gate. |
| `npm run test:integration` | Active-engine startup, keyboard lane movement, real pooled food collisions and roast/fish/kebab scores, crash/restart, saves/catalogue/unread notices, bench frames 0–7, alignment-triggered cutscene and skip, natural 30-second decay and pause/reset, six shops closing once before decay, and both fox outcomes after dialogue with pause, scoring and reset checks. Also runs the existing native road-decay tests and the explicitly named legacy preview save-isolation case. |
| `npm run test:browser` | Actual index.html script loading, startup readiness, controlled 120 Hz frame delivery and 60 simulation ticks, Play/Skip Intro, the real entrance transition, keyboard and touch lane input, pause/resume, pooled roast collision, score/discovery, DPR canvas sizing, crash/restart and catalogue persistence within the page. Runs once per Chromium/WebKit in CI. |

## Active source and test isolation

`headless.cjs` derives script paths and order directly from `index.html`. The browser visits `index.html` and asserts every listed script loaded successfully, exactly one `gary-difficulty-runtime.js` is present and `game-runtime.js` is absent. An engine change fails clearly and requires a harness migration.

`active-runtime-test-api.cjs` injects hooks into an in-memory copy at the active runtime's final IIFE boundary. The browser also replaces only the active loop's two RAF scheduling calls in that response copy. Production files on disk are unchanged. Tests seed procedural/cosmetic randomness, remove ordinary hazards in narrative fixtures and sometimes stage the late street directly; the separate natural-decay case advances from a new run. The fox fixture supplies deterministic values through the controller's existing random dependency to exercise both outcomes, without changing its shipped probability.

The legacy preview save-isolation case intentionally loads archived preview scripts and never counts as active-engine coverage. It now runs in a full checkout and checks save isolation independently of which food happens to be first in the catalogue. No existing test or archived engine was deleted.

## Failure diagnostics and limits

Browser failures write the failing phase, runtime snapshot, exception stack, script requests, page/console/network errors, screenshot, HTML and Playwright trace under `test-results/<engine>/`. CI uploads these plus headless render captures for seven days on failure. Open a downloaded trace with `npx --no-install playwright show-trace <trace.zip>`.

For an intentional local red-path/diagnostic probe, run `GARY_SMOKE_FORCE_FAILURE=1 npm run test:browser`; expect exit 1 and a nonempty trace, screenshot and JSON report. This switch is not enabled in normal CI.

Still unverified: physical iPhone Safari/audio playback and 60/120 Hz device performance; visual shutter/keeper alignment and artistic animation quality; every unskipped dialogue beat; natural rare-event frequencies, procedural spawn distribution and a complete run without controlled fixtures. Fox and shop state integration are tested, but those checks do not prove their on-device appearance.

Rollback: revert the testing-foundation commit/PR through a normal revert PR. It changes only test tooling, dependencies and CI; no runtime or assets need restoration.
