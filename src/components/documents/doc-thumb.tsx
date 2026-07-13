"use client";

import { useEffect, useState } from "react";
import { fileFormat, isFileDoc, loadDocBlob } from "@/lib/doc-file";
import { docKindIcon } from "@/lib/document-kind";

// First-page thumbnails are expensive to make — render once per URL per
// session and share across grid cells.
const thumbCache = new Map<string, string>();

async function renderPdfThumb(url: string): Promise<string | null> {
  if (thumbCache.has(url)) return thumbCache.get(url)!;
  const res = await loadDocBlob(url);
  if (!res) return null;
  const { pdfjs } = await import("@/lib/pdf-worker");
  const pdf = await pdfjs.getDocument({ data: await res.blob.arrayBuffer() }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const scale = 320 / viewport.width;
  const scaled = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = scaled.width;
  canvas.height = scaled.height;
  // pdfjs 5.x: pass the canvas itself; it acquires the 2d context.
  await page.render({ canvas, viewport: scaled }).promise;
  const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
  thumbCache.set(url, dataUrl);
  void pdf.destroy();
  return dataUrl;
}

/**
 * Sprint 8 Item 1 — grid-view thumbnail: images show themselves, PDFs
 * render their first page, links (and anything unrenderable) fall back
 * to the kind icon.
 */
export function DocThumb({ url, type, title }: { url: string; type: string | null; title: string }) {
  const format = isFileDoc(url) ? fileFormat(url) : "other";
  const [pdfThumb, setPdfThumb] = useState<string | null>(() => thumbCache.get(url) ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (format !== "pdf" || pdfThumb) return;
    let cancelled = false;
    renderPdfThumb(url)
      .then((d) => {
        if (!cancelled) (d ? setPdfThumb(d) : setFailed(true));
      })
      .catch((err) => {
        console.warn("[doc-thumb] first-page render failed:", err);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [url, format, pdfThumb]);

  const src = format === "image" ? url : pdfThumb;

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={title}
        loading="lazy"
        onError={() => setFailed(true)}
        className="absolute inset-0 w-full h-full object-cover"
      />
    );
  }
  return (
    <span aria-hidden className="absolute inset-0 flex items-center justify-center text-4xl">
      {docKindIcon(type)}
    </span>
  );
}
