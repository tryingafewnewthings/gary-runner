# Wilderness / Painted Bridge — Visual Integration Candidate (21 October 2026)

## Provenance and exact registration
The supplied `GaryEats_Wilderness_Asset_Pack_DRAFT01(1).zip` is the same DRAFT01 artwork family already extracted into `art/wilderness/` and registered in `gary-wilderness-data.js`. This patch **does not replace originals**, reinterpret atlas cells, or duplicate the 38 files. Registered source image dimensions and per-object source anchors stay intact.

Gameplay world: fixed 360×640; road x105–255, lanes 130/180/230; Gary foot y546. Bridge deck x138–222 (84 wide) and 620 world units long. Bridge artwork keeps its independent lower/deck/foreground 720×2000 source layers, their (360,1600) source anchor and 360×1000 in-engine draw registration. The painted bridge geometry is the supplied calibrated review candidate, **not newly invented perspective geometry**. Stream, bank, foreground and characters are separate.

## Deterministic placement contract (no guessed transforms)
| Component | Physical location and orientation | Behaviour |
| --- | --- | --- |
| Road | x105..255; texture 150×512 | Prepared once, consistent subdued glaze; stage-based variants |
| Background verge | x0..103 and x257..360 | Fixed 512-height caches, masked separately from road |
| Primary grass | left feet x68..91; right feet x269..292 | No rotation or mirroring; preserved sprite aspect and anchor; natural alpha matte built at startup |
| Secondary grass | feet at x38 or x322 | Sparse at later stages; layered behind and in front of Gary depending on foot depth |
| Small rocks/brambles/posts | left x45..71; right x289..315 | Rare; foot-registered and shadowed; always clipped off road |
| Larger logs | left feet x50..59; right x301..310 | Uncommon decoration, never a lethal across-lanes collider |
| Ruins | same off-road foot range | Scarce late-biome landmarks, not a repeating tile |
| Road hazards | native lane x130/180/230 | Original safe-pattern director and collision geometry unchanged |
| Bridge | x138..222, 620 length | Source paint cached and layered behind actors / above actors as separate passes |
| Water | outside x138..222 | Existing independently rendered water and calibrated support-occlusion pass, never baked into bridge |

Roadside draw calls clip strictly outside x103–257, so props cannot cover any of the 3 lanes. Deterministic seed and world slot positions mean no scenery jitter when paused, steering or replayed. Grass is organically alpha-feathered in the cache; the original source art is not destructively edited.

## Promotion and fail-safes
- The normal runtime fetches and decodes the supplied three-layer bridge review pack **after** Play becomes available. It composites the registered art one time, instead of building/rasterising per-frame.
- If source validation, download or decode fails, the existing procedural bridge continues working. A late asset load never switches bridge renderer mid-crossing.
- The Camera Lab remains isolated: manual candidate comparison and geometry template controls are unchanged.
- No new draw sources on the road, hazards, fox/reader changes, camera geometry changes, audio changes or save changes.
- The underwater collapse remains disabled until a complete destination exists.

## QA (status)
| Area | Result | Evidence / next gate |
| --- | --- | --- |
| Camera numbers, unchanged original geometry | CODE-OBSERVED | Read `gary-camera-contract.json`, `gary-bridge-art-review.json`, active `index.html` |
| Grass sprite orientation and road crop rules | CODE-OBSERVED | Inspect `gary-wilderness.js` off-road clipping and atlas-time masking |
| Imported bridge asset sources | CODE-OBSERVED | Existing bridge artwork QA/report and native screenshots `docs/bridge-review/*.png` |
| No side-effects on pickups/hazards, fox, reader | CI-PENDING | Run `npm test`, Chromium/WebKit smokes, full story progression |
| Actual artwork quality, road colour, revised vegetation density | UNVERIFIED | Capture full 360×640 world in day, rain, bridge approach/enter/middle/exit and woodland |
| iPhone Safari image sharpness, stutter and first-load memory | UNVERIFIED-ON-DEVICE | Manually test on iPhone, including pause/replay and cache refresh |

Do not interpret green automated test status as proof that the artwork matches the painted high street. Reject this candidate if the user sees incorrect bridge perspective, support contact, excess grassy rectangles, lateral seams, truncated ruins or jerky entry.
