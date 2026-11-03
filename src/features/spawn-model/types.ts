export type Point = readonly [number, number];

export interface Spawn {
  x: number;
  y: number;
  n: number;
  /** Anteil an allen gemessenen Respawns (0–1). */
  share: number;
  /** Blickrichtung beim Spawn in Grad, 0 = Osten, 90 = Süden; null = unbekannt. */
  facing: number | null;
}

export interface ModelParams {
  wDminPerCell: number;
  cellPx: number;
  blockM: number;
  capM: number;
}

export interface MapData {
  id: string;
  /** Kartenausschnitt in Pixeln; alle Koordinaten beziehen sich darauf. */
  size: Point;
  /** Faktor vom Ausschnitt zum Kartenbild map.webp. */
  imageScale: number;
  mPerPx: number;
  spawns: Spawn[];
  /** Startaufstellungen je Spielerzahl. */
  starts: Record<string, Point[]>;
  model: ModelParams;
  spawnCount: number;
}

export interface MapIndexEntry {
  id: string;
  name: string;
  measured: boolean;
}

/** Binärbild: 1 = Wand bzw. begehbar, je nach Verwendung. */
export interface Bitmap {
  width: number;
  height: number;
  data: Uint8Array;
}
