import "server-only";

/**
 * Extract text from a PDF (base64) on the server for the confirmation reader.
 * Uses pdfjs-dist's legacy build (Node-safe, no worker). First 6 pages, 12k
 * chars — an airline/hotel confirmation is 1–2 pages. Returns "" on failure;
 * the caller falls back to "paste or type it".
 */
export async function extractPdfText(base64: string): Promise<string> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const data = Uint8Array.from(Buffer.from(base64.replace(/^data:[^;]+;base64,/, ""), "base64"));
    const doc = await pdfjs.getDocument({ data, useWorkerFetch: false, isEvalSupported: false, disableFontFace: true, verbosity: 0 }).promise;
    const pages = Math.min(doc.numPages, 6);
    let out = "";
    for (let p = 1; p <= pages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const line = (content.items as { str?: string }[]).map((i) => i.str ?? "").join(" ");
      out += line + "\n";
      if (out.length > 12_000) break;
    }
    return out.slice(0, 12_000).trim();
  } catch {
    return "";
  }
}
