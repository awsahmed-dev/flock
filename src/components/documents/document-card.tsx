"use client";

import { ArrowSquareOut as ExternalLink, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { parseDateOnly } from "@/lib/date-only";
import { format } from "@/lib/i18n/date-fns";
import { docKindIcon } from "@/lib/document-kind";
import { isFileDoc } from "@/lib/doc-file";
import { useT } from "@/components/i18n/locale-provider";

export interface DocumentCardData {
  id: string;
  title: string;
  type: string | null;
  url: string;
  dayDate: string | null;
  uploaderName?: string | null;
}

/**
 * Sprint 5 §3d — THE document card, shared by the Pack docs section, the
 * PLANNING cockpit strip, the itinerary day rows, and the LIVE day view.
 * Exactly four things, in scan order: kind icon → title → day → open.
 *
 * Sprint 8 Item 1: uploaded files open the in-app viewer when the parent
 * passes `onOpen`; pasted links always open out to the browser, and a
 * file/link badge tells the user which will happen BEFORE they tap.
 */
export function DocumentCard({
  doc,
  dayLabel,
  onOpen,
}: {
  doc: DocumentCardData;
  dayLabel?: string | null;
  /** Open this doc in the in-app viewer — only used for uploaded files. */
  onOpen?: () => void;
}) {
  const t = useT();
  const isFile = isFileDoc(doc.url);
  const inApp = isFile && onOpen != null;

  const inner = (
    <>
      <span aria-hidden className="text-xl leading-none shrink-0 w-7 text-center">
        {docKindIcon(doc.type)}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] font-semibold truncate">{doc.title}</span>
        {(dayLabel || doc.uploaderName) && (
          <span className="block text-[12px] text-muted-foreground truncate">
            {[dayLabel, doc.uploaderName].filter(Boolean).join(" · ")}
          </span>
        )}
      </span>
      {doc.dayDate && !dayLabel && (
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[12px] font-bold tabular-nums">
          {format(parseDateOnly(doc.dayDate), "d MMM")}
        </span>
      )}
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
          isFile ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground"
        }`}
      >
        {isFile ? t("docs.badgeFile") : t("docs.badgeLink")}
      </span>
      {inApp ? (
        <CaretRight size={16} className="text-tertiary shrink-0 rtl:rotate-180" />
      ) : (
        <ExternalLink size={16} className="text-tertiary shrink-0" />
      )}
    </>
  );

  const cls =
    "w-full flex items-center gap-3 rounded-2xl bg-card border border-border px-3 h-14 active:scale-[0.99] transition-transform text-start";

  if (inApp) {
    return (
      <button type="button" onClick={onOpen} className={cls}>
        {inner}
      </button>
    );
  }
  return (
    <a href={doc.url} target="_blank" rel="noopener noreferrer" className={cls}>
      {inner}
    </a>
  );
}
