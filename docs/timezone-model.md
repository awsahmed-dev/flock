# Paxawa timezone model

Written alongside `fix/tz`. This is the decision record: what the rule is, what
was broken, what is now fixed, and — deliberately — what is still wrong.

---

## The rule

**A trip's phase, and every "which day is it" question in the product, is a
question about calendar days. Never about instants.**

`trips.start_date` and `trips.end_date` are Postgres `date` columns — no time,
no zone. A `date` compared against a `Date` is a category error, and it was the
root of every bug in this cluster.

Concretely:

- `todayIso` is a `"YYYY-MM-DD"` string. It is resolved **once per render**, on
  the server, by `getToday()` in `src/lib/today-server.ts`.
- It is threaded down as a prop. **Client components must never compute it.**
- Comparisons are string comparisons — `"YYYY-MM-DD"` sorts lexicographically,
  so `today > endDate` is exactly "after the trip". No `Date` is constructed, so
  no `Date` can be constructed in the wrong zone.
- Day arithmetic goes through `diffDaysIso` / `addDaysIso` in `src/lib/today.ts`,
  which do their maths in UTC on purpose: both operands are calendar days, so
  there is no zone to honour and no DST to trip over.

**Whose calendar?** The traveller's device. If it is the 5th where you are
standing, your trip is live. The zone reaches the server through the `paxawa_tz`
cookie, written by `<TimeZoneSync />` and read by `getToday()` — the same
mechanism `paxawa_locale` has always used. Absent the cookie we fall back to
UTC, which is precisely the old behaviour, so a first-ever request is no worse
than before and every request after it is right.

---

## What was broken

`tripPhase` took an instant (`now: Date = new Date()`) and compared it against
boundaries built at **local** midnight. That is internally consistent — I
scanned it minute by minute and every transition fires at local midnight on the
correct calendar day, in every zone. The function was not the bug.

The bug was that **the server's "local" is UTC and the traveller's is not**, so
the same instant produced different phases for different viewers — and the
server's answer is the one that renders the HTML, the nav labels, the nav icons
and the nav hrefs.

Reproduce it: `npm run tz:repro`

```
trip 5–12 Oct 2026
  UTC                  LIVE -> RECAP at 2026-10-13T00:00:00.000Z
  America/Los_Angeles  LIVE -> RECAP at 2026-10-13T07:00:00.000Z
  Asia/Kuala_Lumpur    LIVE -> RECAP at 2026-10-12T16:00:00.000Z
```

Read those three lines as:

- **Los Angeles.** The server flips to RECAP at 12 Oct **17:00 local**. The Wrap
  — a zero-editing recap screen — replaces the live cockpit mid-dinner on the
  traveller's final evening. The LA *client* had it right; the server overrode
  it.
- **Kuala Lumpur.** The client flips to RECAP eight hours *before* the server.
  For that window the hydrated render disagrees with the server HTML: different
  tabs, different labels, different hrefs.

Both directions, one cause: two clocks, and neither of them the traveller's.

### The dashboard bug was bigger than a timezone window

`src/app/dashboard/page.tsx` bucketed trips with
`parseDateOnly(endDate) < new Date()` — local **midnight** on the end date
versus an instant. So from 00:00:01 on the final day of a trip, the trip was
filed under **Past trips**, while `tripPhase()` *on the same page* still said
LIVE and handed it the cold-start hero.

That is not an edge case and not zone-dependent: the dashboard called one trip
both "past" and "live" for the whole of its last day, in **every** timezone.
Verified by execution.

### Pocket Day pre-cached the wrong day

`src/components/pwa/pocket-day.tsx` derived today from
`new Date().toISOString().slice(0, 10)` — the **UTC** calendar day, on the
client. Every traveller east of Greenwich, between midnight and their UTC
offset, warmed the offline cache for *yesterday*. A Kuala Lumpur traveller
opening the app at 01:00 pre-cached the day that had just ended.

### The share page shifted every day one earlier — in the Gulf, not the Americas

