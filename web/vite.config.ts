import { defineConfig } from "vite";
import packageJson from "./package.json" with { type: "json" };

export default defineConfig({
  base: "./",
  root: ".",
  publicDir: "public",
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  build: {
    outDir: "../docs",
    // Publish only the current bundle; the service worker owns offline copies.
    emptyOutDir: true,
    target: "es2020",
  },
});
