import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  root: ".",
  publicDir: "public",
  build: {
    outDir: "../docs",
    // Publish only the current bundle; the service worker owns offline copies.
    emptyOutDir: true,
    target: "es2020",
  },
});
