# markdown-preview

Built app: **Vite + TypeScript + [`marked`](https://www.npmjs.com/package/marked)**.
Live Markdown → HTML preview.

```bash
cd apps/markdown-preview
npm install
npm run dev        # dev server
npm run build      # tsc --noEmit && vite build → dist/
npm run preview    # serve the production build
```

`vite.config.ts` sets `base: "./"` for subpath hosting; TypeScript strictness
comes from the repo's [`tsconfig.base.json`](../../tsconfig.base.json).
