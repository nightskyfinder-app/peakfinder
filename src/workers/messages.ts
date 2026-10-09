// messages.ts — the "vocabulary" the main page and the terrain worker use to talk.
// Keeping it in one file means both sides always agree on the message shapes.

import type { SkylineResult } from "../terrain/skyline";

/** Main page → worker */
export type ToWorker = {
  type: "compute";
  lat: number;
  lon: number;
  maxDistKm: number;
  azStepDeg: number;
};

/** Worker → main page */
export type FromWorker =
  | { type: "progress"; stage: "tiles"; done: number; total: number }
  | { type: "progress"; stage: "compute" }
  | {
      type: "result";
      skyline: SkylineResult;
      viewerElevM: number; // your eye elevation used for the calculation
      maxDistKm: number;
      tilesFailed: number;
      tilesTotal: number;
      ms: number; // how long the calculation took
    }
  | { type: "error"; message: string };
