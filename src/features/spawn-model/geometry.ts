import type { Bitmap, Point } from "./types.ts";

/** Ränder ignorieren: Spieler und Spawnpunkte stehen oft direkt an einer Wand. */
const END_IGNORE_PX = 6;

export function isSet(bitmap: Bitmap, x: number, y: number): boolean {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= bitmap.width || yi >= bitmap.height) return true;
  return bitmap.data[yi * bitmap.width + xi] === 1;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export function hasLineOfSight(walls: Bitmap, a: Point, b: Point): boolean {
  const len = distance(a, b);
  if (len <= 2 * END_IGNORE_PX + 2) return true;
  const steps = Math.ceil(len);
  for (let i = END_IGNORE_PX; i <= steps - END_IGNORE_PX; i++) {
    const t = i / steps;
    if (isSet(walls, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) return false;
  }
  return true;
}

/** Sichtfeld als Polygon: Strahlen rundum bis zur ersten Wand oder bis maxPx. */
export function sightPolygon(walls: Bitmap, pos: Point, maxPx: number, stepDeg = 2): Point[] {
  const out: Point[] = [];
  for (let deg = 0; deg < 360; deg += stepDeg) {
    const rad = (deg * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    let r = 4;
    while (r < maxPx && !isSet(walls, pos[0] + dx * r, pos[1] + dy * r)) r += 2;
    out.push([pos[0] + dx * r, pos[1] + dy * r]);
  }
  return out;
}

/** Nächste begehbare Stelle (Spirale um den Tipp-Punkt). */
export function snapToWalkable(walk: Bitmap, pos: Point, maxPx = 40): Point {
  if (isSet(walk, pos[0], pos[1])) return pos;
  for (let r = 2; r <= maxPx; r += 2) {
    for (let deg = 0; deg < 360; deg += 10) {
      const rad = (deg * Math.PI) / 180;
      const p: Point = [pos[0] + Math.cos(rad) * r, pos[1] + Math.sin(rad) * r];
      if (isSet(walk, p[0], p[1])) return p;
    }
  }
  return pos;
}
