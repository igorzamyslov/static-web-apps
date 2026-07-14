import { loadPdf, renderPage, type LoadedPdf } from "./pdf";
import {
  buildPageDiffs,
  computeVisualDiff,
  renderTextDiff,
  type PageDiff,
  type PageStatus,
  type VisualDiff,
} from "./diff";
import { loadReviewed, saveReviewed, storageKey } from "./review";
import "./style.css";

type Mode = "text" | "visual";
type VisualView = "side" | "diff";

interface Source {
  name: string;
  size: number;
  data: ArrayBuffer;
}

interface Session {
  oldPdf: LoadedPdf;
  newPdf: LoadedPdf;
  pages: PageDiff[];
  changed: number[];
  key: string;
  reviewed: Set<number>;
  current: number;
  mode: Mode;
  visualView: VisualView;
  canvasCache: Map<string, HTMLCanvasElement | null>;
  diffCache: Map<number, VisualDiff>;
}

const TARGET_WIDTH = 820;

const STATUS_LABEL: Record<PageStatus, string> = {
  added: "Added",
  removed: "Removed",
  modified: "Changed",
  unchanged: "Unchanged",
};

const selected: { old: File | null; new: File | null } = { old: null, new: null };
let session: Session | null = null;

function requireEl<T extends HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) {
    throw new Error(`Missing element: ${selector}`);
  }
  return el;
}

const fileOld = requireEl<HTMLInputElement>("#file-old");
const fileNew = requireEl<HTMLInputElement>("#file-new");
const dropOld = requireEl<HTMLElement>("#drop-old");
const dropNew = requireEl<HTMLElement>("#drop-new");
const nameOld = requireEl<HTMLElement>("#name-old");
const nameNew = requireEl<HTMLElement>("#name-new");
const compareBtn = requireEl<HTMLButtonElement>("#compare");
const exampleBtn = requireEl<HTMLButtonElement>("#load-example");
const loaderEl = requireEl<HTMLElement>("#loader");
const reviewEl = requireEl<HTMLElement>("#review");
const statusEl = requireEl<HTMLElement>("#status");
const sidebarEl = requireEl<HTMLElement>("#sidebar");
const viewerEl = requireEl<HTMLElement>("#viewer");
const progressBar = requireEl<HTMLElement>("#progress-bar");
const progressText = requireEl<HTMLElement>("#progress-text");
const modeTextBtn = requireEl<HTMLButtonElement>("#mode-text");
const modeVisualBtn = requireEl<HTMLButtonElement>("#mode-visual");
const visualViewsEl = requireEl<HTMLElement>("#visual-views");
const viewSideBtn = requireEl<HTMLButtonElement>("#view-side");
const viewDiffBtn = requireEl<HTMLButtonElement>("#view-diff");
const resetBtn = requireEl<HTMLButtonElement>("#reset");
const pageTitle = requireEl<HTMLElement>("#page-title");
const pageStatus = requireEl<HTMLElement>("#page-status");
const reviewedCheckbox = requireEl<HTMLInputElement>("#reviewed-checkbox");
const prevBtn = requireEl<HTMLButtonElement>("#prev");
const nextBtn = requireEl<HTMLButtonElement>("#next");

// ---- File selection ---------------------------------------------------------

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function setFile(which: "old" | "new", file: File): void {
  if (!isPdf(file)) {
    statusEl.textContent = `"${file.name}" is not a PDF.`;
    return;
  }
  statusEl.textContent = "";
  selected[which] = file;
  (which === "old" ? nameOld : nameNew).textContent = file.name;
  (which === "old" ? dropOld : dropNew).classList.add("filled");
  compareBtn.disabled = !(selected.old && selected.new);
}

function wireDropzone(zone: HTMLElement, input: HTMLInputElement, which: "old" | "new"): void {
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file) {
      setFile(which, file);
    }
  });
  zone.addEventListener("dragover", (event) => {
    event.preventDefault();
    zone.classList.add("dragging");
  });
  zone.addEventListener("dragleave", () => {
    zone.classList.remove("dragging");
  });
  zone.addEventListener("drop", (event) => {
    event.preventDefault();
    zone.classList.remove("dragging");
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      setFile(which, file);
    }
  });
}

