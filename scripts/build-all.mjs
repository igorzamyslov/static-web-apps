#!/usr/bin/env node
// Build every app into _build/<app>. Used by CI to verify that all apps still
// compile (each app's build also type-checks it). Run it locally the same way:
//
//   node scripts/build-all.mjs
//
import { readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const appsRoot = resolve("apps");
const apps = (await readdir(appsRoot, { withFileTypes: true }))
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

for (const app of apps) {
  console.log(`\n=== building ${app} ===`);
  execFileSync(process.execPath, ["scripts/build-app.mjs", app, `_build/${app}`], {
    stdio: "inherit",
  });
}

console.log(`\nBuilt ${apps.length} app(s).`);
