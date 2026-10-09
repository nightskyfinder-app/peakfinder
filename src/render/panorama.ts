// panorama.ts — draws the skyline picture on the canvas.
//
// How the picture maps to the world:
//   • Left/right = compass direction. The center of the screen is `heading`.
//   • Up/down    = angle above or below eye level.
//   • Normally 1° sideways = 1° up/down on screen, so mountains keep their true shape.
//     In the wide 360° view, heights are stretched so the skyline isn't a flat line.

import type { SkylineResult } from "../terrain/skyline";
import { wrap180, wrap360 } from "../terrain/geo";

// Colors (match the dark page theme)
const SKY = "#0f1720";
const GROUND = "#16202b";
const RIDGE = "200, 215, 230"; // r,g,b — used with varying transparency
const SKYLINE = "#f4f7fa";
const SCALE_BG = "#0b1118";
const SCALE_INK = "#c9d4de";
const SCALE_MUTED = "#6f8193";
const ACCENT = "#f0b44c";

const SCALE_HEIGHT = 34; // px reserved at the bottom for the heading scale

export class PanoramaView {
  heading = 0; // compass direction at the center of the screen, degrees
  fovDeg = 60; // how many degrees of compass the screen width shows
  data: SkylineResult | null = null;
  maxDistM = 100_000;

