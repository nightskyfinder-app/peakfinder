// main.ts — the app's starting point. Runs when the page loads.
// Connects the buttons, the background terrain worker, and the panorama drawing.
// M2: always uses the Paradise, WA test location (GPS comes in M4).

import "./style.css";
import { DEFAULT_MAX_DISTANCE_KM, DISTANCE_CHOICES_KM, AZIMUTH_STEP_DEG, TEST_LOCATION } from "./config";
import { renderAttribution } from "./ui/attribution";
import { basicChecks, renderChecks } from "./ui/checks";
import { LoadingIndicator } from "./ui/loading";
import { PanoramaView } from "./render/panorama";
import { wrap360 } from "./terrain/geo";
import type { FromWorker, ToWorker } from "./workers/messages";

// Shorthand: find an element by id (and complain clearly if it's missing).
function $<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

// Milestone label in the top-right, so you can tell on the phone which build you're seeing.
$("version").textContent = "M2";

renderAttribution($("attribution"));
renderChecks($("checks"), basicChecks());

// ---------- The panorama ----------
const view = new PanoramaView($<HTMLCanvasElement>("panorama"));
view.heading = TEST_LOCATION.lookToward;
const loading = new LoadingIndicator($("loading"), $("loading-text"), $("loading-bar"));

function redraw() {
  view.draw();
  $("heading").textContent = `${Math.round(wrap360(view.heading))}°`;
}
// Redraw whenever the canvas changes size (e.g. phone rotated)
new ResizeObserver(redraw).observe($("panorama"));

// ---------- Controls ----------
const TURN_STEP_DEG = 15;
$("turn-left").onclick = () => {
  view.heading = wrap360(view.heading - TURN_STEP_DEG);
  redraw();
};
$("turn-right").onclick = () => {
  view.heading = wrap360(view.heading + TURN_STEP_DEG);
  redraw();
};

const fovSelect = $<HTMLSelectElement>("fov");
fovSelect.onchange = () => {
  view.fovDeg = Number(fovSelect.value);
  redraw();
};

const distanceSelect = $<HTMLSelectElement>("distance");
for (const km of DISTANCE_CHOICES_KM) {
  distanceSelect.add(new Option(`${km} km`, String(km), km === DEFAULT_MAX_DISTANCE_KM, km === DEFAULT_MAX_DISTANCE_KM));
}
distanceSelect.onchange = () => runSkyline();

$("test-location").onclick = () => {
  view.heading = TEST_LOCATION.lookToward;
  runSkyline();
};

// ---------- Background worker ----------
const worker = new Worker(new URL("./workers/terrain.worker.ts", import.meta.url), { type: "module" });

worker.onmessage = (event: MessageEvent<FromWorker>) => {
  const msg = event.data;
  if (msg.type === "progress" && msg.stage === "tiles") {
    loading.show(`Downloading elevation tiles… ${msg.done} / ${msg.total}`, msg.done / msg.total);
  } else if (msg.type === "progress" && msg.stage === "compute") {
    loading.show("Calculating skyline…");
  } else if (msg.type === "result") {
    loading.hide();
    console.info(`Skyline calculated in ${msg.ms} ms (${msg.tilesTotal} tiles)`);
    view.data = msg.skyline;
    view.maxDistM = msg.maxDistKm * 1000;
    const missing = msg.tilesFailed > 0 ? ` · ⚠ ${msg.tilesFailed}/${msg.tilesTotal} tiles failed` : "";
    $("location").textContent =
      `${TEST_LOCATION.name} · ${TEST_LOCATION.lat.toFixed(4)}, ${TEST_LOCATION.lon.toFixed(4)} · ` +
      `eye at ${Math.round(msg.viewerElevM).toLocaleString()} m${missing}`;
    redraw();
  } else if (msg.type === "error") {
    loading.show(`Problem: ${msg.message}`, 0);
  }
};

/** Ask the worker to (re)calculate the skyline for the test location. */
function runSkyline() {
  loading.show("Starting…", 0);
  const request: ToWorker = {
    type: "compute",
    lat: TEST_LOCATION.lat,
    lon: TEST_LOCATION.lon,
    maxDistKm: Number(distanceSelect.value),
    azStepDeg: AZIMUTH_STEP_DEG,
  };
  worker.postMessage(request);
}

redraw();
runSkyline();
