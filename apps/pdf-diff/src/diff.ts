import { diffWordsWithSpace } from "diff";

export type PageStatus = "added" | "removed" | "modified" | "unchanged";

export interface PageDiff {
  /** 0-based page index. */
  index: number;
  status: PageStatus;
  oldText: string | null;
  newText: string | null;
}

const normalize = (s: string): string => s.replace(/\s+/g, " ").trim();

/** Compare pages index-by-index, handling differing page counts. */
export function buildPageDiffs(oldTexts: string[], newTexts: string[]): PageDiff[] {
  const count = Math.max(oldTexts.length, newTexts.length);
  const diffs: PageDiff[] = [];

  for (let index = 0; index < count; index++) {
    const oldText = oldTexts[index] ?? null;
    const newText = newTexts[index] ?? null;

    let status: PageStatus;
    if (oldText === null) {
      status = "added";
    } else if (newText === null) {
      status = "removed";
    } else if (normalize(oldText) === normalize(newText)) {
      status = "unchanged";
    } else {
      status = "modified";
    }

    diffs.push({ index, status, oldText, newText });
  }

  return diffs;
}

const escapeHtml = (input: string): string =>
  input.replace(/[&<>]/g, (c) => {
    if (c === "&") {
      return "&amp;";
    }
    if (c === "<") {
      return "&lt;";
    }
    return "&gt;";
  });

/** Word-level text diff rendered as HTML with <ins>/<del> markers. */
export function renderTextDiff(oldText: string, newText: string): string {
  const parts = diffWordsWithSpace(oldText, newText);
  let html = "";
  for (const part of parts) {
    const safe = escapeHtml(part.value);
    if (part.added) {
      html += `<ins>${safe}</ins>`;
    } else if (part.removed) {
      html += `<del>${safe}</del>`;
    } else {
      html += safe;
    }
  }
  return html;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DiffRegions {
  regions: Rect[];
  width: number;
  height: number;
}

function toImageData(source: HTMLCanvasElement, width: number, height: number): Uint8ClampedArray {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get a 2D canvas context");
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0);
  return ctx.getImageData(0, 0, width, height).data;
}

const CELL = 8; // grid cell size in px for clustering
const PIXEL_THRESHOLD = 40; // min summed channel delta to count a pixel as changed
const MIN_PIXELS = 3; // min changed pixels in a cell to mark it changed

/**
 * Find the rectangular regions that actually differ between two rendered pages.
 * Changed pixels are clustered on a coarse grid, dilated to merge neighbours,
 * then grouped into connected components — one Rect per cluster of change.
 */
export function computeDiffRegions(
  oldCanvas: HTMLCanvasElement | null,
  newCanvas: HTMLCanvasElement | null,
): DiffRegions {
  const width = Math.max(1, oldCanvas?.width ?? 0, newCanvas?.width ?? 0);
  const height = Math.max(1, oldCanvas?.height ?? 0, newCanvas?.height ?? 0);

  // A page present on only one side counts as entirely changed.
  if (!oldCanvas || !newCanvas) {
    return { regions: [{ x: 0, y: 0, w: width, h: height }], width, height };
  }

  const a = toImageData(oldCanvas, width, height);
  const b = toImageData(newCanvas, width, height);

  const cols = Math.ceil(width / CELL);
  const rows = Math.ceil(height / CELL);
  const counts = new Uint16Array(cols * rows);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const delta =
        Math.abs((a[i] ?? 0) - (b[i] ?? 0)) +
        Math.abs((a[i + 1] ?? 0) - (b[i + 1] ?? 0)) +
        Math.abs((a[i + 2] ?? 0) - (b[i + 2] ?? 0));
      if (delta > PIXEL_THRESHOLD) {
        const cellIndex = Math.floor(y / CELL) * cols + Math.floor(x / CELL);
        counts[cellIndex] = (counts[cellIndex] ?? 0) + 1;
      }
    }
  }

  // Seed mask, then dilate by one cell so nearby changes group together.
  const dilated = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((counts[r * cols + c] ?? 0) < MIN_PIXELS) {
        continue;
      }
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            dilated[nr * cols + nc] = 1;
          }
        }
      }
    }
  }

  const regions = labelComponents(dilated, cols, rows, width, height);
  regions.sort((p, q) => p.y - q.y || p.x - q.x);
  return { regions, width, height };
}

function labelComponents(
  mask: Uint8Array,
  cols: number,
  rows: number,
  width: number,
  height: number,
): Rect[] {
  const seen = new Uint8Array(cols * rows);
  const regions: Rect[] = [];
  const stack: number[] = [];

  for (let start = 0; start < cols * rows; start++) {
    if ((mask[start] ?? 0) === 0 || (seen[start] ?? 0) === 1) {
      continue;
    }
    seen[start] = 1;
    stack.length = 0;
    stack.push(start);

    let minC = cols;
    let maxC = 0;
    let minR = rows;
    let maxR = 0;

    while (stack.length > 0) {
      const idx = stack.pop();
      if (idx === undefined) {
        break;
      }
      const r = Math.floor(idx / cols);
      const c = idx % cols;
      minC = Math.min(minC, c);
      maxC = Math.max(maxC, c);
      minR = Math.min(minR, r);
      maxR = Math.max(maxR, r);

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
            continue;
          }
          const nidx = nr * cols + nc;
          if ((mask[nidx] ?? 0) === 1 && (seen[nidx] ?? 0) === 0) {
            seen[nidx] = 1;
            stack.push(nidx);
          }
        }
      }
    }

    regions.push({
      x: minC * CELL,
      y: minR * CELL,
      w: Math.min(width, (maxC + 1) * CELL) - minC * CELL,
      h: Math.min(height, (maxR + 1) * CELL) - minR * CELL,
    });
  }

  return regions;
}
