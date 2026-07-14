// Minimal, dependency-free build: copy src/ to dist/ and stamp the build time.
// Swap this out for Vite/esbuild/etc. — the only contract is "output to dist/".
import { cp, mkdir, rm, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const SRC = "src";
const OUT = "dist";

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

// Static asset.
await cp(join(SRC, "clock.js"), join(OUT, "clock.js"));

// Template index.html with the build timestamp.
let html = await readFile(join(SRC, "index.html"), "utf8");
html = html.replaceAll("__BUILD_TIME__", new Date().toISOString());
await writeFile(join(OUT, "index.html"), html);

console.log("clock: built dist/");