// ---- Comparison -------------------------------------------------------------

async function fileToSource(file: File): Promise<Source> {
  return { name: file.name, size: file.size, data: await file.arrayBuffer() };
}

async function startCompare(oldSrc: Source, newSrc: Source): Promise<void> {
  statusEl.textContent = "Reading PDFs…";
  compareBtn.disabled = true;
  exampleBtn.disabled = true;
  try {
    const [oldPdf, newPdf] = await Promise.all([loadPdf(oldSrc.data), loadPdf(newSrc.data)]);
    const pages = buildPageDiffs(oldPdf.pageTexts, newPdf.pageTexts);
    const changed = pages.filter((p) => p.status !== "unchanged").map((p) => p.index);
    const key = storageKey(oldSrc.name, oldSrc.size, newSrc.name, newSrc.size);
    const stored = loadReviewed(key);
    const reviewed = new Set([...stored].filter((i) => changed.includes(i)));

    session = {
      oldPdf,
      newPdf,
      pages,
      changed,
      key,
      reviewed,
      current: changed[0] ?? 0,
      mode: "text",
      visualView: "side",
      canvasCache: new Map(),
      diffCache: new Map(),
    };

    loaderEl.hidden = true;
    reviewEl.hidden = false;
    setMode("text");
    renderSidebar();
    renderProgress();
    selectPage(session.current);
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Could not read one of the PDFs. Is it a valid PDF file?";
    compareBtn.disabled = false;
    exampleBtn.disabled = false;
  }
}

// ---- Rendering --------------------------------------------------------------

function renderProgress(): void {
  if (!session) {
    return;
  }
  const total = session.changed.length;
  const done = session.changed.filter((i) => session?.reviewed.has(i)).length;
  const pct = total === 0 ? 100 : Math.round((done / total) * 100);
  progressBar.style.width = `${String(pct)}%`;
  if (total === 0) {
    progressText.textContent = "No changes found";
  } else if (done === total) {
    progressText.textContent = `All ${String(total)} changes reviewed ✓`;
  } else {
    progressText.textContent = `Reviewed ${String(done)} of ${String(total)} changes`;
  }
  progressBar.classList.toggle("complete", total > 0 && done === total);
}

function renderSidebar(): void {
  if (!session) {
    return;
  }
  sidebarEl.replaceChildren();
  for (const page of session.pages) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `page-item status-${page.status}`;
    if (page.index === session.current) {
      item.classList.add("current");
    }
    if (session.reviewed.has(page.index)) {
      item.classList.add("reviewed");
    }
    const check = session.reviewed.has(page.index) ? "✓ " : "";
    item.innerHTML =
      `<span class="pi-label">${check}Page ${String(page.index + 1)}</span>` +
      `<span class="pi-badge">${STATUS_LABEL[page.status]}</span>`;
    item.addEventListener("click", () => {
      selectPage(page.index);
    });
    sidebarEl.appendChild(item);
  }
}

function currentPage(): PageDiff | null {
  return session?.pages[session.current] ?? null;
}

function selectPage(index: number): void {
  if (!session) {
    return;
  }
  session.current = index;
  const page = currentPage();
  if (!page) {
    return;
  }

  pageTitle.textContent = `Page ${String(index + 1)} of ${String(session.pages.length)}`;
  pageStatus.textContent = STATUS_LABEL[page.status];
  pageStatus.className = `badge status-${page.status}`;

  const isChanged = page.status !== "unchanged";
  reviewedCheckbox.checked = session.reviewed.has(index);
  reviewedCheckbox.disabled = !isChanged;

  for (const el of sidebarEl.querySelectorAll(".page-item")) {
    el.classList.remove("current");
  }
  const active = sidebarEl.children[indexToChildPosition(index)];
  if (active instanceof HTMLElement) {
    active.classList.add("current");
    active.scrollIntoView({ block: "nearest" });
  }

  renderMain();
}

