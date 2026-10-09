// terrain.worker.ts — runs in a background thread (a "Web Worker") so the
// screen never freezes. When asked to "compute", it:
//   1. works out which elevation tiles are needed,
//   2. downloads them (reporting progress),
//   3. runs the 360° skyline sweep,
//   4. sends the result back to the page.

import { EYE_HEIGHT_M } from "../config";
import { loadTiles } from "../data/tiles";
import { elevationAt, tilesNeeded, zoomForDistance } from "../terrain/elevation";
import { computeSkyline } from "../terrain/skyline";
import type { FromWorker, ToWorker } from "./messages";

function send(msg: FromWorker, transfer: Transferable[] = []) {
  (self as unknown as Worker).postMessage(msg, transfer);
}

self.onmessage = async (event: MessageEvent<ToWorker>) => {
  const req = event.data;
  if (req.type !== "compute") return;

  try {
    const maxDistM = req.maxDistKm * 1000;

    // 1–2. Download the tiles (already-cached ones finish instantly)
    const list = tilesNeeded(req.lat, req.lon, maxDistM);
    const failed = await loadTiles(list, (done, total) => send({ type: "progress", stage: "tiles", done, total }));

    // 3. Sweep
    send({ type: "progress", stage: "compute" });
    const t0 = performance.now();

    const groundM = elevationAt(req.lat, req.lon, zoomForDistance(0));
    if (Number.isNaN(groundM)) throw new Error("Couldn't load elevation data for your location.");
    const viewerElevM = groundM + EYE_HEIGHT_M;

    const skyline = computeSkyline(
      { lat: req.lat, lon: req.lon, viewerElevM, maxDistM, azStepDeg: req.azStepDeg },
      (lat, lon, d) => elevationAt(lat, lon, zoomForDistance(d)),
    );

    // 4. Send back. "Transferring" the arrays hands them over without copying.
    send(
      {
        type: "result",
        skyline,
        viewerElevM,
        maxDistKm: req.maxDistKm,
        tilesFailed: failed,
        tilesTotal: list.length,
        ms: Math.round(performance.now() - t0),
      },
      [
        skyline.skyAngle.buffer,
        skyline.skyDist.buffer,
        skyline.ridgeStart.buffer,
        skyline.ridgeAngle.buffer,
        skyline.ridgeDist.buffer,
      ],
    );
  } catch (err) {
    send({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};

// Marks this file as a module so its names stay private to it.
export {};
