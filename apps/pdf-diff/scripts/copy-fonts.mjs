// Copy pdf.js standard-font data next to the app so it is served alongside it.
// Runs before `vite` / `vite build`; output lives in public/ (git-ignored).
import { cp } from "node:fs/promises";

await cp("node_modules/pdfjs-dist/standard_fonts", "public/standard_fonts", { recursive: true });
