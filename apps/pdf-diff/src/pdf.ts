import * as pdfjs from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";

// Run pdf.js in a bundled module worker (Vite resolves the URL, so it works
// under the Pages subpath).
pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker();

export interface LoadedPdf {
  doc: pdfjs.PDFDocumentProxy;
  pageTexts: string[];
}

/** Load a PDF and extract the plain text of every page. */
// Standard 14 fonts (Helvetica, Times, …) are usually not embedded, so pdf.js
// needs their glyph data to rasterize text. The files are copied next to the
// app at build time (see scripts/copy-fonts.mjs).
const STANDARD_FONT_DATA_URL = new URL("standard_fonts/", document.baseURI).href;

export async function loadPdf(data: ArrayBuffer): Promise<LoadedPdf> {
  const doc = await pdfjs.getDocument({
    data,
    disableFontFace: true,
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
  }).promise;
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    let text = "";
    for (const item of content.items) {
      if ("str" in item) {
        text += item.str;
        if (item.hasEOL) {
          text += "\n";
        }
      }
    }
    pageTexts.push(text);
  }

  return { doc, pageTexts };
}

/** Render a single page (1-based) to a canvas at the given pixel width. */
export async function renderPage(
  doc: pdfjs.PDFDocumentProxy,
  pageNumber: number,
  targetWidth: number,
): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNumber);
  const unscaled = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: targetWidth / unscaled.width });

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get a 2D canvas context");
  }

  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}
