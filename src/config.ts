// config.ts — settings and constants used across the app, kept in one place
// so they are easy to find and tweak.

// --- Test location: Jackson Visitor Center, Paradise, Mount Rainier NP, WA ---
// Mount Rainier's summit is about 7.6 km away, almost due north-northwest (≈ 344°).
export const TEST_LOCATION = {
  name: "Paradise, WA (Mount Rainier)",
  lat: 46.786,
  lon: -121.7355,
  lookToward: 344, // initial heading so Rainier is centered on screen
};

// --- Earth model ---
export const EARTH_RADIUS_M = 6_371_000; // R in the curvature formula
export const REFRACTION_K = 0.13; // k: air bends light slightly downward, so we see a bit "over" the curve

// Height of your eyes above the ground, in meters.
export const EYE_HEIGHT_M = 2;

// --- Skyline sweep settings ---
export const AZIMUTH_STEP_DEG = 0.25; // one ray every 0.25° → 1440 rays for the full circle
export const DEFAULT_MAX_DISTANCE_KM = 100;
export const DISTANCE_CHOICES_KM = [50, 100, 150, 200];

// --- Elevation tiles ---
// Terrarium tiles: each 256×256 PNG pixel stores an elevation in its colors.
export const TERRARIUM_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

// Which tile zoom level to use, by distance from you. Higher zoom = more detail
// but more tiles to download, so detail drops off with distance (like a drawing
// where far-away objects get simplified).
//   zoom 12 ≈ 26 m per pixel, 11 ≈ 52 m, 10 ≈ 105 m, 9 ≈ 210 m (at Rainier's latitude)
export const ZOOM_BANDS = [
  { maxDistM: 5_000, zoom: 12 },
  { maxDistM: 25_000, zoom: 11 },
  { maxDistM: 100_000, zoom: 10 },
  { maxDistM: 200_000, zoom: 9 },
];
