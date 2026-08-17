/**
 * Step 1 of the Now redesign — "Add a confirmation".
 *
 * A ParsedConfirmation is what the extractor returns and what the preview
 * shows before anything is saved. Kept deliberately small: the fields the
 * ticket, the horizon and the Day-1 anchors need, nothing else.
 */
export type ConfirmationKind = "flight" | "hotel" | "train" | "other";

export interface ParsedConfirmation {
  kind: ConfirmationKind;
  /** e.g. "SV 826" for a flight, "Shinjuku Granbell Hotel" for a hotel */
  title: string;
  /** airline / hotel chain / operator, when distinct from title */
  provider: string | null;
  /** booking / PNR / reservation code */
  confirmation: string | null;
  /** YYYY-MM-DD local date of departure or check-in */
  date: string | null;
  /** HH:mm local time of departure or check-in */
  time: string | null;
  /** YYYY-MM-DD check-out or arrival date */
  endDate: string | null;
  /** HH:mm arrival or check-out time */
  endTime: string | null;
  /** IATA or city — flights/trains */
  from: string | null;
  to: string | null;
  /** hotels: street address if present */
  address: string | null;
  /** hotels: rooms, flights: passengers — free text, short */
  notes: string | null;
  /** 0–1 */
  confidence: number;
}

export interface ParseResponse {
  items: ParsedConfirmation[];
  /** why nothing was found, if items is empty */
  reason?: string;
}

const KINDS: ConfirmationKind[] = ["flight", "hotel", "train", "other"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Coerce whatever the model emitted into a safe ParsedConfirmation, or null. */
export function normalizeParsed(raw: unknown): ParsedConfirmation | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const str = (k: string, max = 120): string | null => {
    const v = r[k];
    return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
  };
  const title = str("title");
  if (!title) return null;
  const kind = KINDS.includes(r.kind as ConfirmationKind) ? (r.kind as ConfirmationKind) : "other";
  const date = str("date"); const endDate = str("endDate");
  const time = str("time"); const endTime = str("endTime");
  const conf = typeof r.confidence === "number" ? Math.max(0, Math.min(1, r.confidence)) : 0.5;
  return {
    kind, title,
    provider: str("provider"),
    confirmation: str("confirmation", 40),
    date: date && DATE.test(date) ? date : null,
    time: time && TIME.test(time) ? time : null,
    endDate: endDate && DATE.test(endDate) ? endDate : null,
    endTime: endTime && TIME.test(endTime) ? endTime : null,
    from: str("from", 60), to: str("to", 60),
    address: str("address", 200),
    notes: str("notes", 160),
    confidence: conf,
  };
}
