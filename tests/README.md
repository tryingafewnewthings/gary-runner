# Test coverage and limits

## Node-only unit/controller checks

The repository's Node built-in workflow runs:

```sh
node --test tests/core.test.cjs tests/mystery.test.cjs tests/asset-quality-gate.test.cjs
```

These are dependency-free unit/controller checks. They are **not complete gameplay regression coverage** and do not validate browser layout, rendered active-engine gameplay, iPhone Safari, or real-device performance. The asset-quality unit test exercises parsers and metadata contracts; the separate asset-quality workflow validates repository assets.

## Active-engine integration harnesses

`tests/helpers/headless.cjs` now reads the `script[src]` list from `index.html` and loads those files in page order. Test-only hooks are injected into an in-memory copy of `gary-difficulty-runtime.js`; the shipped runtime is not edited. `tests/last-orders-integration.test.cjs` has active-engine cases for save migration/discovery, pause/resume, bench animation and ground decay, cutscene skip, and natural cobble decay/reset. Run the active-engine subset with:

```sh
node --test --test-name-pattern='active engine' tests/last-orders-integration.test.cjs
```

This harness requires `jsdom` and `@napi-rs/canvas`, which are not declared in a root `package.json`; it is not part of dependency-free CI. The integration cases are controller/render-harness checks, not full manual gameplay coverage.

`tests/browser-smoke.cjs` serves `index.html`, controls the active runtime's animation frames, and checks 120 Hz frame delivery, start/transition, lane input, pause/resume, roast pickup, canvas sizing, and browser errors. It requires Playwright plus a browser installation and is run separately:

```sh
node tests/browser-smoke.cjs
```

It is Chromium/WebKit automation, not a physical iPhone Safari test. Do not claim real-device performance from this check.

## Legacy preview boundary

The explicitly named `legacy preview` case in `last-orders-integration.test.cjs` still targets the archived `gary-last-orders-preview.html` and its preview scripts. It is not active-game coverage and must not be reported as such. The sparse checkout used while preparing this migration omitted those archived files, so that single case was not run here.
