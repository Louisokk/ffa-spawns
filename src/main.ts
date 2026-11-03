import "./styles/tokens.css";
import "./styles/base.css";
import { renderGrid } from "./features/map-grid/map-grid.ts";
import { renderMapView } from "./features/map-view/map-view.ts";

const root = document.querySelector<HTMLElement>("#app");

async function route(): Promise<void> {
  if (!root) return;
  const match = /^#\/map\/([a-z0-9-]+)$/.exec(location.hash);
  try {
    if (match?.[1]) await renderMapView(root, match[1]);
    else await renderGrid(root);
  } catch {
    root.innerHTML = `<p class="load-error">Laden fehlgeschlagen. <a href="#/">Zur Übersicht</a></p>`;
  }
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", () => void route());
void route();

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
}
