#!/usr/bin/env node
// Build a single app into an output directory.
//
//   node scripts/build-app.mjs <app-name> <out-dir>
//
// Convention:
//   - If apps/<app>/package.json exists, run `npm run build` and publish
//     apps/<app>/dist/.
//   - Otherwise the app is plain static: publish the whole apps/<app>/ folder
//     as-is (app.json is treated as metadata and left out).

import { existsSync } from "node:fs";
import { cp, mkdir, rm, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";

const [app, outArg] = process.argv.slice(2);
if (!app || !outArg) {
  console.error("usage: node scripts/build-app.mjs <app-name> <out-dir>");
  process.exit(1);
}

const appDir = resolve("apps", app);
const outDir = resolve(outArg);

if (!existsSync(appDir)) {
  console.error(`No such app: ${appDir}`);
  process.exit(1);
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const pkg = join(appDir, "package.json");

if (existsSync(pkg)) {
  // Built app: install deps and run the build script, then publish dist/.
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const install = existsSync(join(appDir, "package-lock.json")) ? "ci" : "install";
  console.log(`> npm ${install}`);
  execFileSync(npm, [install], { cwd: appDir, stdio: "inherit" });
  console.log("> npm run build");
  execFileSync(npm, ["run", "build"], { cwd: appDir, stdio: "inherit" });

  const dist = join(appDir, "dist");
  if (!existsSync(dist)) {
    console.error(`Build finished but ${dist} does not exist.`);
    process.exit(1);
  }
  await cp(dist, outDir, { recursive: true });
} else {
  // Plain static app: copy the folder, minus metadata.
  const skip = new Set(["app.json"]);
  for (const entry of await readdir(appDir)) {
    if (skip.has(entry)) continue;
    await cp(join(appDir, entry), join(outDir, entry), { recursive: true });
  }
}

console.log(`Built ${app} -> ${outArg}`);
