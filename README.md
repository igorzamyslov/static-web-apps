# static-web-apps

One repository, many static web apps, all published to GitHub Pages. On every
push to `main`, **only the apps that changed are rebuilt and republished** —
untouched apps are left exactly as they are on the live site.

## Layout

```
apps/
  hello/            # plain static app (no build) — folder is published as-is
    app.json        #   optional metadata for the landing page
    index.html
    styles.css
  clock/            # built app — `npm run build` outputs to dist/
    app.json
    package.json    #   presence of package.json => this app has a build step
    build.mjs
    src/
scripts/
  build-app.mjs     # builds one app into an output dir
  generate-index.mjs# regenerates the landing page that links to every app
  new-app.sh        # scaffolds a new app
.github/workflows/
  deploy.yml        # change detection + incremental publish to gh-pages
```

Each app is served at `https://<user>.github.io/<repo>/<app-name>/`, and the
repo root (`https://<user>.github.io/<repo>/`) is an auto-generated landing page
linking to all apps.

## One-time setup

1. Push this repo to GitHub with the default branch named `main`.
2. Let the workflow run once (it creates the `gh-pages` branch).
3. In **Settings → Pages → Build and deployment**, set **Source** to
   **Deploy from a branch**, and choose branch **`gh-pages`** / **`/ (root)`**.
4. Your site goes live at `https://<user>.github.io/<repo>/`.

## Adding an app

**Plain static app** (HTML/CSS/JS, no tooling):

```bash
scripts/new-app.sh my-app
# edit apps/my-app/…, commit, push
```

**Built app** (Vite, React, esbuild, …): create `apps/my-app/` with a
`package.json` whose `build` script writes the finished site to `dist/`. The
`clock` app is a working, dependency-free example of this.

Optionally add `apps/my-app/app.json` (`{ "title", "description" }`) to control
how the app appears on the landing page.

### Important: use relative paths

Apps live under a subpath (`/<repo>/<app>/`), so reference assets **relatively**
(`./styles.css`, `./clock.js`) — never `/styles.css`. For frameworks, set the
base path accordingly, e.g. Vite:

```js
// apps/my-app/vite.config.js
export default { base: "./" };
```

## How change detection works

`deploy.yml`:

1. Diffs the pushed commit against the previous one and collects the top-level
   `apps/<name>` directories that changed.
2. Builds only those apps (`scripts/build-app.mjs`).
3. Clones the existing `gh-pages` branch, replaces **only** the changed apps'
   folders, regenerates the landing page, and pushes. Unchanged apps are never
   touched.

Everything is rebuilt when: it's the first deploy, the `gh-pages` branch is
missing, history is unavailable (force push), or you trigger the workflow
manually with **Run workflow → rebuild_all**.

## Local development

```bash
# plain static app — serve the folder
npx serve apps/hello

# built app — run its build, then serve dist/
cd apps/clock && npm install && npm run build && npx serve dist

# preview the whole published site locally
for a in apps/*/; do node scripts/build-app.mjs "$(basename "$a")" "_site/$(basename "$a")"; done
node scripts/generate-index.mjs _site
npx serve _site
```

## Caveats

- **Deleting an app** removes it from the landing page immediately, but its
  already-published files remain on the `gh-pages` branch (the incremental
  deploy only adds/replaces). To fully clean up, delete the app's folder on the
  `gh-pages` branch, or delete the whole branch and re-run the workflow with
  `rebuild_all`.
- Publishing uses the built-in `GITHUB_TOKEN`; no secrets to configure.
- This uses the **"Deploy from a branch"** Pages source (rather than the
  Actions artifact source) precisely because it allows publishing one app
  without redeploying the entire site.
