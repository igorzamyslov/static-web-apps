#!/usr/bin/env node
// Generate the landing page that links to every app.
//
//   node scripts/generate-index.mjs <out-dir>
//
// Reads apps/*/app.json (optional) for a nicer title/description per app.

import { existsSync, readFileSync } from "node:fs";
import { writeFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const outDir = resolve(process.argv[2] ?? "_site");
const appsRoot = resolve("apps");

const names = (await readdir(appsRoot, { withFileTypes: true }))
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

const apps = names.map((name) => {
  const metaPath = join(appsRoot, name, "app.json");
  let meta = {};
  if (existsSync(metaPath)) {
    try {
      meta = JSON.parse(readFileSync(metaPath, "utf8"));
    } catch {
      /* ignore malformed metadata */
    }
  }
  return { name, title: meta.title ?? name, description: meta.description ?? "" };
});

const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]),
  );

const cards =
  apps
    .map(
      (a) => `      <a class="card" href="./${esc(a.name)}/">
        <h2>${esc(a.title)}</h2>
        ${a.description ? `<p>${esc(a.description)}</p>` : ""}
      </a>`,
    )
    .join("\n") || "      <p>No apps yet.</p>";

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Static web apps</title>
  <style>
    :root { color-scheme: light dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font: 16px/1.5 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: Canvas;
      color: CanvasText;
    }
    main { max-width: 900px; margin: 0 auto; padding: 3rem 1.25rem; }
    h1 { margin: 0 0 0.25rem; font-size: 2rem; }
    .subtitle { margin: 0 0 2rem; opacity: 0.7; }
    .grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
    .card {
      display: block;
      padding: 1.25rem;
      border: 1px solid color-mix(in srgb, CanvasText 15%, transparent);
      border-radius: 12px;
      text-decoration: none;
      color: inherit;
      transition: border-color 0.15s, transform 0.15s;
    }
    .card:hover { border-color: color-mix(in srgb, CanvasText 40%, transparent); transform: translateY(-2px); }
    .card h2 { margin: 0 0 0.35rem; font-size: 1.15rem; }
    .card p { margin: 0; opacity: 0.7; font-size: 0.95rem; }
  </style>
</head>
<body>
  <main>
    <h1>Static web apps</h1>
    <p class="subtitle">${apps.length} app${apps.length === 1 ? "" : "s"} published from this repo.</p>
    <div class="grid">
${cards}
    </div>
  </main>
</body>
</html>
`;

await writeFile(join(outDir, "index.html"), html);
console.log(`Wrote ${join(outDir, "index.html")} (${apps.length} apps)`);
