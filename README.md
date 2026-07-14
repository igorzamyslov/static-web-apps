# static-web-apps

One repository, many **independent** static web apps, all published to GitHub
Pages. Each app builds, runs, and deploys on its own, and shares one strict set
of quality tools. On every push to `main`, **only the apps that changed are
rebuilt and republished** — untouched apps are left exactly as they are on the
live site.

- **Live site:** https://igorzamyslov.github.io/static-web-apps/
- **Contributor guide:** [CONTRIBUTING.md](CONTRIBUTING.md)

## Contents

- [Layout](#layout)
- [Quick start](#quick-start)
- [The two kinds of app](#the-two-kinds-of-app)
- [Adding an app](#adding-an-app)
- [App conventions](#app-conventions)
- [Quality tooling](#quality-tooling)
- [How CI/CD works](#how-cicd-works)
- [Deployment model](#deployment-model)
- [Troubleshooting & caveats](#troubleshooting--caveats)

## Layout

```
apps/
  hello/                 # pure static app — plain HTML/CSS, no build
    app.json             #   optional landing-page metadata
    index.html
    styles.css
    README.md
  markdown-preview/      # built app — Vite + TypeScript + npm deps
    app.json
    package.json         #   presence of package.json => this app has a build
    index.html
    vite.config.ts
    tsconfig.json        #   extends ../../tsconfig.base.json
    src/
    README.md
scripts/
  build-app.mjs          # build ONE app into an output dir
  build-all.mjs          # build EVERY app (used by the quality gate)
  generate-index.mjs     # regenerate the landing page from apps/*
  new-app.sh             # scaffold a new static app
.github/
  actions/quality/       # composite action: install + lint + format + build all
  workflows/
    ci.yml               # quality gate on pull requests
    deploy.yml           # quality gate + incremental publish on push to main
eslint.config.mjs        # strict ESLint (flat config)
.prettierrc.json         # formatting
.stylelintrc.json        # CSS linting
.htmlvalidate.json       # HTML validation
tsconfig.base.json       # strict TypeScript base for all built apps
.editorconfig  .nvmrc    # editor + Node version consistency
```

Each app is served at `https://<user>.github.io/<repo>/<app-name>/`, and the
repo root is an auto-generated landing page linking to every app.

## Quick start

```bash
git clone https://github.com/igorzamyslov/static-web-apps
cd static-web-apps
npm install            # installs the shared quality tools (+ git hooks)

# work on a specific app (see each app's README)
npx serve apps/hello                          # pure static app
cd apps/markdown-preview && npm install && npm run dev   # built app

# repo-wide quality checks (what CI runs)
npm run verify         # lint + format check + build every app
npm run format         # auto-format everything
```

Requires the Node version in [`.nvmrc`](.nvmrc) (`nvm use` picks it up).

## The two kinds of app

An app is detected by whether it has a `package.json`:

|                  | **Pure static** (`hello`)           | **Built** (`markdown-preview`)           |
| ---------------- | ----------------------------------- | ---------------------------------------- |
| `package.json`   | none                                | yes, with a `build` script               |
| Tooling          | none                                | Vite + TypeScript + deps (e.g. `marked`) |
| What's built     | nothing                             | `npm run build` → `dist/`                |
| What's published | the folder as-is (minus `app.json`) | the contents of `dist/`                  |
| Dev              | `npx serve apps/hello`              | `npm run dev` inside the app             |

Both are fully self-contained: you can develop, build, and run either one
without touching the others.

## Adding an app

**Pure static:**

```bash
npm run new-app my-app     # or: bash scripts/new-app.sh my-app
# edit apps/my-app/, then commit & push
```

**Built (with dependencies):** create `apps/my-app/` with a `package.json` whose
`build` script writes the finished site to `dist/`. Use `markdown-preview` as a
template — copy it, then:

```bash
cd apps/my-app && npm install
npm run dev
```

Optionally add `apps/my-app/app.json` (`{ "title", "description" }`) to control
the landing-page card.

## App conventions

1. **Relative asset paths.** Apps live under a subpath (`/<repo>/<app>/`), so
   reference assets relatively (`./styles.css`), never `/styles.css`. For Vite,
   set `base: "./"` (see [`vite.config.ts`](apps/markdown-preview/vite.config.ts)).
2. **Built apps output to `dist/`.** That directory is what gets published.
3. **`app.json` is metadata only** — it feeds the landing page and is never
   published inside the app.
4. **Extend the shared TS config.** Built TypeScript apps extend
   [`tsconfig.base.json`](tsconfig.base.json) so strictness is uniform.

## Quality tooling

All quality tools live at the repo root and run across every app from a single
`npm install`.

| Tool              | Scope                  | Command             |
| ----------------- | ---------------------- | ------------------- |
| **ESLint**        | `.js` / `.mjs` / `.ts` | `npm run lint:js`   |
| **Stylelint**     | `apps/**/*.css`        | `npm run lint:css`  |
| **html-validate** | `apps/*/index.html`    | `npm run lint:html` |
| **Prettier**      | everything             | `npm run format`    |
| **TypeScript**    | per built app (`tsc`)  | run via each build  |

- `npm run lint` runs all three linters; `npm run verify` runs lint + format
  check + a full build of every app.
- ESLint uses a **strict** flat config (`@eslint/js` recommended +
  `typescript-eslint` strict & stylistic + extra rules like `eqeqeq`,
  `no-var`, `prefer-const`, `curly`). Prettier owns formatting, so ESLint's
  stylistic rules are disabled via `eslint-config-prettier`.
- TypeScript strictness (`strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`,
  …) is defined once in `tsconfig.base.json`. Each built app type-checks during
  its `build` (`tsc --noEmit && vite build`).
- **Pre-commit hook** (Husky + lint-staged): staged files are auto-fixed and
  formatted before every commit. Installed automatically by `npm install`.

## How CI/CD works

Both workflows share one composite action,
[`.github/actions/quality`](.github/actions/quality/action.yml), which installs
tooling, lints, checks formatting, and builds **every** app.

- **[`ci.yml`](.github/workflows/ci.yml)** — runs the quality gate on every pull
  request (and on pushes to non-`main` branches).
- **[`deploy.yml`](.github/workflows/deploy.yml)** — on push to `main`, runs the
  quality gate first; only if it passes does the deploy job run. A broken app
  never reaches production.

The deploy job then:

1. Diffs the push against the previous commit to find changed `apps/<name>`
   dirs (filtered to ones that still exist).
2. Builds **only** those apps.
3. Clones the live `gh-pages` branch, replaces only the changed apps, **prunes**
   any app directories no longer in the repo, regenerates the landing page, and
   pushes.

Everything is rebuilt when it's the first deploy, when `gh-pages` is missing,
when history is unavailable (force push), or when you trigger the workflow
manually with **Run workflow → rebuild_all**.

## Deployment model

- Uses the **"Deploy from a branch"** Pages source (branch `gh-pages`, `/root`)
  rather than the Actions-artifact source — because the artifact source
  redeploys the _entire_ site atomically, which can't express "republish only
  the app that changed."
- One-time setup: **Settings → Pages → Source → Deploy from a branch →
  `gh-pages` / `(root)`** (already configured for this repo).
- Publishing uses the built-in `GITHUB_TOKEN`; there are no secrets to
  configure. If you add branch protection to `gh-pages`, exempt the Actions bot.

## Troubleshooting & caveats

- **An app 404s after deploy** → check its asset paths are relative and (for
  Vite) that `base: "./"` is set.
- **Deleting an app** removes it from the landing page and prunes its published
  folder on the next deploy. (Files at the site root, e.g. a `CNAME`, are never
  pruned.)
- **Reset the whole site** → delete the `gh-pages` branch and re-run the deploy
  workflow with `rebuild_all`.
- **Verifying all apps on every deploy** is intentional (it catches a shared
  config change breaking an untouched app). For very many apps, scope the
  quality build to changed apps in `.github/actions/quality`.
