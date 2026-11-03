import { distance, hasLineOfSight } from "./geometry.ts";
import type { Bitmap, MapData, Point } from "./types.ts";

export interface SpawnGroup {
  /** Indizes in map.spawns. */
  members: number[];
  /** Summe der Grundhäufigkeit (0–1). */
  share: number;
  /** Häufigkeitsgewichteter Mittelpunkt. */
  center: Point;
  /** Vorherrschende Blickrichtung in Grad oder null, wenn uneinheitlich bzw. unbekannt. */
  facing: number | null;
  /** Seltener Bereich (unter MAJOR_SHARE): nur angedeutet, nicht als Fläche gezeigt. */
  minor: boolean;
}

/**
 * Punkte gehören zusammen, wenn sie nah beieinander liegen und keine Wand dazwischen ist.
 * Gemessen: ab ~25 m begrenzen nur noch die Wände die Gruppen (Silkworm 16, Cachette 12).
 */
export const GROUP_LINK_M = 25;
/** Bereiche mit weniger Anteil sind selten (Silkworm: 9 große, Cachette: 7 große Bereiche). */
export const MAJOR_SHARE = 0.03;
/** Ab dieser Einigkeit (Länge des mittleren Richtungsvektors) gilt eine Richtung als vorherrschend. */
const FACING_AGREEMENT = 0.6;

export function groupSpawns(map: MapData, walls: Bitmap, linkM = GROUP_LINK_M): SpawnGroup[] {
  const n = map.spawns.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i: number): number => {
    let r = i;
    while (parent[r] !== r) r = parent[r] ?? r;
    parent[i] = r;
    return r;
  };
  const linkPx = linkM / map.mPerPx;
  const pts: Point[] = map.spawns.map((s) => [s.x, s.y]);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = pts[i];
      const b = pts[j];
      if (!a || !b) continue;
      if (distance(a, b) <= linkPx && hasLineOfSight(walls, a, b)) parent[find(i)] = find(j);
    }
  }

  const byRoot = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    byRoot.set(r, [...(byRoot.get(r) ?? []), i]);
  }

  const groups: SpawnGroup[] = [];
  for (const members of byRoot.values()) {
    let share = 0;
    let cx = 0;
    let cy = 0;
    let fx = 0;
    let fy = 0;
    let fw = 0;
    for (const i of members) {
      const s = map.spawns[i];
      if (!s) continue;
      share += s.share;
      cx += s.x * s.share;
      cy += s.y * s.share;
      if (s.facing !== null) {
        const a = (s.facing * Math.PI) / 180;
        fx += Math.cos(a) * s.share;
        fy += Math.sin(a) * s.share;
        fw += s.share;
      }
    }
    const agreement = fw > 0 ? Math.hypot(fx, fy) / fw : 0;
    groups.push({
      members,
      share,
      center: share > 0 ? [cx / share, cy / share] : (pts[members[0] ?? 0] ?? [0, 0]),
      facing: agreement >= FACING_AGREEMENT ? ((Math.atan2(fy, fx) * 180) / Math.PI + 360) % 360 : null,
      minor: share < MAJOR_SHARE,
    });
  }
  return groups.sort((a, b) => b.share - a.share);
}

/** Konvexe Hülle (Monotone Chain), für die Fläche einer Gruppe. */
export function convexHull(points: readonly Point[]): Point[] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length <= 2) return p;
  const cross = (o: Point, a: Point, b: Point) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Point[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2] as Point, lower[lower.length - 1] as Point, q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: Point[] = [];
  for (const q of [...p].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2] as Point, upper[upper.length - 1] as Point, q) <= 0) upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** Kürzester verbindender Baum (Prim) als Kantenliste, für die Spur eines Bereichs. */
export function spanningTree(points: readonly Point[]): [Point, Point][] {
  if (points.length < 2) return [];
  const inTree = new Set<number>([0]);
  const edges: [Point, Point][] = [];
  while (inTree.size < points.length) {
    let best: [number, number, number] | null = null;
    for (const i of inTree) {
      for (let j = 0; j < points.length; j++) {
        if (inTree.has(j)) continue;
        const a = points[i];
        const b = points[j];
        if (!a || !b) continue;
        const d = distance(a, b);
        if (!best || d < best[2]) best = [i, j, d];
      }
    }
    if (!best) break;
    const a = points[best[0]];
    const b = points[best[1]];
    if (a && b) edges.push([a, b]);
    inTree.add(best[1]);
  }
  return edges;
}
