// skyline.ts — the core math. For every compass direction, walk outward from
// the viewer, and at each step work out how high above (or below) eye level
// the ground appears, as an angle. The highest angle seen so far is what
// blocks everything behind it; the final highest angle is the skyline.
//
// Along the way we also note each "ridge crest": a place where the ground
// rose to a new highest angle and then dropped away behind. Those crests are
// the visible ridge lines in front of the skyline (drawn fainter with distance).

import { EARTH_RADIUS_M, REFRACTION_K } from "../config";
import { destination, DEG } from "./geo";

export type SkylineInput = {
  lat: number;
  lon: number;
  viewerElevM: number; // ground elevation + eye height
  maxDistM: number;
  azStepDeg: number;
};

/** Everything the drawing code needs. Plain number arrays so it moves between threads cheaply. */
export type SkylineResult = {
  azStepDeg: number;
  count: number; // number of rays (e.g. 1440)
  skyAngle: Float32Array; // per ray: skyline angle in degrees above (+) or below (−) eye level
  skyDist: Float32Array; // per ray: distance in meters to the skyline point
  // Ridge crests, packed: ray i's crests are at indices ridgeStart[i] … ridgeStart[i+1]-1
  ridgeStart: Uint32Array;
  ridgeAngle: Float32Array;
  ridgeDist: Float32Array;
};

// Ignore the first few meters: tile pixels are ~25 m wide, so the ground right
// under your feet isn't accurate enough to judge.
const MIN_DIST_M = 60;

// A crest only counts as a separate ridge if the ground behind it drops at least
// this much (in degrees) below it. Smaller bumps are ignored as noise.
const RIDGE_DIP_DEG = 0.05;

/**
 * Step size grows with distance: ~15 m near you, ~415 m at 100 km.
 * Far-away terrain covers a tiny angle, so coarser steps there lose nothing visible.
 */
export function stepSize(distM: number): number {
  return 15 + distM * 0.004;
}

/**
 * How far the ground "drops" below a flat line due to Earth's curve, reduced by
 * atmospheric refraction:  drop = d² / (2R) × (1 − k)
 * Example: at 100 km, drop ≈ 685 m.
 */
export function curvatureDrop(distM: number): number {
  return ((distM * distM) / (2 * EARTH_RADIUS_M)) * (1 - REFRACTION_K);
}

/** Angle (degrees) above eye level of ground at `elevM`, `distM` away. */
export function viewAngle(elevM: number, distM: number, viewerElevM: number): number {
  const heightDiff = elevM - curvatureDrop(distM) - viewerElevM;
  return Math.atan2(heightDiff, distM) / DEG;
}

/**
 * Runs the full 360° sweep. `elevAt(lat, lon, distM)` must return ground
 * elevation in meters (NaN if unknown); passing it in keeps this file pure math.
 */
export function computeSkyline(
  input: SkylineInput,
  elevAt: (lat: number, lon: number, distM: number) => number,
): SkylineResult {
  const count = Math.round(360 / input.azStepDeg);
  const skyAngle = new Float32Array(count);
  const skyDist = new Float32Array(count);
  const ridgeStart = new Uint32Array(count + 1);
  const ridgeAngles: number[] = [];
  const ridgeDists: number[] = [];

  for (let i = 0; i < count; i++) {
    const bearing = i * input.azStepDeg;
    ridgeStart[i] = ridgeAngles.length;

    let maxAngle = -90; // highest angle seen so far along this ray
    let maxDist = 0; // where it was
    let climbing = false; // true while we're on a slope that is setting new highs

    for (let d = MIN_DIST_M; d <= input.maxDistM; d += stepSize(d)) {
      const [lat, lon] = destination(input.lat, input.lon, bearing, d);
      const elev = elevAt(lat, lon, d);
      if (Number.isNaN(elev)) continue; // missing data: skip this sample

      const angle = viewAngle(elev, d, input.viewerElevM);

      if (angle > maxAngle) {
        // New highest point: this ground is visible and hides what was before it.
        maxAngle = angle;
        maxDist = d;
        climbing = true;
      } else if (climbing && angle < maxAngle - RIDGE_DIP_DEG) {
        // Ground dropped away behind the high point → that high point was a ridge crest.
        ridgeAngles.push(maxAngle);
        ridgeDists.push(maxDist);
        climbing = false;
      }
    }

    // The last high point is the skyline itself; record it as the final crest too.
    if (climbing) {
      ridgeAngles.push(maxAngle);
      ridgeDists.push(maxDist);
    }
    skyAngle[i] = maxAngle;
    skyDist[i] = maxDist;
  }
  ridgeStart[count] = ridgeAngles.length;

  return {
    azStepDeg: input.azStepDeg,
    count,
    skyAngle,
    skyDist,
    ridgeStart,
    ridgeAngle: Float32Array.from(ridgeAngles),
    ridgeDist: Float32Array.from(ridgeDists),
  };
}
