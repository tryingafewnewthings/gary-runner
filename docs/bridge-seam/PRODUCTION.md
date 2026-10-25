# Gary Eats bridge entrance — owner-approved seam production

Source: owner-supplied 24 October 2026 accepted entrance illustration (JPEG composition, not installed whole-scene). The structural masonry and 2 outer kerbs are isolated as a genuine transparent 176×88 PNG and rendered natively at scale=1.0. Original bridge sprite, road, road markings, deck x138..222, bridge length 620, water, collisions and exit unchanged.

Source crop: original 360×256 comparison canvas at x92..267/y147..234. Registered game draw at x=92, screenY=bridgeNear−13. In the underlying original 360 canvas, the stone sill is y149..160, registered across near−11..near. Content beyond the mask is transparent; alpha fades lower kerbs. Original high-street cobble pixels remain in charge outside structural stones. Background/white JPEG matte explicitly removed.

Fallback on load failure preserves the original procedural wings and sill. Day, night, rain, WebKit and native engine are tested by existing CI. Owner-approved illustration is an artistic target; CI passes are not iPhone device approval.

## Release evidence
Real native 360×640 day/night/rain render captures produced by passing Active Engine workflow run 40148448811 (artifact 12581421652). Full-colour source screenshots are in `bridge-ground-handover/chromium/{day,night,rain}-entrance.png` inside that artifact. All three were visually inspected. Checked-in `docs/bridge-seam/native/{day,night,rain}.png` files are heavily colour-reduced copies of these same native captures, not full-fidelity aesthetic masters. Exact asset SHA-256 and capture provenance in `docs/bridge-seam/native/review.json`, release ledger entry in `art-visual-ledger.json`. Native start/browser tests passed, physical iPhone Safari remains UNVERIFIED. No use of rejected wilderness art as positive source.
