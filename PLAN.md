# PeakFinder Web Prototype — Plan

A mobile-friendly web app, opened in a phone browser outdoors, that draws a 360°
line-drawing panorama of the mountain skyline from the viewer's location and labels
the visible peaks — so you can check whether the drawn skyline lines up with the
real mountains.

## Status

| Milestone | Status | Notes |
|---|---|---|
| M1 — Project setup + GitHub Pages deploy (placeholder page) | ✅ Done | Phone-tested 2026-10-09 |
| M2 — Skyline rendering from the test location (no compass) | 🟡 Awaiting phone test | Deployed 2026-10-09 |
| M3 — Peak labels with visibility checks | ⬜ Not started | |
| M4 — GPS, compass mode, drag and offset correction | ⬜ Not started | |

Live site: https://nightskyfinder-app.github.io/peakfinder/
Repository: https://github.com/nightskyfinder-app/peakfinder

**Workflow:** stop after each milestone, list what to test, wait for feedback.

---

## Stack

- Vite + TypeScript, no frontend framework
- Canvas 2D for drawing (line-drawing panorama, not full 3D)
- Heavy terrain math in a Web Worker so the UI stays smooth
- Deployed to GitHub Pages by a GitHub Action (HTTPS is required on phones for GPS and compass)

## Data (free, no API keys)

- **Elevation:** AWS Terrarium tiles
  `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`
  `elevation_m = (R*256 + G + B/256) - 32768`
  Zoom ~10–12 near the viewer, lower zoom farther out. Cache tiles in memory.
- **Peaks:** OpenStreetMap via the Overpass API — nodes tagged `natural=peak`
  within the view radius (name, ele, lat, lon).
- OpenStreetMap attribution is shown on screen at all times.

## Core algorithm

- For each azimuth (start at 0.25° steps), march outward from the viewer to a max
  distance (default 100 km, adjustable up to 200 km), with step size increasing with distance.
- Earth curvature + refraction: `drop = d² / (2R) × (1 − k)`, R = 6,371 km, k = 0.13.
- Compute the elevation angle at each sample; the running maximum forms the skyline.
  Also record intermediate ridges, drawn lighter with distance for depth.
- A peak is visible if its angle is at or above the max angle along its own azimuth
  before reaching it (small tolerance). Label only visible peaks with name, elevation
  and distance; avoid overlapping labels.

## Features (this phase)

1. Location from GPS, with a manual fallback (tap a map or enter lat/lon), plus a
   test-location button: Mount Rainier from Paradise, WA.
2. Panorama with a horizontal heading scale (N/E/S/W and degrees).
3. Compass mode: iOS "Enable compass" button calling
   `DeviceOrientationEvent.requestPermission()`; Android uses `deviceorientationabsolute`.
   Smooth the jitter.
4. Drag to pan, plus a manual offset to correct compass error.
5. Tap a label for peak details.
6. Loading indicator while tiles and peaks download.

## Milestones

### M1 — Project setup + deploy
- Vite + TS project, folder layout for later milestones
- Placeholder page (mobile-friendly, OSM attribution)
- GitHub Action that builds and deploys to GitHub Pages
- **Test:** open the Pages link on the phone; page loads over HTTPS

### M2 — Skyline rendering
- Terrarium tile loader + in-memory cache; elevation lookup
- Web Worker that runs the azimuth sweep (curvature + refraction)
- Canvas panorama: skyline + lighter distant ridges + heading scale
- Fixed test location (Paradise, WA); loading indicator

### M3 — Peak labels
- Overpass query for `natural=peak` within the radius
- Visibility check per peak against its azimuth's ridge profile
- Non-overlapping labels; tap a label for details

### M4 — Location & compass
- GPS + manual lat/lon / map-tap fallback
- Compass mode (iOS permission button, Android absolute orientation), smoothing
- Drag to pan; manual heading-offset correction

## Implementation notes (as built)

- **Tile zoom by distance** (`src/config.ts` → `ZOOM_BANDS`): z12 to 5 km, z11 to 25 km,
  z10 to 100 km, z9 to 200 km. About 96 tiles at 100 km and 168 at 200 km. Tiles are cached
  in the worker's memory, so changing the range only downloads the new ones.
- **Step size** grows with distance: `15 m + 0.4% × distance` (≈415 m at 100 km). Sweep starts 60 m out.
- **Viewer height** = ground elevation at your spot (z12) + 2 m eye height.
- **Ridge crests**: a point counts as a ridge when the ground behind it drops ≥0.05° below it.
  Crests in neighboring rays are joined into lines if within 8% + 150 m in distance and 0.6° in angle.
  Brightness fades in 6 steps with distance.
- **Screen scale**: 1° across = 1° up (true shape) for views ≤90°. The 120°/360° views stretch heights.
- **M2 navigation**: ◀ ▶ buttons turn by 15°. Drag to pan comes in M4.
- Checked with synthetic volcano terrain (Rainier/Adams/St. Helens). Bearings and angles
  matched hand calculations (Rainier 345.7° at ≈20° up, Adams 164° at ≈1.5° up).

## Out of scope (for now)

Offline downloads, camera overlay, accounts, native app packaging. Code is kept
modular (data / terrain / render / sensors / ui folders) so these can be added later.

## Change log

- 2026-10-09 — Plan written; M1 started.
- 2026-10-09 — M1 deployed to GitHub Pages (first Actions run succeeded).
- 2026-10-09 — M1 confirmed on phone. M2 built (tiles, worker sweep, panorama, heading scale, loading, range setting) and deployed; waiting for phone test.