`src/app/share/[token]/page.tsx` stepped a local-midnight `Date` and serialised
each step with `.toISOString()`. This is the **inverse** of the bug
`date-only.ts` was written to fix: it breaks in UTC**+** zones and is correct in
the Americas.

```
UTC                  days=[07-10, 07-11, 07-12, 07-13]  matched 4/4
Asia/Riyadh          days=[07-09, 07-10, 07-11, 07-12]  matched 3/4
Europe/London        days=[07-09, 07-10, 07-11, 07-12]  matched 3/4
America/Los_Angeles  days=[07-10, 07-11, 07-12, 07-13]  matched 4/4
```

Because `byDay()` matches these keys against `itinerary_items.day_date`, the
final day of every shared recap renders empty and day 1's content sits under
day 2's heading. Dormant in production (Vercel is UTC); live in `next dev` for
anyone developing in the Gulf, Europe or Asia.

---

## Verified in the running app, not just in tests

`scripts/tz-capture.mjs` renders the same instant to two travellers whose only
difference is the `paxawa_tz` cookie. Run against a seeded trip whose LAST day is
today in UTC ("Seoul Now", 14–17 Aug, captured at 2026-08-17 15:55Z):

| | `main` | `fix/tz` |
|---|---|---|
| **UTC traveller** — for whom it is 17 Aug, the final day | dashboard hero: **"Seoul Now — wrapped 🎬 · See your Wrap →"** while `/trips/<id>` renders the LIVE cockpit with UP NEXT | cold-starts into the live cockpit; day pager reads **"Final day 🌅"** |
| **Pacific/Kiritimati traveller** (UTC+14) — for whom it is already 18 Aug | force-redirected *into* the live cockpit, day pager stuck on **"Fri 14 Aug"** (day 1) | header reads **"TUESDAY, 18 AUGUST"**, trip filed as **wrapped**, Lisbon countdown **1d** |

Three things to read out of that table:

1. On `main` the dashboard called the trip "wrapped" **on its own final day**, while
   the trip screen simultaneously showed the live cockpit. Both screens, one
   page load.
2. On `main` both travellers got the *same* answer — the server's UTC one —
   because there was no channel for the traveller's zone. On `fix/tz` they get
   different answers, and each is right for the person looking at it.
3. The day pager defaulting to "Fri 14 Aug" is `days.indexOf(todayIso)` failing
   to find today, which is why the UP NEXT card and the day-progress line went
   missing during LIVE.

(The Mapbox panel fails to load in the sandbox — no egress. Unrelated.)

---

## Still wrong — deliberately not fixed here

These need a schema column or a product decision, and inventing either inside a
correctness branch would be the wrong trade.

1. **Cron jobs have no per-user zone.** `notif-digest` runs `0 16 * * *` UTC =
   midnight in Kuala Lumpur, 01:00 in Tokyo, 19:00 in Riyadh. `pre-trip-nudge`
   likewise. Fixing this properly needs `profiles.time_zone` (the cookie is not
   visible to a cron) and a fan-out that groups users by offset.

2. **A trip that spans zones follows the device, not the destination.** Fly
   Tokyo → Los Angeles and the phase moves *backwards* by a day, because the
   device's calendar went backwards. The correct model is a `trips.time_zone`
   column set from the destination, with the device zone as the fallback. Not
   invented here.

3. **`now-cockpit.tsx` still asks the local clock for the time of day**
   (`getHours() >= 21`, for the evening-recap card). That is genuinely a
   "what time is it where I am" question, and it is driven by a client-side
   ticking timestamp, so it is left alone. It can still flip on hydration; the
   consequence is one card appearing a few hours early or late.

4. **The "Weekend" duration preset yields a 3-day range** (`days: 2` used as an
   offset, while its siblings encode N−1: `6 → 7 days`, `13 → 14`, `29 → 30`).
   **Not changed** — "Weekend" is not a day count the way "1 Week" is, and
   Fri–Sun is a defensible reading. The real oddity is that the preset does no
   day-of-week snapping at all, so "Weekend" routinely produces Tue–Thu. That is
   a product decision, not a bug fix.
