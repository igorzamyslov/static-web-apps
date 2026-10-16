# Contributing

```bash
nvm use && npm install    # Node from .nvmrc + shared tooling & git hooks
```

Work on one app at a time — apps are independent. See each app's README for its
dev commands.

**Before pushing:** run `npm run verify` (lint + format check + build every app).
A pre-commit hook auto-fixes staged files, so most issues never reach CI.

**Flow:** branch off `main` → push → open a PR → the `quality` check must pass →
merge. `main` is protected (no direct pushes). Merging publishes only the apps
your change touched.

**Add an app:** `npm run new-app my-app` (pure static), or copy
[`apps/markdown-preview/`](apps/markdown-preview/) (built). Rules: relative asset
paths, and built apps output to `dist/`.

Never commit `dist/`, `_build/`, `_site/`, or `node_modules/` — all git-ignored.
