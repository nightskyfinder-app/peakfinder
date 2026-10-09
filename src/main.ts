// main.ts — the app's starting point. Runs when the page loads.
// M1: shows the placeholder page, device checks, attribution, and confirms
// the background worker starts. Later milestones plug in here.

import "./style.css";
import { renderAttribution } from "./ui/attribution";
import { basicChecks, renderChecks } from "./ui/checks";

// Shorthand: find an element by id (and complain clearly if it's missing).
function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el;
}

// Milestone label in the top-right, so you can tell on the phone which build you're seeing.
$("version").textContent = "M1";

renderAttribution($("attribution"));

const checksList = $("checks");
const checks = basicChecks();
renderChecks(checksList, [...checks, { label: "Background worker", ok: false, note: "starting…" }]);

// Start the terrain worker and send it a "ping". If it answers "pong",
// workers run correctly on this phone and on GitHub Pages.
const worker = new Worker(new URL("./workers/terrain.worker.ts", import.meta.url), { type: "module" });

const timeout = setTimeout(() => {
  renderChecks(checksList, [...checks, { label: "Background worker", ok: false, note: "no reply" }]);
}, 3000);

worker.onmessage = (event) => {
  if (event.data?.type === "pong") {
    clearTimeout(timeout);
    renderChecks(checksList, [...checks, { label: "Background worker", ok: true }]);
  }
};
worker.postMessage({ type: "ping" });
