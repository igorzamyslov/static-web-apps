import { diffWordsWithSpace } from "diff";
import pixelmatch from "pixelmatch";

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

export interface VisualDiff {
  canvas: HTMLCanvasElement;
  changedPixels: number;
  totalPixels: number;
}

function toImageData(source: HTMLCanvasElement | null, width: number, height: number): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get a 2D canvas context");
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  if (source) {
    ctx.drawImage(source, 0, 0);
  }
  return ctx.getImageData(0, 0, width, height);
}

/** Pixel-level diff of two rendered pages; highlights changes in magenta. */
export function computeVisualDiff(
  oldCanvas: HTMLCanvasElement | null,
  newCanvas: HTMLCanvasElement | null,
): VisualDiff {
  const width = Math.max(1, oldCanvas?.width ?? 0, newCanvas?.width ?? 0);
  const height = Math.max(1, oldCanvas?.height ?? 0, newCanvas?.height ?? 0);

  const a = toImageData(oldCanvas, width, height);
  const b = toImageData(newCanvas, width, height);
  const output = new Uint8ClampedArray(width * height * 4);

  const changedPixels = pixelmatch(a.data, b.data, output, width, height, {
    threshold: 0.1,
    alpha: 0.35,
    diffColor: [220, 0, 160],
  });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get a 2D canvas context");
  }
  ctx.putImageData(new ImageData(output, width, height), 0, 0);

  return { canvas, changedPixels, totalPixels: width * height };
}
