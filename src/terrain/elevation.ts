// elevation.ts — answers "how high is the ground at this spot?"
// It picks the right tile zoom for the distance from the viewer, finds the
// pixel, and blends the 4 surrounding pixels for a smooth answer.

import { ZOOM_BANDS, EARTH_RADIUS_M } from "../config";
import { getReadyTile } from "../data/tiles";
import { worldPixel, DEG } from "./geo";

/** Tile zoom to use for a point `distM` meters from the viewer. */
export function zoomForDistance(distM: number): number {
  for (const band of ZOOM_BANDS) {
    if (distM <= band.maxDistM) return band.zoom;
  }
  return ZOOM_BANDS[ZOOM_BANDS.length - 1].zoom;
}

/**
 * Lists every tile needed to see out to `maxDistM` around (lat, lon).
 * For each zoom band, it takes the square around the viewer that contains
 * that band's circle, and lists the tiles covering that square.
 */
export function tilesNeeded(lat: number, lon: number, maxDistM: number): { z: number; x: number; y: number }[] {
  const list: { z: number; x: number; y: number }[] = [];
  let innerM = 0;

  for (const band of ZOOM_BANDS) {
    if (innerM >= maxDistM) break;
    const outerM = Math.min(band.maxDistM, maxDistM);
    const z = band.zoom;

    // Size of the square in degrees (1° of latitude ≈ 111 km; longitude degrees shrink toward the poles)
    const dLat = (outerM / EARTH_RADIUS_M) / DEG;
    const dLon = dLat / Math.cos(lat * DEG);

    // Corners in world pixels, padded by 2 pixels so blending at edges has neighbors
    const [x0, y0] = worldPixel(lat + dLat, lon - dLon, z);
    const [x1, y1] = worldPixel(lat - dLat, lon + dLon, z);
    const tx0 = Math.floor((x0 - 2) / 256);
    const tx1 = Math.floor((x1 + 2) / 256);
    const ty0 = Math.floor((y0 - 2) / 256);
    const ty1 = Math.floor((y1 + 2) / 256);

    for (let tx = tx0; tx <= tx1; tx++) {
      for (let ty = ty0; ty <= ty1; ty++) list.push({ z, x: tx, y: ty });
    }
    innerM = outerM;
  }
  return list;
}

/** Elevation of one whole pixel (NaN if its tile is missing). */
function pixel(z: number, px: number, py: number): number {
  const tile = getReadyTile(z, Math.floor(px / 256), Math.floor(py / 256));
  if (!tile) return NaN;
  const ix = px & 255; // position inside the tile (0–255)
  const iy = py & 255;
  return tile[iy * 256 + ix];
}

/**
 * Ground elevation (meters) at lat/lon using zoom level z.
 * Uses bilinear blending: a weighted average of the 4 nearest pixel centers.
 * Returns NaN if the data isn't available.
 */
export function elevationAt(lat: number, lon: number, z: number): number {
  const [wx, wy] = worldPixel(lat, lon, z);
  // Pixel centers sit at .5, so shift by half a pixel before splitting into whole + fraction
  const fx = wx - 0.5;
  const fy = wy - 0.5;
  const px = Math.floor(fx);
  const py = Math.floor(fy);
  const tx = fx - px; // 0–1: how far toward the right-hand pixel
  const ty = fy - py; // 0–1: how far toward the lower pixel

  const a = pixel(z, px, py);
  const b = pixel(z, px + 1, py);
  const c = pixel(z, px, py + 1);
  const d = pixel(z, px + 1, py + 1);

  const top = a + (b - a) * tx;
  const bottom = c + (d - c) * tx;
  return top + (bottom - top) * ty;
}
