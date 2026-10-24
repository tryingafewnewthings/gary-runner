# World Explorer Transition Seam Factory

The existing World Explorer now registers the actual terrain join before making
reference imagery. Select **High street → Bridge**, tap **Prepare AI Seam**, then
**Share with ChatGPT**, or **Save PNG** and **Copy AI prompt**. The share sheet does
not verify a ChatGPT attachment. Individual downloads, ZIP and manual controls are
in Advanced. All imagery is reference context, never automatic artistic approval.

## Geometry and immutable capture

`gary-seam-registry.json` describes transitions. The debug-only runtime resolver
reads the live bridge snapshot anchor and `GaryUserBridge.SPEC.end - SPEC.far`.
Entrance world boundary is `anchor`; exit is `anchor + length`. Screen y equals
`distance - worldBoundary`. The resolver sets the underlying rendered distance to
`worldBoundary + 320`; no timeline approximation is used. Day/night/rain retain
that exact distance.

The default corridor is y192–448: upper y192–288, transparent y288–352, lower
y352–448. The output is 360×256 at 1 source pixel per game unit. Its mask is
x0/y96/width360/height64. Canvas is never painted in that area; checkerboards exist
only in the UI. Registered joins require an even gap to keep the boundary exactly
at its centre. Custom diagnostic selections retain draggable boundaries.

All five kit entries come from one cached native 360×640 engine capture. Keys
include scene snapshot, animation time, transition, geometry, hidden layers and
implementation fingerprint. Changes invalidate the prepared kit. Candidate pixels
are excluded from reference captures. Capture restores backing dimensions, scale,
hidden layers and candidate layers in `finally`; it does not seek, change lighting,
advance gameplay or change saves. No factory script is loaded by normal Play.

The manifest includes the baseline source revision plus SHA-256 fingerprints of
the exact implementation files and reference image bytes served. This avoids
claiming that the baseline commit alone identifies uncommitted/PR code. Its
`assetRegistration.worldTop` maps imported untrimmed images with
`screenTop = currentDistance - worldTop`. Source/destination renderer references,
road/deck dimensions, original reference pack, weather, mask and approval status
travel with the prompt and kit.

## Candidate review

Prepare a kit and select **Preview Generated Asset**, or restore that kit's JSON
under Advanced after reopening. Import a PNG with the same full canvas dimensions,
visible pixels only inside the mask, and actual transparency outside it. Flattened
reference images, wrong dimensions, mismatched fingerprints/geometry, excessive
files and empty PNGs are rejected. No image stretching is applied.

The existing `GaryAssetPreview` inserts the candidate in the registered pass
(`deck` for bridge seams), before actors and foreground masonry/rope barriers.
Before/after, alignment guides, day/night/rain and full-size inspection are local
review controls only. The magenta rectangle in test screenshots is a synthetic
registration probe, **not proposed artwork**. No collision, physics, encounter,
audio or production registration changes are made.

## Adding a future transition

Add a registry entry with ID/name/biomes, verified source and target renderer
registrations, source image paths, approval requirements, default heights, anchor,
pass/occlusion and forbidden imagery. Resolver choices:

- `{"kind":"bridge","lengthFactor":0}`: entrance; factor 1: exit, using live length.
- `{"kind":"world","scene":"street-day","world":1500}`: an explicitly registered
  world boundary in an existing runtime scene. Set the actual verified distance,
  not a guessed slider value. This supports new joins in existing scenes without
  exporter changes; genuinely new renderer scenes must first be exposed by the game.
- `{"kind":"manual"}`: custom diagnostic selection. Approval is blocked until
  verified reference assets and a registered boundary are supplied.

Only `approval.status: "reference-context"` permits generation kits, with both
registrations and decodable reference images present. This is permission to use
context, **not approval of generated art**. Rejected `art/wilderness/**` paths and
views containing successor terrain cannot be silently promoted. The current exit
entry is deliberately blocked pending approved successor art. Do not change this
status merely to make a button work; do not substitute procedural art and call it
approved. The checked-in entrance example uses original street pixels and the
unchanged supplied bridge. See GARY_VISUAL_PRODUCTION.md for final art acceptance.

## Evidence and tests

- [Entrance template](seam-template.png), [manifest](seam-manifest.json),
  [prompt](generation-prompt.txt), [upper](upper-reference.png), [lower](lower-reference.png).
- [Chromium native entrance](chromium-entrance.png), [WebKit native entrance](webkit-entrance.png).
- [Chromium iPhone-sized interface](chromium-interface.png), [WebKit interface](webkit-interface.png).
- Each engine also has `*-candidate-day.png`, `*-candidate-night.png` and
  `*-candidate-rain.png` for registration and foreground occlusion inspection.

Run `node --test tests/seam-factory.test.cjs`,
`node tests/seam-factory-browser.cjs`, and repeat with `GARY_TEST_ENGINE=webkit`.
The browser test regenerates the evidence; Chromium also regenerates the example
kit. `tests/world-explorer-browser.cjs` retains the wider explorer regression.
The existing QA workflow runs both engines plus the seam unit tests.

Browser coverage includes boundary geometry, exact continuous crops and alpha,
shared kit pixels, hidden Gary/HUD/rain, state restoration, cache invalidation,
missing/rejected references, native and fallback share paths, copy fallback, File
import, manifest restoration, candidate pass/scale, custom dragging and absence of
preview APIs in normal Play. Native screenshots were inspected: original road and
cobbles meet the preserved bridge at the registered entrance; mask and test probe
align. This is technical QA, not artistic or physical-device approval.

Physical iPhone Safari, actual ChatGPT share-target receipt, and generated-art
quality remain unverified. WebKit automation is not physical iPhone validation.

## Merge and deployment

Deliver as one PR against main. Require green repository checks before merge;
GitHub Pages deploys main automatically. After merging, verify the served HTML,
fingerprinted scripts and registry before announcing deployment. Revert the PR
commit to roll back; do not force-reset main.

Final Safari URL after deployment:
https://tryingafewnewthings.github.io/gary-runner/gary-world-explorer.html
