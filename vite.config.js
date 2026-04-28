import { defineConfig } from "vite";
import cesium from "vite-plugin-cesium";

export default defineConfig({
  plugins: [cesium()],
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
  build: {
    target: "es2020",
  },
});
