# FFA Spawns · Modern Warfare 4

Statische Web-App (Vite + TypeScript, ohne Framework) für GitHub Pages. Für jede FFA-Map zeigt sie:

- Startpunkte
- Respawn-Punkte, Größe nach gemessener Häufigkeit
- Blickrichtung beim Spawn
- Modus „Tippe, wo du stehst“: Sichtfeld, gesperrte Spawns und die 3 wahrscheinlichsten nächsten Spawns

## Befehle

| Befehl | Zweck |
|---|---|
| `pnpm dev` | Entwicklungsserver |
| `pnpm typecheck` / `pnpm lint` / `pnpm test` | Prüfungen |
| `pnpm build` | Ausgabe in `dist/`, relative Pfade, läuft unter jedem Pages-Unterpfad |

## Daten

`public/maps/` wird erzeugt von `tools/webdata.py` im Elternprojekt. Messung und Herleitung stehen in `../README.md`.

| Datei | Inhalt |
|---|---|
| `index.json` | alle FFA-Maps, `measured` = vermessen |
| `<map>/data.json` | Respawns (Häufigkeit, Blickrichtung), Startaufstellungen, Modell-Parameter. Koordinaten in Pixeln des Kartenausschnitts |
| `<map>/walls.png` | Wände: Umrisse, schraffierte Gebäude, außerhalb der Spielfläche |
| `<map>/walk.png` | begehbare Fläche (wo Bots standen), zum Einrasten des Tipp-Punkts |
| `<map>/map.webp`, `thumb.webp` | Kartenbild, Vorschau |

## Modell (`src/features/spawn-model`)

Gesperrt ist ein Spawnpunkt mit freier Sichtlinie zu einem Spieler oder näher als `blockM`. Unter den übrigen wählt das Modell nach Abstand (gekappt bei `capM`) plus gemessener Grundhäufigkeit. In der App ist nur der Nutzer selbst als Spieler gesetzt. Die Anzeige ist deshalb eine Tendenz, keine exakte Wahrscheinlichkeit.
