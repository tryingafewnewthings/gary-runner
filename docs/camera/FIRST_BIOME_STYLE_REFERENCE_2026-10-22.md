# Gary Eats! — first-biome visual reference (22 October 2026)

**Reference source:** The user's actual gameplay screenshot, `IMG_7392.jpeg`, supplied in the project chat on 22 October 2026. **Status:** `USER_SUPPLIED_REFERENCE`. This records an *observed style and 2D canvas registration*, **not** an approved universal raised-architecture projection. The original JPEG was available to this review, but the original/cropped binary image is **not** contained in this text-only PR. Obtain the exact user-supplied reference or the exported 360×640 preview before producing images. Do not claim a nonexistent image attachment exists in GitHub.

## 1. Rectification of screenshot to the 360×640 design frame

- Original phone screenshot `1320×2382` RGB (JPEG), with dark upper letterbox and thin horizontal gutters.
- Image content begins at about **(x30,y145)** in screenshot pixels. Logical scale ≈ **3.5 screen pixels per gameplay design pixel**.
- Crop `[30,145,1290,2385]` = `1260×2240` corresponding to **360×640**. The screenshot ends at y2382; extend the bottom three screenshot pixels using the last genuine source row, rather than baking in a black edge. Resize with Lanczos to 360×640.
- Check, not just assume, rectification from horizontal lane separator positions: separator centres at about x**571–572** and x**746–747** in the original screenshot, i.e. the 50-design-unit separation expected at 3.5×. Road/kerb edges at x≈**397** and **922** map to world x105 and x255.
- Distinguish screenshot pixel cropping from **game camera projection**; a screenshot resize should never change world/model measurements or perspective. The supplied JPEG has compression artifacts; do not copy its pixels into any gameplay asset.

For reference: a rectified PNG, a 360×640 annotated overlay, a compact WebP and extraction metadata were produced from this screenshot in the ChatGPT task; these are separate user-facing artifacts, **not committed to this branch**. If committing those files later, explicitly register exact actual dimensions and provenance and recheck licensing/source authority.

## 2. Observed first-biome style, subject to the owner's approval

| Element | Observed treatment | Mandatory transfer to future biome art |
| --- | --- | --- |
| Cobbled verge | Mid/cool grey irregular rounded stones, individually painted values, dark thin joints; modest natural variation, no sharp artificial patch-repeat rectangles | Distinct small stones and consistent drawn density at actual game scale; align seams with 60-unit cobble-grid source-quadrant sampling |
| Asphalt | Dark desaturated blue-grey/slate, smoothly shaded; parallel dashed lane marks, no convergence | Road width and lane pattern fixed by code; foreground texture should not invent a tilted camera |
| Shopfront | Brick upper façade, shallow charcoal roof, red deep-painted door and window frames, black/red striped awning, legible Peri Peri Chicken sign | Crisp dark contours, restrained roof/top-face exposure, road-facing storefront orientation; 89×236 destination rectangle |
| Interior and keeper | Warm amber interior behind window; keeper silhouette visible within façade | Keep independent keeper anchor, window mask and lighting/shutter geometry; exterior prop must not hide the window |
| Gary | Distinct stylised but relatively detailed painted figure; brown short hair and glance over his shoulder; navy quilted gilet over blue jumper, dark trousers and fuzzy microphone | Preserve character master, near-rear three-quarter facing and feet at y546; no mirror or generated model substitution |
| Food | Compact, clear stylised bowls and elliptical contact shadows; distinct from ground/hazards | Match visual weight/readability at registered size, without copying baked road/hazards |
| Misc props | Small bin, wall lamp and architectural details read as objects within a coherent street | Separate transparent ground-registered objects where needed; no isolated photoreal textures |
| UI | Red rounded rating panel, yellow pause button, bold outlined score | **Not** part of world-camera or biome artwork. Do not embed HUD in asset exports |

The screenshot confirms geometry by direct visual comparison but is not sufficient to calculate one true height/pitch for every shop, lamppost and bridge. Street artwork is painted near-elevation; horizontal ground content is screen-parallel. Preserve the difference instead of reprojecting the entire world as a 3D isometric scene.

## 3. Authoring profile decisions from this evidence

- **GROUND (CODE_LOCKED):** `[1,0]` horizontal and `[0,1]` scroll, no foreshortening, no vanishing point. Road x105–255; lanes x130,180,230; 60-unit cobble cells.
- **FRONTAGE (REFERENCE_MATCH_REQUIRED):** shops are individually illustrated at 89×236 design units; use this screenshot for paint/material/silhouette language and approved atlas cropping for exact structure. Do not extrapolate a physical vanishing point.
- **FREESTANDING (REFERENCE_MATCH_REQUIRED):** illustrated height and small visible top/side planes must be visually compared to the same source and grounded baseline. One screenshot shows only a limited selection of props.
- **BRIDGE/ARCHITECTURE (PROVISIONAL):** x138–222, 84×620 bridge deck, independent terrain/water/support/deck/foreground layers. Provisional `heightProjection:0.8` stays **unapproved**. Compare the candidate `docs/bridge-review/{enter,middle,exit}.png` with original `docs/bridge/` views and the first-biome material language.
- **CHARACTERS (MASTER_ART_REQUIRED):** never share bridge height extrusion or arbitrary quad warp with existing Gary animations.

## 4. Required next check before batch biome generation

Create at least **three actual-engine 360×640 compositions**: (1) original painted frontage/ground, (2) matching freestanding prop with visible foot and any top/side surfaces, (3) painted bridge/arches with separate water and parapets. Review each at active daylight, night/heavy rain and with Gary's unchanged sprite and HUD. Inspect moving contact/occlusion in the actual draw passes. Owner visual approval is necessary to freeze the **raised** family; merely choosing or exporting a numeric slider value is insufficient.

Reject DRAFT01 wilderness as style source. The first-biome style is an *illustration contract*; the 360×640 camera is a *world-geometry contract*. Both must pass, separately. The existing Asset Factory superimposes reference screenshots rather than registering candidates in the actual engine; that remains a prerequisite for reliable automatic biome production.

## 5. Status

- `PASS / CODE-OBSERVED`: world geometry, image rectification, camera-parallel playing surface, static evidence of first-biome visual language.
- `REFERENCE PROVIDED`: actual first-biome screenshot, source JPEG held in conversation; rectified outputs generated separately. **Reference appearance awaits explicit owner's sign-off if used to lock production master.**
- `UNVERIFIED`: physically consistent raised projection, bridge art visual approval, actual pixel-level match after full asset generation, iPhone scroll/thermal performance, in-engine registration of new art.
- `UNCHANGED`: gameplay, assets on `main`, camera contract approval flags and existing editor implementation.
