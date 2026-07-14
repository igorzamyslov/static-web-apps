import { defineConfig } from "vite";

// Relative base so the app works under the GitHub Pages subpath
// (…/pdf-diff/), including the pdf.js worker asset URL.
export default defineConfig({
  base: "./",
});
