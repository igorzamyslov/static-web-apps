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

**Submodule apps:** `apps/insert-generator` is its own repo. Clone with
`git clone --recurse-submodules …` (or run `git submodule update --init` in an
existing clone). Change the app in its own repo, then publish the new version here
with `git -C apps/insert-generator pull` followed by a commit of the updated
pointer (`git add apps/insert-generator`). Root lint and format skip it.

**Add an app:** `npm run new-app my-app` (pure static), or copy
[`apps/markdown-preview/`](apps/markdown-preview/) (built). Rules: relative asset
paths, and built apps output to `dist/`.

Never commit `dist/`, `_build/`, `_site/`, or `node_modules/` — all git-ignored.
