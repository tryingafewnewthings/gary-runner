# Bridge entrance seam — isolated visual candidate

- Candidate PNG: `art/candidates/bridge/entrance-seam-user-20261024.png`, 360×256, actual alpha; nonzero pixels limited to x96–263, y115–141 within the 64px central mask.
- Input: owner-accepted 24 October bridge entrance JPEG composition (1487×1058), photographically flattened against white; this is an isolated masonry extraction, **not** a wholesale replacement of the bridge image.
- Registration: 1 source pixel = 1 game unit; draw at x=0, y=bridge.nearAt(view.distance)−128 in the existing bridge `deck` pass. The current stone bridge stays x138–222 wide; source length 620; asphalt/three lane markings untouched.
- Replace only the *entrance* procedural wing pair and entrance stone sill while previewing; bridge exit, rope barriers, water and collision are unchanged.
- To inspect after this branch is deployed: `gary-world-explorer.html?entranceCandidate=1`; compare with `gary-world-explorer.html`. Choose the registered High street → Bridge transition; review daylight, night and rain.
- Never load this candidate in the normal Play runtime. The page must have `?debug=1&bridgepreview=1` **and** `?entranceCandidate=1` to use it. If decoding fails or size is wrong, fall back to original bridge drawing.
- QA status: Alpha/dimensions verified, visually compared to an owner-provided 360×640 gameplay capture. Native engine day/night/rain screenshots **NOT YET CAPTURED**. Do not promote to production before a full game render and manual review; the asset ledger remains unchanged.
- User directive: road markings will be changed later; this PR must not alter them. Rejected `art/wilderness/**` images were not used as positive source references.
