import { describe, expect, it } from "vitest";
import { hasLineOfSight, sightPolygon, snapToWalkable } from "./geometry.ts";
import { predictSpawns, topIndices } from "./predict.ts";
import type { Bitmap, MapData } from "./types.ts";

function bitmap(width: number, height: number, set: (x: number, y: number) => boolean): Bitmap {
  const data = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data[y * width + x] = set(x, y) ? 1 : 0;
  return { width, height, data };
}

// 200×100, senkrechte Wand bei x = 100 von y = 0 bis 60.
const walls = bitmap(200, 100, (x, y) => x >= 99 && x <= 101 && y <= 60);

const map: MapData = {
  id: "test",
  size: [200, 100],
  imageScale: 1,
  mPerPx: 0.2,
  spawns: [
    { x: 20, y: 20, n: 10, share: 0.5, facing: 0 },
    { x: 180, y: 20, n: 5, share: 0.25, facing: 180 },
    { x: 180, y: 90, n: 5, share: 0.25, facing: 180 },
  ],
  starts: {},
  model: { wDminPerCell: 2.9, cellPx: 100, blockM: 4, capM: 46 },
  spawnCount: 20,
};

describe("Sichtlinie", () => {
  it("wird von einer Wand blockiert", () => {
    expect(hasLineOfSight(walls, [50, 20], [150, 20])).toBe(false);
  });
  it("ist frei, wo keine Wand im Weg ist", () => {
    expect(hasLineOfSight(walls, [50, 90], [150, 90])).toBe(true);
  });
});

describe("Sichtfeld", () => {
  it("endet an der Wand", () => {
    const poly = sightPolygon(walls, [50, 20], 300, 90);
    const east = poly[0];
    expect(east?.[0]).toBeLessThan(101);
  });
});

describe("Einrasten", () => {
  it("springt auf die nächste begehbare Stelle", () => {
    const walk = bitmap(100, 100, (x) => x >= 50);
    const p = snapToWalkable(walk, [40, 50]);
    expect(p[0]).toBeGreaterThanOrEqual(50);
  });
});

describe("Spawn-Vorhersage", () => {
  it("sperrt Punkte in Sicht eines Spielers", () => {
    const { blocked, p } = predictSpawns(map, walls, [[180, 60]]);
    expect(blocked[1]).toBe(true);
    expect(blocked[2]).toBe(true);
    expect(p[1]).toBe(0);
  });

  it("sperrt Punkte unterhalb des Mindestabstands", () => {
    const { blocked } = predictSpawns(map, walls, [[30, 20]]);
    expect(blocked[0]).toBe(true);
  });

  it("verteilt die Wahrscheinlichkeit auf freie Punkte mit Summe 1", () => {
    const { p } = predictSpawns(map, walls, [[50, 20]]);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });

  it("bevorzugt weiter entfernte Punkte", () => {
    const { p } = predictSpawns(map, walls, [[150, 40]]);
    expect(p[0]).toBeGreaterThan(0);
    expect(topIndices(p, 1)).toEqual([0]);
  });

  it("wählt trotzdem einen Punkt, wenn alle gesperrt sind", () => {
    const open = bitmap(200, 100, () => false);
    const { p } = predictSpawns(map, open, [[100, 50]]);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });
});
