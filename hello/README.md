# hello

Example of a **pure static app** — plain HTML/CSS, no build step, no
dependencies. The whole folder is published as-is to `…/hello/`.

## Develop

Open `index.html` directly, or serve the folder:

```bash
npx serve apps/hello
```

## Notes

- All asset links are **relative** (`./styles.css`) so the app works under the
  Pages subpath.
- `app.json` is metadata for the landing page and is not published.
