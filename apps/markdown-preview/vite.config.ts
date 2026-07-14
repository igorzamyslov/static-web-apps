import { defineConfig } from "vite";

// `base: "./"` makes every asset URL relative, so the built app works no matter
// which subpath it is served from (e.g. /<repo>/markdown-preview/).
export default defineConfig({
  base: "./",
});
