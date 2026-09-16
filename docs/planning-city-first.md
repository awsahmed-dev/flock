# Planning: bases, not days

Successor to `planning-ux-audit.md`. That audit killed the 21-question wizard and
replaced it with «الباقة» — a ready plan. The plan was right; the **shape** of it
was wrong.

This document went through a review pass that changed it substantially. The first
draft proposed a city-first *funnel*. Two findings killed that framing, and both
are recorded in §2 rather than quietly edited out, because the reasoning is the
point.

---

## 0. The honest diagnosis

We shipped a package screen that renders a trip as a list of days. On a 7-day
Istanbul trip that is 7 accordions. On a 30-day Japan trip it is 30, and 23 of
them say «يوم حر», and you open them one at a time to find that out.

We set out to remove overwhelm and we moved it. The wizard overwhelmed you with
questions *before* showing anything; the package overwhelms you with rows
*after*. Both fail the same way: **the first screen holds more objects than the
user has opinions about.**

The founder's sentence is the finding: *"we are just sewing ideas together
without even having the question of why and how."* So this starts with the
question we skipped.

---

## 1. The question we skipped

**In what order does a person actually decide a trip?** Not a guess — the
observable order, with the column that turns out to matter most.

| # | Decision | Where it happens today | Argued about? |
|---|---|---|---|
| 1 | Which country | Socially, long before any app | — |
| 2 | When, and how long | Leave days, school term, flight prices | rarely |
| 3 | **Which places we sleep** | YouTube, a friend who went | **constantly** |
| 4 | **How long in each** | Same — the real trade-off | **constantly** |
| 5 | **How we move between them** | JR Pass? cheap flight? | often |
| 6 | Which hotel | Booking.com, after 3–5 settle | sometimes |
| 7 | What to do each day | The night before, or on the ground | almost never |

**Our product starts at row 7 and works backwards.** The package screen's primary
object is a day with stops in it — the last and least-contested decision on the
list — while rows 3–5 are invisible, buried in a `cities[]` array we render as a
decorative subtitle. (Confirmed: `cities[]` has exactly two readers repo-wide,
one of which is a test. Nothing in the UI reads it.)

**And we bolted the group features to the wrong layer.** Reactions and votes sit
on days. Nobody has an opinion about day 17. People argue about «أربع ليالٍ في
كيوتو كثير» and «ليش نتخطى أوساكا؟». Our voting feature is attached to the one
layer of a trip that no group contests.

That much survived review intact. What follows did not.

---

## 2. Two corrections that changed the design

### 2.1 The noun is **base**, not city

The first draft said "people plan by city". Closer, but still wrong, and our own
data disproves it:

- **Istanbul** — one city, 5 nights.
- **Georgia** — *titled* "Tbilisi → the mountains → back", and it is **one base**:
  Kazbegi and Sighnaghi are day trips out of Tbilisi.
- **Japan** — genuinely three.

Two of our three curated routes are single-base. Of the ~15 Tier-1 destinations
we committed to curate, roughly five are multi-base (Japan, Malaysia, Thailand,
Bosnia, maybe Dubai/AlUla). The Gulf-modal trip — Eid week in Istanbul, Tbilisi,
Trabzon, Salalah, a resort in the Maldives — is **single-base**.

The unit is **where you sleep, and what you can reach from there and come back the
same evening.** That is a base. It makes the model smaller, not bigger:

- A trip is **1–4 bases**, each with a date range.
- A day trip is **content belonging to a base**, not a node in a chain.

My "a day trip is a city with 0 nights" idea was wrong and I'm dropping it. It
puts Nara *between* Kyoto and Tokyo in the list, with a transport connector on
both sides and a drag handle inviting you to reposition something that has no
position. Day trips are chips **attached to** a base card. Georgia's package
already models this correctly; the design just hadn't caught up to the data.

### 2.2 It is not a funnel. It is a plan with handles.

The first draft had five rooms and claimed you could stop after any of them. That
claim was false: `adoptPackage` is a separate, one-shot write, so a user who bails
in room 2 lands back on the empty plan tab — the exact state this whole project
exists to kill.

Worse, a named-room funnel is an implicit promise you can walk back in. But
editing the shape *after* adoption has no defined behaviour today: the itinerary
rows are already written, and changing Kyoto from 4 nights to 2 either silently
does nothing or wipes hand-edited days. Which is guaranteed to happen, because
hotel prices come back and Kyoto becomes 2 nights.

So:

> **Choosing a route adopts it immediately.** You have a complete trip the instant
> you tap. Everything after that is a *handle on a live plan*, re-enterable, never
> a gate.

A funnel where every room is optional and re-enterable isn't a funnel. Calling it
one was what produced the extra ceremony.

---

## 3. The shape of it

