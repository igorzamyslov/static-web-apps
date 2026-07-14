# Contributing

## Setup

```bash
nvm use            # use the Node version in .nvmrc
npm install        # shared tooling + git hooks
```

## Day-to-day

Work on one app at a time — apps are independent.

```bash
# pure static app
npx serve apps/hello

# built app
cd apps/markdown-preview
npm install
npm run dev
```

See each app's own `README.md` for its scripts.

## Before you commit

A **pre-commit hook** (Husky + lint-staged) automatically lints and formats your
staged files. To run the full checks yourself:

```bash
npm run verify     # lint + format check + build every app
npm run format     # auto-format everything
npm run lint       # ESLint + Stylelint + html-validate
```

These are exactly what CI runs, so a green `npm run verify` locally means a
green pipeline.

## Adding an app

- **Pure static:** `npm run new-app my-app`, then edit `apps/my-app/`.
- **Built:** copy `apps/markdown-preview/` as a template. The only hard
  requirement is a `package.json` with a `build` script that outputs to `dist/`.

Follow the [app conventions](README.md#app-conventions): relative asset paths,
`dist/` output for built apps, and extend `tsconfig.base.json` for TypeScript.

## Pull requests & deployment

1. Branch off `main`, push, open a PR.
2. [`ci.yml`](.github/workflows/ci.yml) runs the quality gate on the PR.
3. Merge to `main`. [`deploy.yml`](.github/workflows/deploy.yml) re-runs the
   gate and, if green, publishes **only the apps your change touched**.

Never commit build artifacts — `dist/`, `_build/`, `_site/`, and `node_modules/`
are git-ignored.
