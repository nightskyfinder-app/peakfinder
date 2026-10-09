# PeakFinder Web Prototype — Plan

A mobile-friendly web app, opened in a phone browser outdoors, that draws a 360°
line-drawing panorama of the mountain skyline from the viewer's location and labels
the visible peaks — so you can check whether the drawn skyline lines up with the
real mountains.

## Status

| Milestone | Status | Notes |
|---|---|---|
| M1 — Project setup + GitHub Pages deploy (placeholder page) | 🟡 In progress | Code done; waiting on first deploy |
| M2 — Skyline rendering from the test location (no compass) | ⬜ Not started | |
| M3 — Peak labels with visibility checks | ⬜ Not started | |
| M4 — GPS, compass mode, drag and offset correction | ⬜ Not started | |

Live site (once deployed): https://nightskyfinder-app.github.io/peakfinder/
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

## Out of scope (for now)

Offline downloads, camera overlay, accounts, native app packaging. Code is kept
modular (data / terrain / render / sensors / ui folders) so these can be added later.

## Change log

- 2026-10-09 — Plan written; M1 started.