```
   الوجهة                 المسارات              ← tap = you have a trip
   destination + kind      2–4 curated routes
        │                        │
        └────────────────────────┴──────────►  الخطة  (live, complete)
                                                 │
                            ┌────────────────────┼────────────────────┐
                            ▼                    ▼                    ▼
                      شكل الرحلة             الأيام              الناقص
                    bases · dates          the day grid        what to book
                    (only if >1 base)      (edit here)         (the errand list)
```

Three handles on one plan, not five rooms in a row.

### Entry — «الوجهة»

Destination + dates, as today. Plus **one new question that actually changes the
machine**: سياحة / عمرة / زيارة أهل / شغل.

This is worth a question because running the wrong product is expensive. An Umrah
trip is Makkah nights + Madinah nights — base-structured, so the premise holds —
but its day plan is *gaps between Haram times*, not 3–5 stops, and a nightlife
toggle for Makkah is not a bug, it is a brand incident in our core market. A
family visit in Cairo has no funnel at all: a saves tray and «وش الحين؟».

One question, four machines. Everything below describes the سياحة machine.

### «المسارات» — and the tap that adopts

2–4 hand-curated routes. Not generated. Each card shows the base chain **pre-scaled
to their real dates**, who it's for («أول زيارة» · «لو زرت طوكيو قبل» · «إيقاع
عائلة»), and honest provenance. A fourth card is always «من الصفر».

**Tapping adopts.** Days are written, the trip is complete, and the user lands on
a plan — not a draft they have to confirm.

Single-base destination? There is no chain to choose between, so this room shows
one route and goes straight through. It must not become a screen that asks you to
pick between one thing and nothing.

### «شكل الرحلة» — the handle, when there's a shape to have

Only rendered when the trip has more than one base, and always reachable from the
plan. This is the screen the founder described, corrected for §2:

```
┌────────────────────────────────────────────┐
│  ٣٠ سبتمبر ← ١٤ أكتوبر · كل الأيام موزّعة   │
├────────────────────────────────────────────┤
│  ⠿ [photo] طوكيو                           │
│            ٣٠ سبت → ٦ أكت · ٦ ليالٍ          │
│            ٥ من محفوظاتكم هنا               │
│            ↳ رحلات يوم: هاكوني · نيكّو  ＋  │
│            🔥 ٢  🙂 ١                        │
├────────────────────────────────────────────┤
│       🚄 الشينكانسن · ٢س ١٥د  →  احجز       │
├────────────────────────────────────────────┤
│  ⠿ [photo] كيوتو          🔒 محجوز          │
│            ٦ أكت → ١٠ أكت · ٤ ليالٍ          │
│            ↳ رحلات يوم: نارا  ＋            │
├────────────────────────────────────────────┤
│  ＋ أضف مقرًّا                               │
└────────────────────────────────────────────┘
```

Every control maps to a row 3–5 decision, and nothing maps to row 7. That is the
test this screen has to pass.

Three things changed from the first draft:

- **Date ranges, not a nights budget** (§4).
- **Day trips are chips on the base card**, with their own «＋».
- **Saves are visible per base** — «٥ من محفوظاتكم هنا». The first draft dropped
  saves entirely, which quietly reverted to canon-only authoring and re-argued the
  listicle problem the earlier roundtable already solved. The moat is «رتّبها لي».
  It belongs on this screen.

### «الأيام» — the existing itinerary

Not a new screen. What changes: days carry their base, travel days are marked, and
the grid is a **projection** that can be recomputed when the shape changes (§5).

### «الناقص» — the errand list

The unasked question: *what does the user actually do next?* They **book**. We
construct the exact object a hotel booking contains — place, check-in, nights —
and then do nothing with it.

The shape terminates in a checklist of real jobs:

> ناقصكم: فندق طوكيو ٦ ليالٍ · قطار كيوتو · فندق كيوتو ٤ ليالٍ

Each tappable, each becoming a booking anchor. That turns a pretty structure into
an errand list, which is what planning actually is.

---

## 4. Date ranges, not nights

The first draft budgeted nights. It doesn't close, and here is the list:

- **Off-by-one, guaranteed.** `eachDay` is inclusive: D dates = D days = D−1
  nights. The ledger would say «١٤ ليلة · ٠ باقية» while the grid rendered 15 days.
- **The canon already lies.** Japan's `nights: 3/2/2` sums to 7 and
  `days.length === 7` — those are *day* counts wearing the word nights.
- **2am arrivals.** Gulf red-eyes into Bangkok and Tbilisi land 02:00–05:00. The
  hotel charges the previous night; the traveller's mental "3 nights" is the
  hotel's 4.
- **The departure day isn't a night.** Osaka's last curated day is literally "a
  walk, a coffee, and time to make your flight". A nights stepper can't say that.
