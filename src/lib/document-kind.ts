/**
 * Sprint 5 §3a — document kinds. `documents.type` now records what a
 * document IS (flight / hotel / transport / visa / other) rather than its
 * file format. Legacy rows carry the old format values (pdf / link / image)
 * — they display as "Other" per the sprint's data note.
 */
export const DOCUMENT_KINDS = [
  { value: "flight", icon: "✈️", labelKey: "docs.kindFlight" },
  { value: "hotel", icon: "🏨", labelKey: "docs.kindHotel" },
  { value: "transport", icon: "🚌", labelKey: "docs.kindTransport" },
  { value: "visa", icon: "🛂", labelKey: "docs.kindVisa" },
  { value: "other", icon: "📄", labelKey: "docs.kindOther" },
] as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[number]["value"];

export function docKindIcon(type: string | null | undefined): string {
  return DOCUMENT_KINDS.find((k) => k.value === type)?.icon ?? "📄";
}
