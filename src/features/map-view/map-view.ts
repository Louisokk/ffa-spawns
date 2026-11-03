import { loadBitmap, loadIndex, loadMap, mapAsset } from "../../lib/data.ts";
import { sightPolygon, snapToWalkable } from "../spawn-model/geometry.ts";
import { predictSpawns, topIndices } from "../spawn-model/predict.ts";
import type { Bitmap, MapData, Point } from "../spawn-model/types.ts";
import { clear, el } from "./svg.ts";
import "./map-view.css";

type Layer = "spawns" | "starts" | "facing";

const LAYERS: { id: Layer; label: string; icon: string }[] = [
  { id: "spawns", label: "Respawn", icon: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6"/></svg>` },
  { id: "starts", label: "Start", icon: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l8 8-8 8-8-8z"/></svg>` },
  { id: "facing", label: "Blick", icon: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h11M11 6l6 6-6 6"/></svg>` },
];

const LIVE_PLAYERS = "8";
const SIGHT_MAX_M = 70;
const OFF_RADIUS = 5;
const BADGE_RADIUS = 8;

function spawnRadius(share: number): number {
  return 5 + 45 * share;
}

export async function renderMapView(root: HTMLElement, id: string): Promise<void> {
  const [index, map, walls, walk] = await Promise.all([
    loadIndex(),
    loadMap(id),
    loadBitmap(mapAsset(id, "walls.png")),
    loadBitmap(mapAsset(id, "walk.png")),
  ]);
  const name = index.find((m) => m.id === id)?.name ?? id;
  const [w, h] = map.size;
  const state: { layers: Set<Layer>; you: Point | null } = { layers: new Set(["spawns", "starts"]), you: null };

  root.innerHTML = "";
  const view = document.createElement("main");
  view.className = "map-view";
  view.innerHTML = `
    <header class="map-view__bar">
      <a class="map-view__back" href="#/" aria-label="Zurück zur Übersicht">‹</a>
      <h1 class="map-view__title">${name}</h1>
      <span class="map-view__meta">${map.spawnCount} Spawns</span>
    </header>
    <div class="map-view__stage">
      <div class="map-view__frame" style="--ratio:${w / h}">
        <img class="map-view__img" src="${mapAsset(id, "map.webp")}" alt="Taktikkarte ${name}">
      </div>
      <p class="hint" role="status"></p>
    </div>
    <nav class="toggles" aria-label="Ebenen"></nav>`;
  root.append(view);

  const frame = view.querySelector<HTMLElement>(".map-view__frame");
  const hint = view.querySelector<HTMLElement>(".hint");
  const nav = view.querySelector<HTMLElement>(".toggles");
  if (!frame || !hint || !nav) return;

  const svg = el("svg", { class: "overlay", viewBox: `0 0 ${w} ${h}`, role: "img", "aria-label": "Spawnpunkte" }, frame);
  const gSight = el("g", {}, svg);
  const gStarts = el("g", {}, svg);
  const gFacing = el("g", {}, svg);
  const gSpawns = el("g", {}, svg);
  const gYou = el("g", {}, svg);

  for (const layer of LAYERS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `toggle toggle--${layer.id}`;
    btn.innerHTML = `${layer.icon}<span class="toggle__label">${layer.label}</span>`;
    btn.addEventListener("click", () => {
      if (state.layers.has(layer.id)) state.layers.delete(layer.id);
      else state.layers.add(layer.id);
      draw();
    });
    nav.append(btn);
  }
  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "toggle toggle--reset";
  reset.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg><span class="toggle__label">Reset</span>`;
  reset.addEventListener("click", () => {
    state.you = null;
    draw();
  });
  nav.append(reset);

  const toMap = (ev: PointerEvent): Point | null => {
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(ctm.inverse());
    return [p.x, p.y];
  };
  let dragging = false;
  svg.addEventListener("pointerdown", (ev) => {
    const p = toMap(ev);
    if (!p) return;
    dragging = true;
    svg.setPointerCapture(ev.pointerId);
    state.you = snapToWalkable(walk, p);
    draw();
  });
  svg.addEventListener("pointermove", (ev) => {
    if (!dragging) return;
    const p = toMap(ev);
    if (!p) return;
    state.you = snapToWalkable(walk, p);
    draw();
  });
  const stop = () => {
    dragging = false;
  };
  svg.addEventListener("pointerup", stop);
  svg.addEventListener("pointercancel", stop);

  function draw(): void {
    for (const btn of nav?.querySelectorAll<HTMLButtonElement>(".toggle") ?? []) {
      const layer = LAYERS.find((l) => btn.classList.contains(`toggle--${l.id}`));
      if (layer) btn.setAttribute("aria-pressed", String(state.layers.has(layer.id)));
    }
    reset.hidden = state.you === null;
    drawSight(gSight, walls, map, state.you);
    const counts = drawSpawns(gSpawns, gFacing, map, walls, state);
    if (hint) {
      hint.textContent = counts
        ? `● ${counts.open} möglich · ○ ${counts.blocked} gesperrt`
        : "Halte und zieh dorthin, wo du stehst";
    }
    drawStarts(gStarts, map, state.layers.has("starts"));
    drawYou(gYou, state.you);
  }

  draw();
}

function drawSight(g: SVGGElement, walls: Bitmap, map: MapData, you: Point | null): void {
  clear(g);
  if (!you) return;
  const poly = sightPolygon(walls, you, SIGHT_MAX_M / map.mPerPx);
  el("polygon", { class: "sight", points: poly.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") }, g);
  el("circle", { class: "block-zone", cx: you[0], cy: you[1], r: map.model.blockM / map.mPerPx }, g);
}

/** Ohne Position: Grundhäufigkeit. Mit Position: möglich (Größe = aktuelle Chance) oder gesperrt. */
function drawSpawns(
  g: SVGGElement,
  gUnder: SVGGElement,
  map: MapData,
  walls: Bitmap,
  state: { layers: Set<Layer>; you: Point | null },
): { open: number; blocked: number } | null {
  clear(g);
  clear(gUnder);
  const pred = state.you ? predictSpawns(map, walls, [state.you]) : null;
  const top = pred ? topIndices(pred.p, 3) : [];
  if (!state.layers.has("spawns") && !pred) return null;

  map.spawns.forEach((s, i) => {
    const blocked = pred?.blocked[i] ?? false;
    const rank = top.indexOf(i);
    if (!state.layers.has("spawns") && rank < 0) return;
    const r = pred ? (blocked ? OFF_RADIUS : 4 + 70 * (pred.p[i] ?? 0)) : spawnRadius(s.share);
    const mod = pred ? (blocked ? " spawn--off" : " spawn--on") : "";

    if (state.you && rank >= 0) {
      el("line", { class: "threat-line", x1: state.you[0], y1: state.you[1], x2: s.x, y2: s.y }, gUnder);
    }
    const node = el("g", { class: `spawn${mod}${rank >= 0 ? " spawn--top" : ""}`, transform: `translate(${s.x} ${s.y})` }, g);
    if (rank >= 0) el("circle", { class: "spawn__pulse", r: r + 6 }, node);
    el("circle", { class: "spawn__dot", r }, node);
    if (rank >= 0) {
      el("circle", { class: "spawn__badge", cx: r + 4, cy: -r - 4, r: BADGE_RADIUS }, node);
      const t = el("text", { class: "spawn__rank", x: r + 4, y: -r - 3 }, node);
      t.textContent = String(rank + 1);
    }

    if (state.layers.has("facing") && s.facing !== null && !blocked) {
      const a = (s.facing * Math.PI) / 180;
      const x0 = s.x + Math.cos(a) * (r + 2);
      const y0 = s.y + Math.sin(a) * (r + 2);
      const x1 = s.x + Math.cos(a) * (r + 22);
      const y1 = s.y + Math.sin(a) * (r + 22);
      const hx = Math.cos(a + 2.6) * 7;
      const hy = Math.sin(a + 2.6) * 7;
      const kx = Math.cos(a - 2.6) * 7;
      const ky = Math.sin(a - 2.6) * 7;
      el("path", {
        class: "facing",
        d: `M${x0} ${y0}L${x1} ${y1}M${x1 + hx} ${y1 + hy}L${x1} ${y1}L${x1 + kx} ${y1 + ky}`,
      }, gUnder);
    }
  });
  if (!pred) return null;
  const nBlocked = pred.blocked.filter(Boolean).length;
  return { open: pred.blocked.length - nBlocked, blocked: nBlocked };
}

function drawStarts(g: SVGGElement, map: MapData, show: boolean): void {
  clear(g);
  if (!show) return;
  for (const [x, y] of map.starts[LIVE_PLAYERS] ?? []) {
    el("rect", { class: "start-point", x: x - 7, y: y - 7, width: 14, height: 14, transform: `rotate(45 ${x} ${y})` }, g);
  }
}

function drawYou(g: SVGGElement, you: Point | null): void {
  clear(g);
  if (!you) return;
  el("circle", { class: "you", cx: you[0], cy: you[1], r: 9 }, g);
}
