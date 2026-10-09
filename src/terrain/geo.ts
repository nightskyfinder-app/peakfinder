// geo.ts — basic map geometry: moving across the Earth's surface and
// converting latitude/longitude into tile pixel coordinates.

import { EARTH_RADIUS_M } from "../config";

export const DEG = Math.PI / 180; // multiply degrees by this to get radians

/**
 * Starting at (lat, lon), travel `distM` meters along compass bearing `bearingDeg`
 * (0 = north, 90 = east). Returns the latitude/longitude where you end up.
 * This is the standard "great-circle destination" formula on a sphere.
 */
export function destination(lat: number, lon: number, bearingDeg: number, distM: number): [number, number] {
  const φ1 = lat * DEG;
  const λ1 = lon * DEG;
  const θ = bearingDeg * DEG;
  const δ = distM / EARTH_RADIUS_M; // distance as an angle at Earth's center

  const sinφ2 = Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ);
  const φ2 = Math.asin(sinφ2);
  const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * sinφ2);
  return [φ2 / DEG, λ2 / DEG];
}

/**
 * Converts lat/lon to "world pixel" coordinates at a zoom level, using the
 * Web Mercator projection that map tiles use. At zoom z the whole world is a
 * square of 256 × 2^z pixels; tile (x, y) covers pixels x*256 … x*256+255.
 */
export function worldPixel(lat: number, lon: number, zoom: number): [number, number] {
  const size = 256 * 2 ** zoom;
  const x = ((lon + 180) / 360) * size;
  const φ = lat * DEG;
  const y = ((1 - Math.log(Math.tan(φ) + 1 / Math.cos(φ)) / Math.PI) / 2) * size;
  return [x, y];
}

/** Keeps an angle within 0–360°. */
export function wrap360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Keeps an angle difference within -180…+180°. */
export function wrap180(deg: number): number {
  return wrap360(deg + 180) - 180;
}
