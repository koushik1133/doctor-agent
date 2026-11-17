import path from "node:path";
import { createRequire } from "node:module";
import { CACHE_ROOT } from "../http";
import type { Worker } from "tesseract.js";

// Local OCR with Tesseract (no API key, nothing leaves the server). The English
// model ships in @tesseract.js-data/eng so it works offline. One worker is
// kept warm and reused; jobs are serialised through it.

const require_ = createRequire(import.meta.url);
let workerP: Promise<Worker> | null = null;
let queue: Promise<unknown> = Promise.resolve();

async function getWorker(): Promise<Worker> {
  if (!workerP) {
    workerP = (async () => {
      const { createWorker } = await import("tesseract.js");
      const langPath = path.join(path.dirname(require_.resolve("@tesseract.js-data/eng/package.json")), "4.0.0_best_int");
      return createWorker("eng", 1, {
        langPath,
        gzip: true,
        cachePath: path.join(CACHE_ROOT, "tesseract"),
        // Without this, tesseract.js rethrows worker errors (e.g. a corrupt
        // image) as uncaught exceptions, which would crash the server. The
        // error still rejects the recognize() promise.
        errorHandler: () => {},
      });
    })();
    workerP.catch(() => (workerP = null));
  }
  return workerP;
}

// Magic-byte sniffing so we never hand arbitrary bytes to the OCR engine.
export function imageKind(b: Uint8Array): "png" | "jpeg" | "webp" | null {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b.length >= 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return "webp";
  return null;
}

export async function ocrBuffer(buf: Uint8Array | Buffer): Promise<{ text: string; confidence: number }> {
  const run = queue.then(async () => {
    const w = await getWorker();
    const { data } = await w.recognize(Buffer.from(buf));
    return { text: data.text, confidence: data.confidence };
  });
  queue = run.catch(() => {});
  return run;
}

// Scanned PDFs have no text layer: render each page and OCR it.
export async function ocrPdf(data: Uint8Array, maxPages = 6): Promise<{ text: string; confidence: number; pages: number }> {
  const { getDocumentProxy, renderPageAsImage } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(data));
  const pages = Math.min(pdf.numPages, maxPages);
  const out: string[] = [];
  let conf = 0;
  for (let p = 1; p <= pages; p++) {
    const png = await renderPageAsImage(pdf, p, { canvasImport: () => import("@napi-rs/canvas"), scale: 2.5 });
    const r = await ocrBuffer(new Uint8Array(png));
    out.push(r.text);
    conf += r.confidence;
  }
  return { text: out.join("\n\n"), confidence: pages ? conf / pages : 0, pages };
}
