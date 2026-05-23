/**
 * Tiny RFC 5545 ICS builder. We don't use a library because the spec is
 * small enough that a 100-line builder beats a 20kB dependency, and the
 * less surface area we expose to itinerary item content the better.
 *
 * Supports VEVENT only (which is what itinerary items map to). Lines are
 * CRLF-terminated and folded at 75 octets per the RFC so calendar clients
 * (Apple Calendar, Google Calendar, Outlook) accept the file without
 * complaining.
 */

export interface IcsEvent {
  uid: string;
  /** All-day fallback when no time is given. */
  dayDate: string;          // YYYY-MM-DD
  /** Optional local time, "HH:MM:SS" or "HH:MM". When present we emit
   *  a DTSTART with a fixed 1-hour duration unless `endDate` is set. */
  startTime?: string | null;
  endTime?: string | null;
  summary: string;
  location?: string | null;
  description?: string | null;
  url?: string | null;
  /** Last-modified — bumps clients to re-import on refresh. */
  updatedAt?: Date | null;
}

export interface IcsCalendarMeta {
  /** Human-readable calendar name (Apple/Google show this in the sidebar). */
  name: string;
  /** RFC 7986 description; optional. */
  description?: string;
}

const CRLF = "\r\n";

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function fmtDate(dayDate: string): string {
  // YYYY-MM-DD → YYYYMMDD
  return dayDate.replace(/-/g, "");
}

function fmtDateTime(dayDate: string, time: string): string {
  const [h = "0", m = "0", s = "0"] = time.split(":");
  // Floating local time (no Z, no TZID) — calendar clients render it in the
  // user's local zone, which is what travelers want for "9am breakfast".
  return `${fmtDate(dayDate)}T${pad(parseInt(h))}${pad(parseInt(m))}${pad(parseInt(s))}`;
}

function fmtUtcStamp(d: Date): string {
  // YYYYMMDDTHHMMSSZ
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** Per RFC 5545: escape commas, semicolons, backslashes, newlines. */
function esc(value: string | null | undefined): string {
  if (value == null) return "";
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** Fold lines longer than 75 octets per RFC 5545 §3.1. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (i === 0) {
      out.push(line.slice(0, 75));
      i = 75;
    } else {
      out.push(" " + line.slice(i, i + 74));
      i += 74;
    }
  }
  return out.join(CRLF);
}

export function buildIcs(
  meta: IcsCalendarMeta,
  events: IcsEvent[],
): string {
  const now = new Date();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Paxawa//Trip Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(meta.name)}`,
  ];
  if (meta.description) {
    lines.push(`X-WR-CALDESC:${esc(meta.description)}`);
  }

  for (const e of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${e.uid}@paxawa.com`);
    lines.push(`DTSTAMP:${fmtUtcStamp(now)}`);
    if (e.updatedAt) lines.push(`LAST-MODIFIED:${fmtUtcStamp(e.updatedAt)}`);

    if (e.startTime) {
      const startDt = fmtDateTime(e.dayDate, e.startTime);
      lines.push(`DTSTART:${startDt}`);
      if (e.endTime) {
        lines.push(`DTEND:${fmtDateTime(e.dayDate, e.endTime)}`);
      } else {
        // Default 1 hour duration if no end time was given.
        const [h = "0", m = "0"] = e.startTime.split(":");
        const start = new Date(2000, 0, 1, parseInt(h), parseInt(m));
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        lines.push(
          `DTEND:${fmtDate(e.dayDate)}T${pad(end.getHours())}${pad(end.getMinutes())}00`,
        );
      }
    } else {
      // All-day event. RFC: DTSTART;VALUE=DATE then DTEND is next day.
      const start = new Date(e.dayDate + "T00:00:00Z");
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      lines.push(`DTSTART;VALUE=DATE:${fmtDate(e.dayDate)}`);
      lines.push(
        `DTEND;VALUE=DATE:${end.getUTCFullYear()}${pad(end.getUTCMonth() + 1)}${pad(end.getUTCDate())}`,
      );
    }

    lines.push(`SUMMARY:${esc(e.summary)}`);
    if (e.location) lines.push(`LOCATION:${esc(e.location)}`);
    if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`);
    if (e.url) lines.push(`URL:${esc(e.url)}`);

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(fold).join(CRLF) + CRLF;
}
