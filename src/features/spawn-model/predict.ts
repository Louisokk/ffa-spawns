import { distance, hasLineOfSight } from "./geometry.ts";
import type { Bitmap, MapData, Point } from "./types.ts";

export interface Prediction {
  /** Punkt ist gesperrt: in Sicht eines Spielers oder zu nah. */
  blocked: boolean[];
  /** Wahrscheinlichkeit je Spawnpunkt (Summe 1). */
  p: number[];
}

/**
 * Wahrscheinlichster nächster Spawn bei gegebenen Spielerpositionen.
 * Regeln aus der Messung: keine Sichtlinie, Mindestabstand, Abstand zum nächsten Spieler
 * zählt bis capM, dazu die gemessene Grundhäufigkeit des Punkts.
 */
export function predictSpawns(map: MapData, walls: Bitmap, players: readonly Point[]): Prediction {
  const { wDminPerCell, cellPx, blockM, capM } = map.model;
  const blockPx = blockM / map.mPerPx;
  const capPx = capM / map.mPerPx;
  const blocked: boolean[] = [];
  const score: number[] = [];

  for (const s of map.spawns) {
    const pos: Point = [s.x, s.y];
    const dmin = players.length ? Math.min(...players.map((q) => distance(pos, q))) : capPx;
    const seen = players.some((q) => hasLineOfSight(walls, pos, q));
    blocked.push(seen || dmin < blockPx);
    score.push((wDminPerCell * Math.min(dmin, capPx)) / cellPx + Math.log(Math.max(s.share, 1e-6)));
  }

  // Sind alle Punkte gesperrt, wählt das Spiel trotzdem einen: dann ohne Sperre bewerten.
  const usable = blocked.some((b) => !b) ? blocked.map((b) => !b) : blocked.map(() => true);
  const max = Math.max(...score.filter((_, i) => usable[i]));
  const w = score.map((v, i) => (usable[i] ? Math.exp(v - max) : 0));
  const sum = w.reduce((a, b) => a + b, 0);
  return { blocked, p: w.map((v) => v / sum) };
}

export function topIndices(p: readonly number[], k: number): number[] {
  return p
    .map((v, i) => [v, i] as const)
    .sort((a, b) => b[0] - a[0])
    .slice(0, k)
    .filter(([v]) => v > 0)
    .map(([, i]) => i);
}
