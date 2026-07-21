import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/promosift/" : "/",
  build: { target: "es2022" },
  test: { environment: "node", include: ["tests/**/*.{test,spec}.ts"] }
}));
