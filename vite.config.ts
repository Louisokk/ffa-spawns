import { defineConfig } from "vitest/config";

export default defineConfig({
  // Relative Pfade: läuft unter jedem GitHub-Pages-Unterpfad.
  base: "./",
  test: {
    include: ["src/**/*.test.ts"],
  },
});
