"use client";

import { useEffect, useState } from "react";
import { List, GridFour } from "@phosphor-icons/react/dist/ssr";
import { AddDocumentDialog } from "./add-document-dialog";
import { DocumentCard, type DocumentCardData } from "./document-card";
import { DocumentViewer } from "./document-viewer";
import { DocThumb } from "./doc-thumb";
import { isFileDoc } from "@/lib/doc-file";
import { DOCUMENT_KINDS } from "@/lib/document-kind";
import { parseDateOnly } from "@/lib/date-only";
import { format } from "@/lib/i18n/date-fns";
import { useT } from "@/components/i18n/locale-provider";

const VIEW_KEY = "paxawa-docs-view";

/**
 * Sprint 8 Item 1 — the Documents screen body (Huddle → Docs): list/grid
 * toggle (persisted in localStorage), thumbnails in grid view, and the
 * in-app viewer for uploaded files. Links keep opening out — the badge
 * on each card says which is which before the tap.
 */
export function DocsPanel({ tripId, docs }: { tripId: string; docs: DocumentCardData[] }) {
  const t = useT();
  const [view, setView] = useState<"list" | "grid">("list");
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // localStorage is client-only — read after mount to keep SSR markup stable.
  useEffect(() => {
    const saved = localStorage.getItem(VIEW_KEY);
    if (saved === "grid" || saved === "list") setView(saved);
  }, []);

  function switchView(v: "list" | "grid") {
    setView(v);
    localStorage.setItem(VIEW_KEY, v);
  }

  const fileDocs = docs.filter((d) => isFileDoc(d.url));
  const openViewer = (doc: DocumentCardData) => {
    const idx = fileDocs.findIndex((f) => f.id === doc.id);
    if (idx >= 0) setViewerIndex(idx);
  };
  const kindLabel = (type: string | null) => {
    const k = DOCUMENT_KINDS.find((x) => x.value === type);
    return k ? t(k.labelKey) : t("docs.kindOther");
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] font-bold uppercase text-tertiary" style={{ letterSpacing: 1.5 }}>
          {t("docs.header", { count: docs.length })}
        </p>
        <div className="flex items-center gap-2">
          {/* List / grid toggle. */}
          <div className="flex rounded-full bg-muted p-0.5">
            {(
              [
                { v: "list", icon: List, label: t("docs.viewList") },
                { v: "grid", icon: GridFour, label: t("docs.viewGrid") },
              ] as const
            ).map(({ v, icon: Icon, label }) => (
              <button
                key={v}
                type="button"
                onClick={() => switchView(v)}
                aria-label={label}
                aria-pressed={view === v}
                className={`tap-hit w-8 h-7 rounded-full flex items-center justify-center transition-colors ${
                  view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                <Icon size={16} weight={view === v ? "fill" : "regular"} />
              </button>
            ))}
          </div>
          <AddDocumentDialog tripId={tripId} />
        </div>
      </div>

      {docs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          <p>{t("docs.empty")}</p>
          {/* Now-redesign follow-up: the fastest way to fill this tab is the
              confirmation reader, not a blank upload. */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("paxawa:openConfirmation"))}
            className="mt-3 h-10 px-4 rounded-full bg-primary text-primary-foreground text-[13px] font-bold"
          >
            {t("confirm.title")}
          </button>
        </div>
      ) : view === "list" ? (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li key={d.id}>
              <DocumentCard doc={d} onOpen={() => openViewer(d)} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {docs.map((d) => {
            const isFile = isFileDoc(d.url);
            const cardInner = (
              <>
                <span className="relative block aspect-[4/3] bg-muted overflow-hidden">
                  <DocThumb url={d.url} type={d.type} title={d.title} />
                  <span
                    className={`absolute top-1.5 end-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      isFile ? "bg-primary text-primary-foreground" : "bg-black/55 text-white"
                    }`}
                  >
                    {isFile ? t("docs.badgeFile") : t("docs.badgeLink")}
                  </span>
                </span>
                <span className="block px-2.5 py-2">
                  <span className="block text-[13px] font-semibold truncate">{d.title}</span>
                  <span className="block text-[12px] text-muted-foreground truncate">
                    {[kindLabel(d.type), d.dayDate ? format(parseDateOnly(d.dayDate), "d MMM") : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </>
            );
            const cls =
              "block w-full rounded-2xl bg-card border border-border overflow-hidden active:scale-[0.99] transition-transform text-start";
            return (
              <li key={d.id}>
                {isFile ? (
                  <button type="button" onClick={() => openViewer(d)} className={cls}>
                    {cardInner}
                  </button>
                ) : (
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className={cls}>
                    {cardInner}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {viewerIndex != null && fileDocs[viewerIndex] && (
        <DocumentViewer docs={fileDocs} initialIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
      )}
    </section>
  );
}
