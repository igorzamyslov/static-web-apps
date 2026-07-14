# pdf-diff

A client-side **PDF diff review tool**. Load two PDFs and review what changed —
in text or visual mode — while tracking which changes you've already checked.

Built app: **Vite + TypeScript** with [`pdf.js`](https://mozilla.github.io/pdf.js/)
(parse/render) and [`diff`](https://www.npmjs.com/package/diff) (text diff).
Everything runs in the browser — no files are uploaded anywhere.

```bash
cd apps/pdf-diff
npm install
npm run dev        # dev server
npm run build      # tsc --noEmit && vite build → dist/
```

## How it works

- **Text mode** — word-level diff per page (green = added, red = removed).
- **Visual mode** — always shows both pages (Original | Revised), **zoomable**,
  with the **changed regions boxed** on both. When a page has many changes, step
  through them one at a time with the diff navigator ("Diff 3 / 12" · prev/next ·
  click a box to jump); viewed diffs are dimmed so you can work through them.
- **Review tracking** — text and visual are tracked **separately** (reviewing the
  text diff doesn't mark the visual diff checked, and vice versa). Each page shows
  `T`/`V` ticks; the progress bar counts both. Saved in `localStorage` per file
  pair, so reopening the same two PDFs restores it.
- **Keyboard** — `←/→` move between changed pages, `[` / `]` step diffs within a
  page, `+` / `-` / `0` zoom, `r` toggles reviewed (current mode), `t`/`v` switch
  modes.

Click **Load example** to try it with bundled sample PDFs.

## Known limitations

- Pages are compared **by index**, so inserting/removing a page mid-document
  shifts everything after it. Change detection is **text-based**; a page whose
  text is identical but layout/image changed shows its difference when opened in
  Visual mode.
- No CJK/special-font cMaps are loaded (fine for typical Latin-script PDFs).
