# Gary Eats! — Visual Asset Production Standard
**Version:** 22 October 2026 • **Status:** enforceable producer workflow; NOT a claim that generative models can reproduce exact art on every attempt.

## Single production loop — the procedure for EVERY asset request

1. **Reference:** retrieve original first-biome image pixels and current runtime registration; choose the closest approved asset of the same family. A debug screenshot or unapproved bridge/wilderness asset is not an approved style reference.
2. **Method:** prefer controlled edits, extraction or composition of original art over new text-only illustrations. Ensure the generation/editing tool ACTUALLY receives reference-image pixels. Viewing GitHub images in another tool alone does not condition the generator. If image conditioning is unavailable, call the result a CANDIDATE.
3. **Geometry:** lock source canvas/grid, game-unit draw size, screen-parallel camera, Gary-relative scale, foot baseline, transparency, render layer, occlusion and soft upper-left lighting BEFORE rendering. Raised-architecture projection remains provisional.
4. **Review:** personally inspect actual image pixels and every animation frame at 360×640 beside Gary, including day/night/rain, moving ground contact and visual materials. Reject and correct wrong angles or style before delivery; do not ask the owner to operate Camera Lab or repeatedly fix artwork.
5. **Release:** use the existing image and real-engine QA tools, not new editors or installer systems. Keep unapproved images out of normal Play; require actual artistic approval, passing CI and separate physical iPhone checks. Batch necessary integration into one safe PR. No generative model can guarantee a perfect first attempt.

**Known production exception:** PR #18 merged/deployed a painted bridge while the Asset Quality Gate was red. The source bridge is unapproved, the visual ledger is empty, and the original first-30-seconds recording is not committed. Do not treat any of these as evidence of AAA fidelity. Repair enforcement rather than rubber-stamping a provenance entry.

## Automation and zero-user-work rule — 22 October 2026 amendment
The user should only need to request the desired asset. ChatGPT must perform the anchor retrieval (actual pixels), geometry silhouette selection or creation, model generation/editing, repeated visual self-review, source alpha/grid/baseline checks, game-scale mock-up, and candidate/production status report itself. Use `gary-visual-reference-board.html` for an automatically composed original-pixel source board. Use `tools/asset-visual-brief.cjs --family bridge` for geometry-linked separate deck and parapet requests. Do NOT simply re-ask the user to upload references that exist in the repo, run Camera Lab, or do Codex's implementation work.

**Absolute rejection rules:** If an asset introduces vanishing geometry, isometric tilt, disproportionate detail/lighting, independent vignette/ground, wrong sprite identity, unexplained alpha, incorrect visual ground contact, or incorrect game-scale orientation, reject it before presenting it as finished. Re-generate using the actual game images and measured mask. Do NOT repeatedly send failed full-scene illustrations to the user, and do not use the fox/rejected wilderness as sole reference.

**Real-world limitation:** no workflow can guarantee pixel-perfect generative art. Structural validators cannot grade painterly cohesion, and the original user-uploaded first-30-second film is not stored in GitHub. Where the currently accessible originals or real-engine preview are insufficient, clearly call an asset a candidate; never quietly call it production-ready. Do not require manual interaction by the user to run the review; carry out supported steps yourself.

**Automatic actual-engine capture, no iPhone interaction:** use `node tools/capture-asset-previews.cjs --asset art/candidates/<name>.png --template bridge-deck-tile --out test-results/asset-review/<name>` on the checked-out repo. It checks actual PNG alpha and mask, then invokes the isolated debug renderer in the real game and writes `day.png`, `night.png`, `rain.png` plus `review.json` linked to the exact original image SHA-256. This is a tool for ChatGPT/Codex/CI to execute, **not a task to hand to the user**. The review file stays UNVERIFIED until the assistant separately inspects and corrects the actual 360×640 screenshots. No normal Play asset is registered by this command.\n\n**New production evidence:** `art-visual-ledger.json` and `tools/visual-release-gate.cjs` require an actual first-biome reference, measured draw/foot bounds, reviewed camera, 360×640 day/night/rain screenshots and successful active startup before any NEW or CHANGED production PNG/WebP image can be promoted. `art/candidates/` may contain unverified experiments, but may not be referenced by normal gameplay. Continue applying `ASSET_QUALITY_GATE.md` for pixel-level checks. Evidence-gate success is NOT a claim of artistic perfection or physical iPhone verification.

