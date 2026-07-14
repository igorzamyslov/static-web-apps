import type { Rect } from "./diff";

const ZOOM_MIN = 0.2;
const ZOOM_MAX = 4;
const ZOOM_STEP = 1.25;

export interface VisualController {
  root: HTMLElement;
  /** Fit both pages to the available width. */
  fit(): void;
  /** Scroll the active diff into view (call once attached to the DOM). */
  reveal(): void;
  zoomIn(): void;
  zoomOut(): void;
  nextRegion(): void;
  prevRegion(): void;
}

export interface VisualOptions {
  onRegionChange?: (viewed: number, total: number) => void;
}

/**
 * Build a 2-up visual comparison (Original | Revised) with the changed regions
 * boxed on both pages, zoom controls, and a diff-by-diff stepper. Fully
 * self-contained: append `.root` to the DOM and drive it via the controller.
 */
export function createVisual(
  oldCanvas: HTMLCanvasElement | null,
  newCanvas: HTMLCanvasElement | null,
  regions: Rect[],
  width: number,
  height: number,
  options: VisualOptions = {},
): VisualController {
  const visited = new Set<number>();
  let active = -1;
  let zoom = 1;

  const root = document.createElement("div");
  root.className = "visual";

  // --- controls -------------------------------------------------------------
  const controls = document.createElement("div");
  controls.className = "visual-controls";

  const zoomGroup = document.createElement("div");
  zoomGroup.className = "ctrl-group";
  const zoomOutBtn = button("−", "Zoom out");
  const zoomLabel = document.createElement("span");
  zoomLabel.className = "ctrl-label";
  const zoomInBtn = button("+", "Zoom in");
  const fitBtn = button("Fit", "Fit to width");
  zoomGroup.append(zoomOutBtn, zoomLabel, zoomInBtn, fitBtn);

  const regionGroup = document.createElement("div");
  regionGroup.className = "ctrl-group";
  const prevBtn = button("‹", "Previous difference");
  const regionLabel = document.createElement("span");
  regionLabel.className = "ctrl-label region-label";
  const nextBtn = button("›", "Next difference");
  regionGroup.append(prevBtn, regionLabel, nextBtn);

  controls.append(zoomGroup, regionGroup);

  // --- pages ----------------------------------------------------------------
  const scroll = document.createElement("div");
  scroll.className = "visual-scroll";
  const wrapOld = makeWrap("Original", oldCanvas, regions, width, height, "old");
  const wrapNew = makeWrap("Revised", newCanvas, regions, width, height, "new");
  scroll.append(wrapOld.figure, wrapNew.figure);

  root.append(controls, scroll);

  // --- behaviour ------------------------------------------------------------
  function applyZoom(next: number): void {
    zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
    for (const wrap of [wrapOld, wrapNew]) {
      wrap.box.style.width = `${String(width * zoom)}px`;
      wrap.box.style.height = `${String(height * zoom)}px`;
      if (wrap.canvas) {
        wrap.canvas.style.width = `${String(wrap.canvas.width * zoom)}px`;
      }
    }
    zoomLabel.textContent = `${String(Math.round(zoom * 100))}%`;
  }

  function fit(): void {
    const available = scroll.clientWidth - 28; // gap + padding
    const perPage = Math.max(120, available / 2);
    applyZoom(perPage / width);
  }

  function updateRegionClasses(): void {
    for (const el of root.querySelectorAll<HTMLElement>(".region")) {
      const i = Number(el.dataset["i"]);
      el.classList.toggle("active", i === active);
      el.classList.toggle("viewed", visited.has(i));
    }
  }

  function reveal(): void {
    const target =
      root.querySelector<HTMLElement>(`.region[data-page="new"][data-i="${String(active)}"]`) ??
      root.querySelector<HTMLElement>(`.region[data-page="old"][data-i="${String(active)}"]`);
    target?.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
  }

  function setActive(i: number): void {
    if (regions.length === 0) {
      return;
    }
    active = Math.min(regions.length - 1, Math.max(0, i));
    visited.add(active);
    updateRegionClasses();

    const suffix = visited.size === regions.length ? " · all viewed ✓" : "";
    regionLabel.textContent = `Diff ${String(active + 1)} / ${String(regions.length)}${suffix}`;
    prevBtn.disabled = active === 0;
    nextBtn.disabled = active === regions.length - 1;

    reveal();
    options.onRegionChange?.(visited.size, regions.length);
  }

  zoomOutBtn.addEventListener("click", () => {
    applyZoom(zoom / ZOOM_STEP);
  });
  zoomInBtn.addEventListener("click", () => {
    applyZoom(zoom * ZOOM_STEP);
  });
  fitBtn.addEventListener("click", fit);
  prevBtn.addEventListener("click", () => {
    setActive(active - 1);
  });
  nextBtn.addEventListener("click", () => {
    setActive(active + 1);
  });
  for (const el of [...wrapOld.regionEls, ...wrapNew.regionEls]) {
    el.addEventListener("click", () => {
      setActive(Number(el.dataset["i"]));
    });
  }

  if (regions.length === 0) {
    regionLabel.textContent = "No visual differences";
    prevBtn.disabled = true;
    nextBtn.disabled = true;
  } else {
    setActive(0);
  }

  return {
    root,
    fit,
    reveal,
    zoomIn: () => {
      applyZoom(zoom * ZOOM_STEP);
    },
    zoomOut: () => {
      applyZoom(zoom / ZOOM_STEP);
    },
    nextRegion: () => {
      setActive(active + 1);
    },
    prevRegion: () => {
      setActive(active - 1);
    },
  };
}

function button(label: string, title: string): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "ctrl-btn";
  b.textContent = label;
  b.title = title;
  return b;
}

interface Wrap {
  figure: HTMLElement;
  box: HTMLElement;
  canvas: HTMLCanvasElement | null;
  regionEls: HTMLElement[];
}

function makeWrap(
  label: string,
  canvas: HTMLCanvasElement | null,
  regions: Rect[],
  width: number,
  height: number,
  page: "old" | "new",
): Wrap {
  const figure = document.createElement("figure");
  figure.className = "vpage";
  const caption = document.createElement("figcaption");
  caption.textContent = label;

  const box = document.createElement("div");
  box.className = "canvas-box";

  const regionEls: HTMLElement[] = [];

  if (canvas) {
    canvas.className = "vcanvas";
    box.appendChild(canvas);
    const overlay = document.createElement("div");
    overlay.className = "region-overlay";
    regions.forEach((r, i) => {
      const el = document.createElement("div");
      el.className = "region";
      el.dataset["i"] = String(i);
      el.dataset["page"] = page;
      el.style.left = `${String((r.x / width) * 100)}%`;
      el.style.top = `${String((r.y / height) * 100)}%`;
      el.style.width = `${String((r.w / width) * 100)}%`;
      el.style.height = `${String((r.h / height) * 100)}%`;
      overlay.appendChild(el);
      regionEls.push(el);
    });
    box.appendChild(overlay);
  } else {
    box.classList.add("empty");
    box.textContent = "(no such page)";
  }

  figure.append(caption, box);
  return { figure, box, canvas, regionEls };
}
