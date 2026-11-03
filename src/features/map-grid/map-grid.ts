import { loadIndex, mapAsset } from "../../lib/data.ts";
import "./map-grid.css";

export async function renderGrid(root: HTMLElement): Promise<void> {
  // Vermessene Maps zuerst, dann alphabetisch.
  const maps = (await loadIndex()).sort((a, b) => Number(b.measured) - Number(a.measured) || a.name.localeCompare(b.name));
  root.innerHTML = "";

  const view = document.createElement("main");
  view.className = "map-grid";

  const head = document.createElement("header");
  head.className = "map-grid__head";
  head.innerHTML = `<h1 class="map-grid__title">FFA Spawns</h1><p class="map-grid__sub">Modern Warfare 4 · Frei für alle</p>`;
  view.append(head);

  const list = document.createElement("ul");
  list.className = "map-grid__list";
  for (const m of maps) {
    const item = document.createElement("li");
    const card = document.createElement(m.measured ? "a" : "div");
    card.className = `map-card${m.measured ? "" : " map-card--locked"}`;
    if (card instanceof HTMLAnchorElement) card.href = `#/map/${m.id}`;
    card.innerHTML = `
      <img class="map-card__img" src="${mapAsset(m.id, "thumb.webp")}" alt="" loading="lazy" decoding="async">
      <span class="map-card__name">${m.name}</span>
      ${m.measured ? "" : `<span class="map-card__badge">bald</span>`}`;
    item.append(card);
    list.append(item);
  }
  view.append(list);
  root.append(view);
}
