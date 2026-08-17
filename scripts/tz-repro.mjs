/**
 * Reproduction of the bug fix/tz fixes. Run from the repo root:
 *
 *   for tz in UTC America/Los_Angeles Asia/Kuala_Lumpur; do TZ=$tz node scripts/tz-repro.mjs; done
 *
 * WHAT THIS IS: `legacyTripPhase` below is `src/lib/trip-phase.ts` as it stood
 * on main @ f50dafe, transcribed verbatim together with `parseDateOnly` from
 * `src/lib/date-only.ts`. It is a transcription, not an import — the real
 * module no longer has this signature, and pinning a copy here is the only way
 * to keep the old behaviour executable after the fix lands. Diff it against
 * `git show f50dafe:src/lib/trip-phase.ts` if you want to check the copy.
 *
 * WHAT IT SHOWS: the phase transitions all fire at LOCAL midnight on the
 * correct calendar day — so the function was internally consistent. The defect
 * is that the server's "local" is UTC and the traveller's is not, so the same
 * instant yields different phases for different viewers, and the server's
 * answer is the one that renders the HTML, the nav labels and the nav hrefs.
 *
 * Expected output (2026, trip 5–12 Oct):
 *
 *   UTC                  LIVE -> RECAP at 2026-10-13T00:00:00.000Z
 *   America/Los_Angeles  LIVE -> RECAP at 2026-10-13T07:00:00.000Z
 *   Asia/Kuala_Lumpur    LIVE -> RECAP at 2026-10-12T16:00:00.000Z
 *
 * Read those three lines as: on a UTC server the LA traveller loses the live
 * cockpit at 12 Oct 17:00 their time (mid-dinner, final night), and the KL
 * traveller's own client says RECAP eight hours before the server does.
 */
import { differenceInCalendarDays, startOfDay, endOfDay } from "date-fns";

// --- verbatim from main @ f50dafe -------------------------------------------
function parseDateOnly(s) {
  if (!s) return new Date(NaN);
  const ymd = s.slice(0, 10);
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}

function legacyTripPhase(trip, now = new Date()) {
  const start = startOfDay(parseDateOnly(trip.startDate));
  const end = endOfDay(parseDateOnly(trip.endDate));
  if (now > end) return "RECAP";
  if (now >= start) return "LIVE";
  if (differenceInCalendarDays(start, now) <= 7) return "DEPARTURE";
  return "PLANNING";
}
// --- end verbatim -----------------------------------------------------------

const trip = { startDate: "2026-10-05", endDate: "2026-10-12" };
const zone = process.env.TZ ?? "(host default)";

console.log(`\n=== TZ=${zone} ===`);

let prev = null;
for (let t = Date.UTC(2026, 8, 25); t <= Date.UTC(2026, 9, 15); t += 60_000) {
  const at = new Date(t);
  const phase = legacyTripPhase(trip, at);
  if (phase !== prev) {
    if (prev) {
      const local = at.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
      console.log(`  ${prev.padEnd(9)} -> ${phase.padEnd(9)} at ${at.toISOString()}  (local: ${local})`);
    }
    prev = phase;
  }
}

// The headline: one instant, three different answers.
const instant = new Date("2026-10-05T01:00:00.000Z");
console.log(
  `  at ${instant.toISOString()} this process says: ${legacyTripPhase(trip, instant)}` +
    `  (wall clock here: ${instant.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })})`,
);