- **Overnight transport** is a night belonging to no base.
- **Open-jaw** — fly into Tokyo, out of Osaka — is unrepresentable, and free
  drag-to-reorder makes producing an invalid chain easy. Note the wizard we killed
  *did* ask for arrival and departure airports.

So each base owns a **date range**, which is what a hotel booking is:

```
base[0].checkIn  = trip.startDate
base[i].checkOut = base[i+1].checkIn      // the travel day is the shared boundary
base[n].checkOut = trip.endDate           // the departure half-day
```

This sums trivially, handles the departure half-day, lets an overnight leg own its
own block, and the ledger becomes something checkable: «كل الأيام موزّعة» or «٣
أيام بلا مقرّ». The stepper still says «٦ ليالٍ» because that is how people talk —
it just *writes* dates, and moving one base shifts the boundaries after it. Locked
bases don't move.

### Scaling, corrected

Linear ratio scaling is absurd where help is most needed. 30 nights on Japan's
3:2:2 gives **13 nights in Tokyo**. Nobody has ever done that. Cities saturate at
roughly 4–5 nights; real long-trip behaviour is *more bases*, not longer ones.

So: each canonical base carries a `maxNights`, and when the trip exceeds the
route's capacity we **say so and offer extension bases** rather than inflating:

> المسار الكلاسيكي يغطي ١٠ ليالٍ — عندكم ٣٠. نضيف مقرات؟

And the warning that outranks all of this: **we have seven days of Japan.** No
funnel, no allocator and no wording fixes a 20-night trip against a 7-day corpus.
Until the content is deep enough, every structure we build in front of it
terminates in blank days, and the user will blame the screen for lying rather than
the data for being thin. **Curating extension bases beats adding more countries.**

---

## 5. Data model

Two changes. The first makes "add a base" possible; the second makes editing after
adoption safe.

### Curated days belong to bases, not routes

Today a `CanonPackage` owns `days[]` and its `cities[]` is decoration — the
allocator recomputes everything from `canon.days.length`, so the declared `nights`
is never read. That is why adding Nara can only add a blank day: Nara has no
content to bring.

```ts
Base {                            // was: a bare string on CanonDay.city
  id; nameAr; nameEn; country;
  lat; lng; photoRef;
  typicalNights; maxNights;       // maxNights is what stops "13 nights in Tokyo"
  reachable: BaseId[];            // day trips out of here
  pairsWith: BaseId[];            // the "add a base" suggestion rail
  days: CanonDay[];               // content lives here
}
Route {
  id;                             // MISSING TODAY — canon has no stable id at all
  match: string[];
  legs: { baseId; nightsRatio }[];
  transport: { from; to; mode; minutes }[];
}
```

### The chain is trip state, not draft state

Today there are two sources of truth: `tripPackages.payload.days` and
`itineraryItems`. Adoption is a one-shot copy between them, so any structural edit
afterwards is a data-corruption question with no answer.

```ts
trip_segments {                   // new table — the trip's real shape
  tripId; order; baseId;
  checkIn; checkOut;              // dates, not a night count
  transportInMode; transportInMinutes;
  lockedBy: "flight" | "hotel" | null;
}
```

The day grid becomes a **recomputable projection** of `trip_segments`, with
user-edited days pinned and re-homed rather than destroyed. This is the change
that makes «شكل الرحلة» a handle instead of a one-way door — and it also gives the
mid-trip surface its answer for free: *you're in Kyoto, 2 nights left, here's
what's still unvisited nearby.*

### Blockers found in the code, in fix order

1. `zPayload.cities` accepts only `{name, nights}` and zod strips unknown keys —
   **any richer city object is silently dropped on save.** Fix first.
2. `adoptPackage` drops `day.city` on the floor; `itinerary_items` has no base
   column, so base grouping dies at the itinerary boundary.
3. No stable ids anywhere — routes have none, cities have none, and the existing
   drag-and-drop uses array-index ids. Reorder plus add/remove needs them.
4. No transport persistence. `itinerary_items.type` has a `transport` value but a
   row is pinned to one `dayDate` and cannot span two bases.
5. `trip_packages` has no unique constraint on `trip_id` while all the code assumes
   one row per trip.
6. Two competing taste models — the 5-dim `taste-engine.ts` (persisted, learns)
   and a hand-rolled `PACES` enum in the old planner. Pick the vector.

---

## 6. What we already built and forgot

**`src/components/trips/ai-planner-panel.tsx` already implements most of «شكل
الرحلة».** Sortable base cards, a nights stepper per card, a transport-mode
selector between them, add-a-city, city photos fetched from Google, and a nights
budget clamped to the trip length. It is 1400 lines and it is reachable only from
`/dev/planner`, which `notFound()`s in production.

