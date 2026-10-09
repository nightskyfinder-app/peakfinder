// terrain.worker.ts — runs in a background thread (a "Web Worker").
// In M2 this is where the skyline math will happen, so the screen never freezes.
// For M1 it just answers a "ping" so we can confirm workers run on the deployed site.

// Messages the main page can send to this worker.
type WorkerRequest = { type: "ping" };

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  if (event.data.type === "ping") {
    self.postMessage({ type: "pong" });
  }
};

// Marks this file as a module so its names stay private to it.
export {};
