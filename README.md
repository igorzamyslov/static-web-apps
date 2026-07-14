# static-web-apps

Monorepo of independent static web apps, each auto-deployed to GitHub Pages.

**🔗 Live: https://igorzamyslov.github.io/static-web-apps/**

## Apps

Each app lives in `apps/<name>/` and is served at `…/<name>/`. Two kinds:

- **Pure static** — [`hello`](apps/hello/): plain HTML/CSS, no build.
- **Built** — [`markdown-preview`](apps/markdown-preview/): has a `package.json`;
  `npm run build` outputs `dist/`. Example uses Vite + TypeScript + `marked`.

Apps are self-contained — develop, build, and run each on its own.

## Quick start

```bash
npm install          # shared tooling + git hooks (run once)
npm run verify       # what CI runs: lint + format check + build all apps
npm run new-app foo  # scaffold a new pure-static app
```

Per-app dev is in each app's README (`npx serve apps/hello`, or
`cd apps/markdown-preview && npm run dev`).

## Conventions

- Use **relative** asset paths (`./styles.css`); Vite apps set `base: "./"`.
- Built apps output to `dist/`.
- `app.json` (`{ title, description }`) feeds the landing page; it isn't published.

## Quality

Shared across all apps from a single install: **ESLint** (strict), **Prettier**,
**Stylelint**, **html-validate**, and strict **TypeScript** ([`tsconfig.base.json`](tsconfig.base.json)).
A **Husky** pre-commit hook auto-fixes staged files. Run `npm run lint` or
`npm run format`.

## CI/CD

- **Pull requests** → [`ci.yml`](.github/workflows/ci.yml) runs the quality gate.
- **Push to `main`** → [`deploy.yml`](.github/workflows/deploy.yml) re-runs the
  gate, then rebuilds and republishes **only the apps that changed** (and prunes
  deleted ones).

`main` is protected: changes land via PR with the `quality` check green. See
[CONTRIBUTING.md](CONTRIBUTING.md).

## Automation

[Renovate](renovate.json) keeps dependencies and GitHub Actions current;
**non-major updates auto-merge** once CI passes. One-time: install the
[Renovate app](https://github.com/apps/renovate) on this repo.
