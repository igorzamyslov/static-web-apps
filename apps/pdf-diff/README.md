# pdf-diff

A client-side **PDF diff review tool**. Load two PDFs and review what changed —
in text or visual mode — while tracking which changes you've already checked.

Built app: **Vite + TypeScript** with [`pdf.js`](https://mozilla.github.io/pdf.js/)
(parse/render), [`diff`](https://www.npmjs.com/package/diff) (text diff), and
[`pixelmatch`](https://www.npmjs.com/package/pixelmatch) (visual diff). Everything
runs in the browser — no files are uploaded anywhere.

```bash
cd apps/pdf-diff
npm install
npm run dev        # dev server
npm run build      # tsc --noEmit && vite build → dist/
```

## How it works

- **Text mode** — word-level diff per page (green = added, red = removed).
- **Visual mode** — renders each page; _Side by side_ shows Original vs Revised,
  _Difference_ highlights changed pixels.
- **Review tracking** — mark each changed page **Reviewed**; a progress bar shows
  how far you are. Progress is saved in `localStorage` per file pair, so
  reopening the same two PDFs restores it.
- **Keyboard** — `←/→` (or `j/k`) move between changes, `r` toggles reviewed,
  `t`/`v` switch modes.

Click **Load example** to try it with bundled sample PDFs.

## Known limitations

- Pages are compared **by index**, so inserting/removing a page mid-document
  shifts everything after it. Change detection is **text-based**; a page whose
  text is identical but layout/image changed shows its difference when opened in
  Visual mode.
- No CJK/special-font cMaps are loaded (fine for typical Latin-script PDFs).