function indexToChildPosition(index: number): number {
  // Sidebar lists every page in order, so the child position equals the index.
  return index;
}

function renderMain(): void {
  if (!session) {
    return;
  }
  if (session.mode === "text") {
    renderTextMain();
  } else {
    void renderVisualMain();
  }
}

function renderTextMain(): void {
  const page = currentPage();
  if (!page) {
    return;
  }
  if (page.status === "unchanged") {
    const text = page.newText ?? "";
    viewerEl.innerHTML = `<p class="note">No text changes on this page.</p><pre class="plain"></pre>`;
    const pre = viewerEl.querySelector(".plain");
    if (pre) {
      pre.textContent = text;
    }
    return;
  }
  const oldText = page.oldText ?? "";
  const newText = page.newText ?? "";
  viewerEl.innerHTML = `<div class="text-diff">${renderTextDiff(oldText, newText)}</div>`;
}

async function getCanvas(which: "old" | "new", index: number): Promise<HTMLCanvasElement | null> {
  if (!session) {
    return null;
  }
  const cacheKey = `${which}:${String(index)}`;
  const cached = session.canvasCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  const pdf = which === "old" ? session.oldPdf : session.newPdf;
  const canvas =
    index < pdf.doc.numPages ? await renderPage(pdf.doc, index + 1, TARGET_WIDTH) : null;
  session.canvasCache.set(cacheKey, canvas);
  return canvas;
}

async function renderVisualMain(): Promise<void> {
  if (!session) {
    return;
  }
  const index = session.current;
  viewerEl.innerHTML = `<p class="note">Rendering pages…</p>`;

  const [oldCanvas, newCanvas] = await Promise.all([
    getCanvas("old", index),
    getCanvas("new", index),
  ]);

  // Bail out if the user navigated away or switched to text mode meanwhile.
  if (!session || session.current !== index || session.mode !== "visual") {
    return;
  }

  if (session.visualView === "side") {
    viewerEl.replaceChildren(pane("Original", oldCanvas), pane("Revised", newCanvas));
    viewerEl.className = "viewer side";
    return;
  }

  let diff = session.diffCache.get(index);
  if (!diff) {
    diff = computeVisualDiff(oldCanvas, newCanvas);
    session.diffCache.set(index, diff);
  }
  const pctChanged = ((diff.changedPixels / diff.totalPixels) * 100).toFixed(2);
  viewerEl.className = "viewer diff";
  viewerEl.replaceChildren(pane(`Differences (${pctChanged}% of pixels)`, diff.canvas));
}

function pane(label: string, canvas: HTMLCanvasElement | null): HTMLElement {
  const wrap = document.createElement("figure");
  wrap.className = "pane";
  const caption = document.createElement("figcaption");
  caption.textContent = label;
  wrap.appendChild(caption);
  if (canvas) {
    wrap.appendChild(canvas);
  } else {
    const empty = document.createElement("div");
    empty.className = "pane-empty";
    empty.textContent = "(no such page)";
    wrap.appendChild(empty);
  }
  return wrap;
}

// ---- Navigation & review ----------------------------------------------------

function changedNeighbor(direction: 1 | -1): number | null {
  if (!session) {
    return null;
  }
  const { changed, current } = session;
  if (direction === 1) {
    for (const i of changed) {
      if (i > current) {
        return i;
      }
    }
  } else {
    for (let k = changed.length - 1; k >= 0; k--) {
      const i = changed[k];
      if (i !== undefined && i < current) {
        return i;
      }
    }
  }
  return null;
}

function goToNeighbor(direction: 1 | -1): void {
  const next = changedNeighbor(direction);
  if (next !== null) {
    selectPage(next);
  }
}

