// Step 1 of ingestion: PDF bytes -> [{ pageNumber, text }].
// WHY per page: citations need page numbers, and a flat blob (what v1 produced) loses them.
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

// "legacy" build works on plain Node without browser APIs. Loaded on first use (it is large).
let pdfjs;

const MIN_TEXT_CHARS = 20; // fewer characters than this = probably a scanned image page

export async function extractPages(buffer) {
  pdfjs ??= await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    isEvalSupported: false,
    verbosity: 0,
  });
  const doc = await task.promise;

  const pages = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    // hasEOL marks where the PDF ended a line, so we can rebuild line breaks.
    let text = content.items.map((i) => i.str + (i.hasEOL ? "\n" : "")).join("");

    if (text.replace(/\s/g, "").length < MIN_TEXT_CHARS && env.OCR_ENABLED) {
      text = await ocrPage(page, n);
    }
    pages.push({ pageNumber: n, text });
  }
  await task.destroy(); // frees the worker/memory
  return pages;
}

// OCR is optional: needs `tesseract.js` and `@napi-rs/canvas` (optionalDependencies).
// ponytail: sequential, one worker per page. Fine for occasional scans; reuse a worker if bulk OCR is needed.
async function ocrPage(page, n) {
  try {
    const { createCanvas } = await import("@napi-rs/canvas");
    const { createWorker } = await import("tesseract.js");
    const viewport = page.getViewport({ scale: 2 }); // 2x = readable for OCR
    const canvas = createCanvas(viewport.width, viewport.height);
    await page.render({ canvasContext: canvas.getContext("2d"), canvas, viewport }).promise;

    // Offline: language data must already be on disk (OCR_LANG_PATH), never downloaded.
    const worker = await createWorker("eng+mar+hin", 1, env.OCR_LANG_PATH ? { langPath: env.OCR_LANG_PATH, gzip: false } : {});
    const { data } = await worker.recognize(canvas.toBuffer("image/png"));
    await worker.terminate();
    return data.text;
  } catch (err) {
    logger.warn({ page: n, err: err.message }, "OCR failed or not installed; page left empty");
    return "";
  }
}
