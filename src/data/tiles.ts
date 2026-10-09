// tiles.ts — downloads Terrarium elevation tiles and turns them into numbers.
// Runs inside the Web Worker. Downloaded tiles are kept in memory (the cache),
// so changing the distance setting doesn't re-download what we already have.
//
// Later, "offline downloads" can plug in here by saving tiles to storage.

import { TERRARIUM_URL } from "../config";

/** One decoded tile: 256×256 elevations in meters, row by row. null = download failed. */
export type TileData = Float32Array | null;

const cache = new Map<number, Promise<TileData>>();

/**
 * A single number that identifies a tile (faster to look up than text like "10/165/360",
 * which matters because the skyline sweep looks up tiles millions of times).
 * Works for zoom levels up to 13 (x and y stay below 10,000).
 */
export function tileKey(z: number, x: number, y: number): number {
  return z * 100_000_000 + x * 10_000 + y;
}

/** Already-downloaded tile, or undefined if we don't have it (yet). */
const ready = new Map<number, TileData>();
export function getReadyTile(z: number, x: number, y: number): TileData | undefined {
  return ready.get(tileKey(z, x, y));
}

/** Download one tile (or reuse the cached one). */
export function loadTile(z: number, x: number, y: number): Promise<TileData> {
  const key = tileKey(z, x, y);
  let p = cache.get(key);
  if (!p) {
    p = downloadAndDecode(z, x, y).then((data) => {
      ready.set(key, data);
      return data;
    });
    cache.set(key, p);
  }
  return p;
}

async function downloadAndDecode(z: number, x: number, y: number): Promise<TileData> {
  const url = TERRARIUM_URL.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y));
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();

    // Turn the PNG into raw pixel colors. "none" options stop the browser from
    // adjusting colors, which would corrupt the elevation numbers stored in them.
    const bitmap = await createImageBitmap(blob, { colorSpaceConversion: "none", premultiplyAlpha: "none" });
    const canvas = new OffscreenCanvas(256, 256);
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(bitmap, 0, 0);
    const rgba = ctx.getImageData(0, 0, 256, 256).data;

    // Terrarium encoding: elevation_m = (R × 256 + G + B / 256) − 32768
    const elev = new Float32Array(256 * 256);
    for (let i = 0; i < elev.length; i++) {
      const r = rgba[i * 4];
      const g = rgba[i * 4 + 1];
      const b = rgba[i * 4 + 2];
      elev[i] = r * 256 + g + b / 256 - 32768;
    }
    return elev;
  } catch {
    return null; // network error etc. — that area is simply treated as missing
  }
}

/**
 * Download a list of tiles, at most `parallel` at a time, calling `onProgress`
 * after each one finishes. Returns how many failed.
 */
export async function loadTiles(
  list: { z: number; x: number; y: number }[],
  onProgress: (done: number, total: number) => void,
  parallel = 8,
): Promise<number> {
  let next = 0;
  let done = 0;
  let failed = 0;

  async function workerLoop() {
    while (next < list.length) {
      const t = list[next++];
      const data = await loadTile(t.z, t.x, t.y);
      if (!data) failed++;
      done++;
      onProgress(done, list.length);
    }
  }

  await Promise.all(Array.from({ length: Math.min(parallel, list.length) }, workerLoop));
  return failed;
}

/** For testing: put a tile straight into the cache without downloading. */
export function injectTile(z: number, x: number, y: number, data: TileData): void {
  const key = tileKey(z, x, y);
  ready.set(key, data);
  cache.set(key, Promise.resolve(data));
}
