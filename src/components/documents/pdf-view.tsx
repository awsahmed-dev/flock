"use client";

import { useState } from "react";
import { Document, Page } from "react-pdf";
import "@/lib/pdf-worker";

/**
 * Sprint 8 Item 1 — the PDF pane of the document viewer. All pages
 * stacked and scrollable at container width; text/annotation layers off
 * (we don't need selection, and skipping them avoids their CSS).
 */
export default function PdfView({ objectUrl, width }: { objectUrl: string; width: number }) {
  const [numPages, setNumPages] = useState(0);

  return (
    <Document
      file={objectUrl}
      onLoadSuccess={(doc) => setNumPages(doc.numPages)}
      loading={<p className="text-center text-sm text-muted-foreground py-10">…</p>}
      error={<p className="text-center text-sm text-muted-foreground py-10">Couldn&apos;t render this PDF.</p>}
    >
      {Array.from({ length: numPages }, (_, i) => (
        <Page
          key={i}
          pageNumber={i + 1}
          width={width}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          className="mb-2 [&>canvas]:rounded-lg"
        />
      ))}
    </Document>
  );
}
