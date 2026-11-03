import { describe, expect, it } from "vitest";
import { convexHull, groupSpawns } from "./groups.ts";
import type { Bitmap, MapData } from "./types.ts";

function bitmap(width: number, height: number, set: (x: number, y: number) => boolean): Bitmap {
  const data = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data[y * width + x] = set(x, y) ? 1 : 0;
  return { width, height, data };
}

// Wand bei x = 100 über die volle Höhe.
const walls = bitmap(300, 100, (x) => x >= 99 && x <= 101);

const map: MapData = {
  id: "test",
  size: [300, 100],
  imageScale: 1,
  mPerPx: 0.2,
  spawns: [
    { x: 60, y: 50, n: 4, share: 0.4, facing: 0 },
    { x: 80, y: 50, n: 2, share: 0.2, facing: 0 },
    { x: 120, y: 50, n: 2, share: 0.2, facing: 180 },
    { x: 280, y: 50, n: 2, share: 0.2, facing: null },
  ],
  starts: {},
  model: { wDminPerCell: 2.9, cellPx: 100, blockM: 4, capM: 46 },
  spawnCount: 10,
};

describe("Spawn-Gruppen", () => {
  const groups = groupSpawns(map, walls);

  it("fasst nahe Punkte ohne Wand dazwischen zusammen", () => {
    expect(groups[0]?.members.sort()).toEqual([0, 1]);
  });

  it("trennt Punkte auf verschiedenen Seiten einer Wand", () => {
    const withWallNeighbour = groups.find((g) => g.members.includes(2));
    expect(withWallNeighbour?.members).toEqual([2]);
  });

  it("trennt weit entfernte Punkte", () => {
    expect(groups.find((g) => g.members.includes(3))?.members).toEqual([3]);
  });

  it("summiert die Anteile und behält die Gesamtsumme", () => {
    expect(groups[0]?.share).toBeCloseTo(0.6, 6);
    expect(groups.reduce((a, g) => a + g.share, 0)).toBeCloseTo(1, 6);
  });

  it("markiert Bereiche unter 3 % als selten", () => {
    const tiny = groupSpawns({ ...map, spawns: map.spawns.map((s, i) => (i === 3 ? { ...s, share: 0.01 } : s)) }, walls);
    expect(tiny.find((g) => g.members.includes(3))?.minor).toBe(true);
    expect(tiny[0]?.minor).toBe(false);
  });

  it("übernimmt eine einheitliche Blickrichtung", () => {
    expect(groups[0]?.facing).toBeCloseTo(0, 6);
  });
});

describe("Konvexe Hülle", () => {
  it("lässt innere Punkte weg", () => {
    const hull = convexHull([[0, 0], [10, 0], [10, 10], [0, 10], [5, 5]]);
    expect(hull).toHaveLength(4);
  });
});