## Invocation in every GaryEatsRunner chat
When the user says "generate [asset]" (or asks to edit a sprite, environment, shop, biome, effect, bridge or character), do the preparation and generate the requested art in ChatGPT in the SAME turn where possible. Do not ask the user to repeat established dimensions or delegate normal illustration to Codex. Before generation read the **current main branch** versions of:
1. `AGENTS.md`, this standard, `docs/visual-master/reference-pack.json`;
2. `STYLE.txt`, `ASSET_GRID_PROMPT.txt`, `ASSET_QUALITY_GATE.md`, `GARY_EATS_MASTER_REFERENCE.md`;
3. `index.html`, active `gary-difficulty-data.js`, relevant rendering/asset-registration code, `gary-camera-contract.json`, and for architectural art `GARY_CAMERA_SYSTEM.md`;
4. actual anchor IMAGE pixels and, where available, the relevant source sheet and a true 360×640 gameplay crop. Text descriptions and QA screenshots alone are not a sufficient proof of painterly compatibility.

**Reference availability:** The owner-supplied 22 October first-biome capture and 30-second footage are not committed as original media in the repository. Do not pretend otherwise. Until the complete first-30-second reference pack is deposited, use the repository's current native `high_street_sprites.webp`, `gary_walk_sheet.PNG`, cobble source images, and the real-engine street QA capture as available visual evidence. The QA street image contains demonstration placements and is NOT itself an approved full-style master. Any novel raised-object family without a matched approved image is an UNVERIFIED ART CANDIDATE, never automatically accepted. Still produce a useful candidate rather than repeatedly asking questions when sensible baseline dimensions exist.

## What must remain visually continuous
- The first 30 seconds of the playable street is the artistic north star, NOT the fox, DRAFT01 wilderness, bridge blockout or one isolated concept image.
- Illustration DNA: readable British painted-cartoon game environment; restrained hand-rendered soft shading; crisp dark yet not over-heavy contours; moderately detailed surfaces at tiny gameplay scale; distinctive warm red/brick/shop framing and cool grey cobbles/slate asphalt; light comes softly from upper LEFT in the source daytime art. Night/rain are mostly composited in engine, not arbitrary blue/black repaints of the sprite.
- Materials must feel from ONE illustrator. Avoid over-modeled 3D stone, photorealistic bark, sharp digital vector-flat decoration, thick isolated white sticker outlines, muddy compressed blobs, harsh rim/gloss highlights, oversized leaf/rock grain, and excessive brown/olive density.
- The fixed screen-aligned game world is NOT a physically projected scene. In 360×640 design units: road x105..255, lane centres 130/180/230, Gary y540, baseline y546, visible height ~142, shop draw 89×236, cobble cell 60. Confirm code remains authoritative if changed.
- Ground surfaces: x horizontal and y scroll axis screen-parallel. NO vanishing point, distant taper, distance scaling, skew or pseudo-isometric rotation. The raised-architecture height profile is PROVISIONAL; only the object-family APPROVED silhouette and actual screenshot can resolve appearance. Small top/side faces on shops are painted convention, not an invitation to invent a camera.
- Road-facing left shops: near-front orthographic elevations, tall slim facade with its long wall parallel to street, tiny roof/top exposure. Keepkeepers, shutters, glass, lighting in their current independently calibrated rectangles.
- Never mirror asymmetrical Gary/source characters or replace their face, navy quilted gilet, blue patterned jumper, hair direction or fuzzy microphone.

## Strict pre-generation contract — resolve before image generation
For each independent requested image, identify:
- Exact asset identity / asset family and WHICH existing artwork it should match.
- Attached/accessible approved source image(s) and 360×640 gameplay crop; record `referenceStatus` as APPROVED / OBSERVED / MISSING. For animation, use full original sprite sheet rather than a random isolated frame.
- Current source pixel size; grid rows and columns, cell padding and baseline; destination width/height in GAME UNITS; left/right orientation and whether mirroring is forbidden. Derive from actual code/template or mark candidate values as provisional, never invent "final" dimensions.
- A layer pass (`ground`, `rear`, `under-water`, `deck`, `front`), ground contact x/y, foreground occlusion, rain/day/night visibility and collision/clear-lane span. Source pixel canvas size is not the same as destination draw dimensions.
- Transparent cutout by default for props/characters/foods: *real alpha*, clean edges on white, black and middle-grey, no opaque background, fake checkerboard, environmental floor or extra cast shadow. Contact shadow is a separate layer unless matching an existing specified pickup's dedicated shadow convention.
- Single soft upper-left key light; match original outline thickness, contrast, palette and painted texture. No scene relighting, dramatic highlights or photorealism.
- For a building/bridge/raised object, check the relevant silhouette in Camera Lab/Factory, not a free-text depth adjective. For a new object without a template, build/derive a reversible geometry guide rather than improvise an untested raised profile.