function setReviewed(value: boolean): void {
  if (!session) {
    return;
  }
  const page = currentPage();
  if (!page || page.status === "unchanged") {
    return;
  }
  if (value) {
    session.reviewed.add(page.index);
  } else {
    session.reviewed.delete(page.index);
  }
  saveReviewed(session.key, session.reviewed);
  reviewedCheckbox.checked = value;
  renderProgress();
  renderSidebar();
  if (value) {
    goToNeighbor(1);
  }
}

function setMode(mode: Mode): void {
  if (!session) {
    return;
  }
  session.mode = mode;
  modeTextBtn.classList.toggle("active", mode === "text");
  modeVisualBtn.classList.toggle("active", mode === "visual");
  visualViewsEl.hidden = mode !== "visual";
  renderMain();
}

function setVisualView(view: VisualView): void {
  if (!session) {
    return;
  }
  session.visualView = view;
  viewSideBtn.classList.toggle("active", view === "side");
  viewDiffBtn.classList.toggle("active", view === "diff");
  if (session.mode === "visual") {
    renderMain();
  }
}

function resetApp(): void {
  session = null;
  selected.old = null;
  selected.new = null;
  fileOld.value = "";
  fileNew.value = "";
  nameOld.textContent = "Drop a PDF here or click to choose";
  nameNew.textContent = "Drop a PDF here or click to choose";
  dropOld.classList.remove("filled");
  dropNew.classList.remove("filled");
  compareBtn.disabled = true;
  exampleBtn.disabled = false;
  statusEl.textContent = "";
  reviewEl.hidden = true;
  loaderEl.hidden = false;
}

// ---- Example ----------------------------------------------------------------

async function loadExample(): Promise<void> {
  statusEl.textContent = "Loading example…";
  try {
    const [oldRes, newRes] = await Promise.all([
      fetch("./samples/original.pdf"),
      fetch("./samples/revised.pdf"),
    ]);
    if (!oldRes.ok || !newRes.ok) {
      throw new Error("Example PDFs not found");
    }
    const [oldData, newData] = await Promise.all([oldRes.arrayBuffer(), newRes.arrayBuffer()]);
    await startCompare(
      { name: "original.pdf", size: oldData.byteLength, data: oldData },
      { name: "revised.pdf", size: newData.byteLength, data: newData },
    );
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Could not load the example PDFs.";
  }
}

// ---- Wiring -----------------------------------------------------------------

wireDropzone(dropOld, fileOld, "old");
wireDropzone(dropNew, fileNew, "new");

compareBtn.addEventListener("click", () => {
  if (selected.old && selected.new) {
    void Promise.all([fileToSource(selected.old), fileToSource(selected.new)]).then(([o, n]) =>
      startCompare(o, n),
    );
  }
});
exampleBtn.addEventListener("click", () => void loadExample());
resetBtn.addEventListener("click", resetApp);
modeTextBtn.addEventListener("click", () => {
  setMode("text");
});
modeVisualBtn.addEventListener("click", () => {
  setMode("visual");
});
viewSideBtn.addEventListener("click", () => {
  setVisualView("side");
});
viewDiffBtn.addEventListener("click", () => {
  setVisualView("diff");
});
prevBtn.addEventListener("click", () => {
  goToNeighbor(-1);
});
nextBtn.addEventListener("click", () => {
  goToNeighbor(1);
});
reviewedCheckbox.addEventListener("change", () => {
  setReviewed(reviewedCheckbox.checked);
});

document.addEventListener("keydown", (event) => {
  if (!session || reviewEl.hidden) {
    return;
  }
  switch (event.key) {
    case "ArrowRight":
    case "j":
      goToNeighbor(1);
      break;
    case "ArrowLeft":
    case "k":
      goToNeighbor(-1);
      break;
    case "r": {
      const page = currentPage();
      if (page && page.status !== "unchanged") {
        setReviewed(!session.reviewed.has(page.index));
      }
      break;
    }
    case "t":
      setMode("text");
      break;
    case "v":
      setMode("visual");
      break;
    default:
      return;
  }
  event.preventDefault();
});
