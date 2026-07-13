"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { X, Barcode, CaretLeft, CaretRight, WifiSlash, CircleNotch as Loader2 } from "@phosphor-icons/react/dist/ssr";
import { loadDocBlob } from "@/lib/doc-file";
import { docKindIcon } from "@/lib/document-kind";
import { useT } from "@/components/i18n/locale-provider";
import { PinchZoom } from "./pinch-zoom";

// pdfjs is heavy — only load it when a PDF is actually on screen.
const PdfView = dynamic(() => import("./pdf-view"), {
  ssr: false,
  loading: () => <Loader2 size={24} className="animate-spin text-muted-foreground mx-auto mt-16" />,
});

export interface ViewerDoc {
  id: string;
  title: string;
  type: string | null;
  url: string;
}

/**
 * Sprint 8 Item 1 — the in-app document viewer. Full-screen overlay for
 * uploaded files (PDFs render inline, images full-screen), pinch-zoom,
 * swipe left/right between docs, cache-first loading (IndexedDB) with an
 * offline message when a doc has no cached copy, and a boarding-pass
 * mode: chrome hides, surface goes white, screen wake-lock holds — one
 * tap exits. (Browsers can't raise hardware brightness; wake-lock +
 * white surround is the closest the web allows.)
 */
export function DocumentViewer({
  docs,
  initialIndex,
  onClose,
}: {
  docs: ViewerDoc[];
  initialIndex: number;
  onClose: () => void;
}) {
  const t = useT();
  const [index, setIndex] = useState(initialIndex);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [blobType, setBlobType] = useState<string>("");
  const [state, setState] = useState<"loading" | "ready" | "offline" | "error">("loading");
  const [bpMode, setBpMode] = useState(false);
  const [width, setWidth] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);

  const doc = docs[index];

  // Load (cache-first) whenever the doc changes.
  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    setState("loading");
    setObjectUrl(null);
    loadDocBlob(doc.url).then((res) => {
      if (cancelled) return;
      if (!res) {
        setState(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
        return;
      }
      url = URL.createObjectURL(res.blob);
      setBlobType(res.blob.type);
      setObjectUrl(url);
      setState("ready");
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [doc.url]);

  // Measure the content width for PDF page sizing.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Lock body scroll while open; Escape closes.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Boarding-pass mode: hold a screen wake lock while active.
  useEffect(() => {
    if (!bpMode) return;
    let active = true;
    if ("wakeLock" in navigator) {
      (navigator as Navigator & { wakeLock: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock
        .request("screen")
        .then((s) => {
          if (active) wakeLock.current = s;
          else void s.release();
        })
        .catch(() => {});
    }
    return () => {
      active = false;
      void wakeLock.current?.release();
      wakeLock.current = null;
    };
  }, [bpMode]);

  function step(dir: 1 | -1) {
    setIndex((i) => Math.min(docs.length - 1, Math.max(0, i + dir)));
  }

  const isImage = blobType.startsWith("image/");
  const isPdf = blobType === "application/pdf" || (!isImage && state === "ready");

  const content =
    state === "loading" ? (
      <Loader2 size={24} className="animate-spin text-muted-foreground mx-auto mt-16" />
    ) : state === "offline" ? (
      <div className="text-center mt-16 px-8">
        <WifiSlash size={28} className="mx-auto text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">{t("docs.offlineUnavailable")}</p>
      </div>
    ) : state === "error" ? (
      <p className="text-center mt-16 text-sm text-muted-foreground">{t("docs.loadFailed")}</p>
    ) : isImage && objectUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={objectUrl} alt={doc.title} className="max-w-full max-h-full object-contain mx-auto" />
    ) : isPdf && objectUrl && width > 0 ? (
      <div className="h-full overflow-y-auto py-2">
        <PdfView objectUrl={objectUrl} width={width} />
      </div>
    ) : null;

  if (bpMode) {
    // Boarding-pass: nothing but the document on white, tap to exit.
    return (
      <div
        className="fixed inset-0 z-[90] bg-white flex items-center justify-center cursor-pointer"
        onClick={() => setBpMode(false)}
        role="button"
        aria-label={t("docs.exitBoardingPass")}
      >
        <div className="w-full h-full flex items-center justify-center p-4 overflow-y-auto">{content}</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] flex flex-col" style={{ background: "var(--background)" }}>
      {/* Chrome. */}
      <div
        className="shrink-0 flex items-center gap-2 px-3 border-b border-border"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 8px)", paddingBottom: 8 }}
      >
        <span aria-hidden className="text-lg">{docKindIcon(doc.type)}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold truncate">{doc.title}</p>
          {docs.length > 1 && (
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {index + 1} / {docs.length}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setBpMode(true)}
          aria-label={t("docs.boardingPass")}
          className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"
        >
          <Barcode size={18} />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"
        >
          <X size={18} />
        </button>
      </div>

      {/* Document body — pinch to zoom, swipe to change docs. */}
      <div ref={bodyRef} className="flex-1 min-h-0 relative">
        <PinchZoom onSwipe={step}>
          <div className="w-full h-full flex flex-col justify-start px-2">{content}</div>
        </PinchZoom>
        {/* Desktop/no-touch fallback arrows. */}
        {docs.length > 1 && index > 0 && (
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous"
            className="absolute start-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-muted/80 flex items-center justify-center"
          >
            <CaretLeft size={16} className="rtl:rotate-180" />
          </button>
        )}
        {docs.length > 1 && index < docs.length - 1 && (
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next"
            className="absolute end-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-muted/80 flex items-center justify-center"
          >
            <CaretRight size={16} className="rtl:rotate-180" />
          </button>
        )}
      </div>
    </div>
  );
}
