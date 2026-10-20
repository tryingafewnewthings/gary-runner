# Node unit and controller tests

This workflow runs dependency-free Node unit/controller tests. **These checks are not complete gameplay regression coverage.** They do not load the active browser game or prove rendered gameplay, iPhone Safari compatibility, or device performance.

Run locally with Node.js 22:

```sh
node --test tests/core.test.cjs tests/mystery.test.cjs tests/asset-quality-gate.test.cjs
```

Included checks:

- `core.test.cjs`: fixed-step clock behavior, object pool behavior, and swept-contact primitives from `game-core.js`.
- `mystery.test.cjs`: the independent bench-reader controller in `gary-street-mystery.js`, including rain/readiness gates, sequence animation, safe slowdown, and reset.
- `asset-quality-gate.test.cjs`: synthetic PNG/WebP parser and metadata-contract checks. This does not validate all registered repository assets; use the separate asset-quality workflow for that.

Not included in this Node-only workflow:

- `last-orders-integration.test.cjs` and `tests/helpers/headless.cjs` require `jsdom` and `@napi-rs/canvas`. The helper currently loads archived `game-data.js` / `game-runtime.js`, not the active engine in `index.html`; its results must not be represented as active-engine coverage.
- `road-decay.test.cjs` requires `@napi-rs/canvas`.
- `browser-smoke.cjs` requires Playwright and targets the retired `gary-runtime-preview.html` / `game-runtime.js` path.

The headless/browser integration harnesses need a separate migration to the active engine before they can support active-gameplay coverage. This workflow intentionally does not claim coverage of cutscene playback, fox encounter integration, roast pickup in the live engine, shop closure rendering, cobble decay in the live engine, animations as rendered, or physical iPhone behavior.
