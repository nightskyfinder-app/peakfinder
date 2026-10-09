// vite.config.ts — build settings.
// base "./" makes all file links relative, so the site works at
// https://<user>.github.io/peakfinder/ without hard-coding the repo name.
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  worker: { format: "es" }, // Web Workers are built as modern ES modules
});
