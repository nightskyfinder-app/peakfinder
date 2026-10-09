# CLAUDE.md — Standing rules for this project

Read this and PLAN.md before doing any work in this repo.

## About the owner
- Not a developer. Works as an architectural drafter (AutoCAD background), so
  geometry/plan concepts are familiar, but programming tools are not.
- Explain anything they must do themselves in **plain, numbered steps** (where to
  click, what to type). No jargon without a one-line explanation.
- They test on their **phone, outdoors**. Tell them exactly what to look for.

## Code style
- Keep code **simple and well-commented**: every file starts with a short comment
  saying what it does; non-obvious math gets a comment explaining the formula.
- Prefer small, plainly named functions over clever code. No unnecessary dependencies.
- Keep the folder layout modular so out-of-scope features (offline downloads,
  camera overlay, accounts, native packaging) can be added later:
  - `src/data/` — downloading tiles and peaks (network + caching)
  - `src/terrain/` — elevation lookup and the skyline math
  - `src/workers/` — Web Worker entry points (heavy math off the UI thread)
  - `src/render/` — Canvas 2D drawing
  - `src/sensors/` — GPS and compass
  - `src/ui/` — buttons, panels, loading indicator

## Stack (do not change without asking)
- Vite + TypeScript, **no frontend framework**
- Canvas 2D (line-drawing panorama, not 3D)
- Terrain math in a Web Worker
- GitHub Pages via the GitHub Action in `.github/workflows/deploy.yml`
- Free data only, no API keys: AWS Terrarium elevation tiles, OSM Overpass API for peaks

## Milestone workflow
- Work one milestone at a time (M1 → M4, see PLAN.md).
- After each milestone: build, push so it deploys, then **stop**. Tell the owner
  what to test on their phone and wait for their feedback before starting the next one.
- Update PLAN.md's Status table and Change log whenever a milestone starts, finishes,
  or the plan changes.

## Attribution (required)
- OpenStreetMap attribution must be visible on screen at all times:
  "Peak data © OpenStreetMap contributors" linking to https://www.openstreetmap.org/copyright
- Credit elevation data too: "Elevation: Mapzen Terrarium tiles (AWS Open Data)".

## Useful commands (for Claude)
- `npm install` — install dependencies
- `npm run dev` — local dev server
- `npm run build` — type-check and build into `dist/`
- Pushing to `main` deploys automatically to
  https://nightskyfinder-app.github.io/peakfinder/
