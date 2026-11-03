import type { Bitmap, MapData, MapIndexEntry } from "../features/spawn-model/types.ts";

const base = import.meta.env.BASE_URL;

export function mapAsset(id: string, file: string): string {
  return `${base}maps/${id}/${file}`;
}

export async function loadIndex(): Promise<MapIndexEntry[]> {
  const res = await fetch(`${base}maps/index.json`);
  return (await res.json()) as MapIndexEntry[];
}

export async function loadMap(id: string): Promise<MapData> {
  const res = await fetch(mapAsset(id, "data.json"));
  return (await res.json()) as MapData;
}

/** Liest eine Schwarz-Weiß-PNG als Bitmap (hell = 1). */
export async function loadBitmap(url: string): Promise<Bitmap> {
  const img = new Image();
  img.src = url;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas nicht verfügbar");
  ctx.drawImage(img, 0, 0);
  const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const data = new Uint8Array(canvas.width * canvas.height);
  for (let i = 0; i < data.length; i++) data[i] = (rgba[i * 4] ?? 0) > 127 ? 1 : 0;
  return { width: canvas.width, height: canvas.height, data };
}