  private ctx: CanvasRenderingContext2D;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
  }

  /** Redraw everything. Call after changing heading, zoom, data or screen size. */
  draw(): void {
    const { canvas, ctx } = this;

    // Match the canvas's pixel grid to the screen (sharp lines on high-res phones)
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = SKY;
    ctx.fillRect(0, 0, w, h);

    const plotH = h - SCALE_HEIGHT;
    const pxPerDegX = w / this.fovDeg;

    if (this.data) this.drawTerrain(w, plotH, pxPerDegX);
    this.drawHeadingScale(w, h, pxPerDegX);
  }

  private drawTerrain(w: number, plotH: number, pxPerDegX: number): void {
    const ctx = this.ctx;
    const d = this.data!;
    const step = d.azStepDeg;

    // Which rays are on screen (plus one extra each side so lines reach the edges).
    // Each gets its screen x, counted outward from the center so x always increases
    // left→right, even across north (0°/360°).
    const halfRays = Math.min(Math.ceil(this.fovDeg / 2 / step) + 1, Math.floor(d.count / 2));
    const centerRay = Math.round(wrap360(this.heading) / step);
    const centerOffsetDeg = wrap180(centerRay * step - this.heading); // tiny: heading may fall between rays
    const rays: { i: number; x: number }[] = [];
    for (let k = -halfRays; k <= halfRays; k++) {
      rays.push({
        i: (((centerRay + k) % d.count) + d.count) % d.count,
        x: w / 2 + (k * step + centerOffsetDeg) * pxPerDegX,
      });
    }

    // Vertical scale: highest & lowest skyline angle on screen
    let hi = -90;
    let lo = 90;
    for (const { i } of rays) {
      hi = Math.max(hi, d.skyAngle[i]);
      lo = Math.min(lo, d.skyAngle[i]);
    }
    const range = Math.max(hi - lo, 0.5);
    let pxPerDegY = pxPerDegX;
    // Wide views: stretch heights so the skyline fills about half the picture
    if (this.fovDeg > 90) pxPerDegY = Math.max(pxPerDegX, (plotH * 0.5) / range);
    // Center the skyline about 35% down from the top (sky above, nearer ridges below),
    // but never push its highest point closer than 15% to the top edge.
    const topY = Math.max(plotH * 0.15, plotH * 0.35 - (range * pxPerDegY) / 2);
    const yOf = (angle: number) => topY + (hi - angle) * pxPerDegY;

    // Horizon line (exactly eye level), dashed and faint
    const horizonY = yOf(0);
    if (horizonY > 0 && horizonY < plotH) {
      ctx.save();
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = "rgba(240, 180, 76, 0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(w, horizonY);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = "rgba(240, 180, 76, 0.6)";
      ctx.font = "10px system-ui, sans-serif";
      ctx.fillText("eye level", 6, horizonY - 4);
    }

    // Ground: fill everything below the skyline
    ctx.beginPath();
    rays.forEach(({ i, x }, n) => {
      const y = yOf(d.skyAngle[i]);
      if (n === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(rays[rays.length - 1].x, plotH);
    ctx.lineTo(rays[0].x, plotH);
    ctx.closePath();
    ctx.fillStyle = GROUND;
    ctx.fill();

    // Ridge lines: connect each crest to the matching crest in the next ray.
    // Grouped into 6 brightness levels by distance (near = bright, far = faint).
    const LEVELS = 6;
    const paths = Array.from({ length: LEVELS }, () => new Path2D());
    for (let n = 0; n < rays.length - 1; n++) {
      const { i, x: xi } = rays[n];
      const { i: j, x: xj } = rays[n + 1]; // the next ray, one step to the right
      for (let a = d.ridgeStart[i]; a < d.ridgeStart[i + 1]; a++) {
        const b = matchRidge(d, j, d.ridgeAngle[a], d.ridgeDist[a]);
        if (b < 0) continue;
        const level = Math.min(LEVELS - 1, Math.floor((d.ridgeDist[a] / this.maxDistM) * LEVELS));
        paths[level].moveTo(xi, yOf(d.ridgeAngle[a]));
        paths[level].lineTo(xj, yOf(d.ridgeAngle[b]));
      }
    }
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    paths.forEach((p, level) => {
      const alpha = 0.85 - (level / (LEVELS - 1)) * 0.65; // 0.85 near → 0.20 far
      ctx.strokeStyle = `rgba(${RIDGE}, ${alpha})`;
      ctx.stroke(p);
    });

    // Skyline on top: the brightest, thickest line
    ctx.beginPath();
    rays.forEach(({ i, x }, n) => {
      const y = yOf(d.skyAngle[i]);
      if (n === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = SKYLINE;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.stroke();

    if (this.fovDeg > 90) {
      ctx.fillStyle = SCALE_MUTED;
      ctx.font = "10px system-ui, sans-serif";
      ctx.fillText("heights stretched in wide view", 6, 14);
    }
  }

  /** The compass strip along the bottom: ticks, degrees, and N/NE/E… letters. */
  private drawHeadingScale(w: number, h: number, pxPerDegX: number): void {
    const ctx = this.ctx;
    const top = h - SCALE_HEIGHT;
    ctx.fillStyle = SCALE_BG;
    ctx.fillRect(0, top, w, SCALE_HEIGHT);

    // Pick label spacing so labels are at least ~55 px apart
    const labelStep = [5, 10, 15, 30, 45, 90].find((s) => s * pxPerDegX >= 55) ?? 90;
    const tickStep = labelStep >= 30 ? 5 : 1; // small ticks every 5° or every 1°
    const names: Record<number, string> = { 0: "N", 45: "NE", 90: "E", 135: "SE", 180: "S", 225: "SW", 270: "W", 315: "NW" };

    const left = this.heading - this.fovDeg / 2;
    const first = Math.floor(left / tickStep) * tickStep;
    ctx.textAlign = "center";
    for (let az = first; az <= left + this.fovDeg + tickStep; az += tickStep) {
      const a = wrap360(az);
      const x = w / 2 + (az - this.heading) * pxPerDegX;
      const isLabel = Math.round(a) % labelStep === 0;
      const tickLen = isLabel ? 8 : a % 5 === 0 ? 5 : 3;
      ctx.strokeStyle = SCALE_MUTED;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, top + tickLen);
      ctx.stroke();

      const name = names[Math.round(a)];
      if (name && (isLabel || pxPerDegX * 45 >= 40)) {
        ctx.fillStyle = name.length === 1 ? ACCENT : SCALE_INK;
        ctx.font = "bold 13px system-ui, sans-serif";
        ctx.fillText(name, x, top + 25);
      } else if (isLabel) {
        ctx.fillStyle = SCALE_INK;
        ctx.font = "11px system-ui, sans-serif";
        ctx.fillText(`${Math.round(a)}°`, x, top + 24);
      }
    }

    // Center marker: a small triangle showing exactly where "heading" is
    ctx.fillStyle = ACCENT;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 6, top);
    ctx.lineTo(w / 2 + 6, top);
    ctx.lineTo(w / 2, top + 7);
    ctx.closePath();
    ctx.fill();
    ctx.textAlign = "start";
  }
}

/**
 * In ray j, find the crest that continues the ridge at (angle, dist) from the
 * neighboring ray: the one at a similar distance and similar angle.
 * Returns its index, or −1 if there's no good match (the ridge ends here).
 */
function matchRidge(d: SkylineResult, j: number, angle: number, dist: number): number {
  let best = -1;
  let bestGap = Infinity;
  const maxGap = dist * 0.08 + 150; // allow 8% distance change + 150 m between neighboring rays
  for (let b = d.ridgeStart[j]; b < d.ridgeStart[j + 1]; b++) {
    const gap = Math.abs(d.ridgeDist[b] - dist);
    if (gap <= maxGap && gap < bestGap && Math.abs(d.ridgeAngle[b] - angle) < 0.6) {
      best = b;
      bestGap = gap;
    }
  }
  return best;
}
