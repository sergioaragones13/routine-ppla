import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        main: resolve(rootDir, "index.html"),
        workout: resolve(rootDir, "workout.html"),
        fullRoutine: resolve(rootDir, "full-routine.html"),
        social: resolve(rootDir, "social.html")
      }
    }
  }
});
