import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  root: ".",
  publicDir: "public",
  build: {
    outDir: "../docs",
    // Keep already-published hashed assets so cached HTML still loads correctly.
    emptyOutDir: false,
    target: "es2020",
  },
});
