import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  root: ".",
  publicDir: "public",
  build: {
    outDir: "../docs",
    emptyOutDir: true,
    target: "es2020",
  },
});