## Immutable prompt core — include verbatim in the model's *actual* generation instruction
"GARY EATS! canonical first-biome illustration, faithfully matching the supplied approved image anchors. Fixed 2D hand-painted near-orthographic camera; flat screen-parallel ground bands; no vanishing point, perspective convergence, distance shrinkage, lens effects, arbitrary 3D camera rotation, foreshortening or isometric geometry. Match original dark painted outlines, soft upper-left daylight, gentle shadow values, controlled texture, material colours, Gary-relative scale and the intended bottom contact baseline. Existing world object's top/side exposure must follow its specific approved silhouette, NOT an invented extruded view. All isolated sprite pixels on TRUE TRANSPARENT alpha with no white halo, ground, sky, signage invented from scratch, cast background shadow or checkerboard. Preserve exact object identity, spelling, orientation and source dimensions. Render one candidate in the source-grid/canvas specified; never independently crop or rescale animation cells. Rejected DRAFT01 is not an artistic reference."

Attach or explicitly refer to the *actual images* in addition to this core; text cannot physically constrain pixels. Adapt the asset-specific lines below without weakening the core. Words like "camera depth", "3D rendered", "wide lens", "cinematic angle" should not be used as positive generation instructions.

## Asset-family decisions
| Family | Required primary visual anchor | Specific non-negotiables |
|---|---|---|
| Ground / cobbles / decay | Original `IMG_7141..7148.webp` and actual roadside screenshot | flat and repeat-safe quadrant scale, bounded road intrusion, no artificially raised stones |
| Shop / facade | `high_street_sprites.webp`, target crop from `BUILDINGS`, game screen | near-front elevation; exactly 89×236 destination and independently calibrated windows/keeper/shutters |
| Food / hazard | Existing food sprite and 360×640 gameplay composition with Gary | readable shape at registered 36–52 unit display sizes; collision separate; transparent; no oversized high-contrast stock icon |
| Freestanding prop / vegetation / animals | First-biome prop and Gary gameplay crop + relevant family silhouette | footprint, normal/rear/foreground occlusion, painterly detail economy; NO DRAFT01 wedge grass |
| Bridge / raised masonry / tunnel | Current bridge/world geometry, isolated engine overlay, approved masonry silhouette **if available** | existing 84-unit deck x138..222; 620-unit length; water/terrain/masonry/deck/front independent; height projection unapproved until owner review |
| Gary / keeper / hooded stranger animation | Complete ORIGINAL approved character sheet and gameplay crop | face/clothes/outline/light unchanged; all cells identical bounds and baseline; no character mirroring, identity drift or ghosting |

## Required two-stage acceptance
**Stage A — candidate before registration:** generate art in ChatGPT; inspect actual pixels at source and downscaled target; check intended family silhouette, alpha on black/white/grey, real size/foot, light, palette and painterly cohesion. Where an asset is supposed to be image-editable, prefer controlled edits of original reference over new independent text-generated depictions. Reject/rework significant mismatch BEFORE any engine integration. A technically valid image can fail art.

**Stage B — isolated real-engine validation:** import PNG into `gary-asset-factory.html` or `gary-biome-workspace.html` (supporting temporary unregistered candidates), inspect **actual 360×640 render** in the appropriate layer under DAY, NIGHT and RAIN, scrolling and occlusion against the unchanged Gary; verify exact runtime draw size/baseline, frame continuity and hazard legibility. Export exact candidate JSON / screenshots; run `node --test tests/asset-quality-gate.test.cjs`, `node tests/asset-quality-gate.cjs --all` or changed-asset gate, plus relevant browser/integration tests. Physical iPhone Safari remains a SEPARATE gate; browser WebKit is not the same.

Approval labels:
- `TECHNICAL_PASS`: source size, grid, alpha/registration tests pass; says NOTHING about artistic quality.
- `VISUAL_APPROVED`: only after comparison against a real approved reference and gameplay conditions, with the user's explicit approval for new families.
- `IPHONE_PASS`: only after physical Safari test.
- `UNVERIFIED` or `REJECTED`: any missing evidence or failed stage. Rejected DRAFT01 remains rejected even when existing runtime loads it.

**Never auto-promote a candidate or quietly overwrite existing production assets.** Codex handles only necessary geometry/integration tests after ChatGPT has established art, source pixels, draw sizes and placement. Batch implementation and regression into one handoff. Do not describe structural tests as a visual-quality gate.

## Quick response to future user requests
The user should be able to say simply **"Generate a [specific] Gary Eats asset"**. Retrieve current anchors and specs without requesting them again; generate/edit image; provide precise dimensions, alpha status and the remaining game-level QA. If reference bytes or a distinct family silhouette are genuinely unavailable, disclose the missing approval, make the strongest feasible candidate, and do not claim perfection.

**Current blocker to claiming a fully locked visual factory:** approved native image crops from the user's first ~30 seconds of gameplay are not deposited in the repo; some raised silhouettes have never received gameplay visual approval. Fix these once and reuse them in every future chat.