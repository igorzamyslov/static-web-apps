# markdown-preview

A live Markdown → HTML previewer. Example of a **built app with npm
dependencies** (Vite + TypeScript + [`marked`](https://www.npmjs.com/package/marked)).

## Develop

```bash
cd apps/markdown-preview
npm install
npm run dev        # start the Vite dev server
```

## Other scripts

| Command             | What it does                                  |
| ------------------- | --------------------------------------------- |
| `npm run build`     | Type-check (`tsc --noEmit`) then `vite build` |
| `npm run typecheck` | Type-check only                               |
| `npm run preview`   | Serve the production build locally            |

The build outputs to `dist/`, which is what the deploy workflow publishes to
`…/markdown-preview/`.

## Notes

- `vite.config.ts` sets `base: "./"` so the app works under the Pages subpath.
- TypeScript strictness is inherited from the repo's `tsconfig.base.json`.