It also contains the two Android drag fixes we paid for in video QA — `TouchSensor
{delay: 180, tolerance: 12}`, `select-none` to stop long-press text selection
hijacking the hold, and a separate grip with `touch-action: none` for instant
drag. That is the pattern to copy.

So this is mostly **extraction and persistence, not invention.** The curated half
(`canonical.ts`) and the editable half (`ai-planner-panel`) were built by different
passes and never met. Harvest it before deleting it — note that my last commit
removed its final entry point, so it is dead code right now.

---

## 7. What dies

- **Room 3, the per-city taste form.** Six toggles × N bases plus a pace dial is
  18–21 decisions — the exact count the audit condemned in the wizard. Moving it
  later in the flow and giving it a nicer name doesn't change what it is. Pace
  survives as one optional chip *on the results*; texture comes from the six verbs
  we already have, because reacting to something concrete beats guessing in a form
  about a city you've never seen.
- **The day-list package screen as the entry point.** The day view survives as the
  editor it should always have been.
- **Per-day reactions.** They move up to base cards.
- **"0 nights = day trip".** Wrong model (§2.1).
- **The nights budget as the ledger.** Replaced by date coverage (§4).
- **Any remaining path into the old wizard** — but harvest §6 first.

---

## 8. The transport connector: earn it or delete it

Arguments for asking are weak — we have no transport API, can't price it, can't
time it, can't book it, and half the legs have no real choice (Tokyo→Kyoto is the
Shinkansen, always). Offering «طيران ▾» there is fake agency.

So it is **an assertion with a consequence**, not a question. The curated leg
states mode and duration as fact — «الشينكانسن · ٢س ١٥د» — and the app must do
exactly two things with it or the control comes out:

1. **Reserve the travel block on the derived day**, so the grid never plans five
   stops on a transfer morning. This is the consequence that makes the whole model
   honest.
2. **Tapping creates a booking anchor** — we already have the `bookings` table with
   `bookingType`, `checkinTime`, `confirmationNumber`, `pdfUrl`.

A control whose only effect is changing its own label is the wizard coming back.

---

## 9. Inverting the entry: bookings already contain the shape

Someone who booked a Tokyo hotel (3–9 Oct) opens the app, and we ask them for
dates they know, a route their booking already fixed, and nights per base that are
already decided — then possibly propose a Kyoto night they cannot take.

A hotel booking **is** a segment: place, check-in, check-out, nights. Offer
«عندكم حجوزات؟» as a first-class path at entry — forward the confirmation, and the
chain is *constructed* rather than guessed, with booked bases locked.

This is the strongest differentiator in the whole document. Nobody else turns your
confirmations into a trip shape.

---

## 10. Build order

| Phase | What | Why here |
|---|---|---|
| **P0** | Fix the payload blockers: `zPayload.cities`, stable route/base ids, carry base through adoption | Everything else silently loses data until these land |
| **P1** | Base library; move curated days from routes to bases; add `maxNights` | "Add a base" is impossible until content is base-owned |
| **P2** | `trip_segments` + the day projection, with tests | The new source of truth, headless and testable before any UI |
| **P3** | «المسارات» where the tap adopts | Kills the empty-plan drop-off; we already have the data |
| **P4** | Harvest `ai-planner-panel` into «شكل الرحلة» over `trip_segments` | Extraction, not invention (§6) |
| **P5** | Projection respects travel days, arrival afternoons, departure mornings | Stops the grid lying |
| **P6** | «الناقص» errand list → booking anchors | Gives the structure a consequence |
| **P7** | Crew reactions on base cards; shareable shape before the day plan | Moves an existing feature to the layer people argue about |
| **P8** | Trip kind at entry (عمرة / زيارة / شغل machines) | Cheap question, prevents running the wrong product |

P0–P3 alone replace the screen that prompted this document.

**Running alongside all of it:** deepen the corpus. Extension bases for Japan
(Hakone, Kanazawa, Hiroshima, Sapporo), reachable-day content for Istanbul and
Tbilisi. §4's warning stands — the architecture cannot outrun thin data.

---

## 11. Open questions

1. **Three routes per destination, or one plus variants?** Every route is a
   hand-curation cost we pay forever, including the monthly freshness pass.
2. **Where does the base library come from?** `geocode.ts` already has ~110
   hand-written city→country pairs *with Arabic spellings* — the closest thing to
   a seed that exists. Hand-curated beyond that, or Google-seeded and edited?
3. **Can a user save their shape as a route and share it?** The solo growth
   artifact the earlier roundtable wanted, and nearly free once `trip_segments`
   exists: a shared shape is a link that opens as someone else's starting point.
4. **Do we build the booking-import entry (§9) early?** It is the best idea here
   and it is also the only one that depends on parsing we haven't built.
