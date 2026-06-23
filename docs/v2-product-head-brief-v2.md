# Paxawa v2 — Product-Head Redesign Brief **v2 (the bold one)**

**Author:** Product-head agent (Head of Product + UX Research)
**Audience:** ui-ux-designer (builds from this) → implementation loop
**Date:** 2026-06-24
**Status:** BETA live at https://paxawa.com. This is a **do-over** of `v2-product-head-brief.md`. That brief
was correct but **timid** — it renamed labels, de-duped controls, and slimmed tiles (all shipped: tasks
P0-1…P2). It tidied the margins and **walked past the structural failures.** This brief operates one level
up: it interrogates the **method** of each surface — *what is this screen's ONE job, why is it built this
way, and what is the genuinely better method?* — and prescribes the bolder product.

**The bar is not "no obvious bug." The bar is: a first-time Gulf user opens this and says *wow*.**

> How to read each finding: **current method → why the method is wrong (cited principle + the user harm) →
> the BETTER method (the bold, reasoned alternative) → the WOW target → acceptance criteria I will hold the
> designer to.** Taste is never the argument; a named law + the user harm is.

---

## 0. The thesis that drives every call below

The v1 brief's north star was *coherence* ("one label per destination, one nav per breakpoint"). Correct,
but coherence is table stakes — it makes the app *not annoying*. It does not make it *wow*. The v2 thesis is:

> **Every Paxawa surface does exactly ONE job, beautifully, and the whole app speaks ONE physical material
> language.** Where a surface today does two or three jobs, we don't rebalance them — we **evict** the jobs
> that don't belong and send them to the surface that owns them. Where one surface (Discover) has found a
> premium material the users love (the glass), we don't leave it as a one-off — we **promote it to a
> system**.

Two structural moves carry most of the payoff:

1. **Eviction over rebalancing.** An overloaded page is not fixed by making the three competing things
   smaller or collapsing them behind tabs. It is fixed by deciding which ONE thing the page is for and
   *moving the rest out of the building*. (Bookings is the flagship case — see §1.)
2. **A material, not a coat of paint.** "Glass" on Discover is loved because it reads as a single premium
   physical material — frosted controls floating over content. Right now it exists on exactly one breakpoint
   of one surface. Promote it to **the Paxawa control language** (see §4) so the whole app feels carved from
   one piece of glass, not stitched from parts.

Everything below is an application of those two moves.

---

# PART A — THE FOUNDER'S THREE QUESTIONS (answered head-on, with the bold call)

These are the three the founder flagged. I answer each as a decision, not a menu.

## A1 · Bookings is overwhelmed — three competing jobs in one screen

### Current method (confirmed on the live page, 24 Jun)
The Bookings page (`/wallet`, `BookingsBoard`) stacks **three unrelated jobs** down one column:

1. **A status/value header** — `BOOKED VALUE USD 2,019` + a `Booked 6 / To book 6` segmented summary that
   doubles as the tab control. *(Job: tell me my booking state.)*
2. **"Stays you'd love"** — a horizontally-scrolling rail of **12 hotel-discovery cards** (Kukuna, HOTEL
   CLAD, HATSUNE GUESTHOUSE…) with photos, ratings, "Powered by Google," each linking out to book.
   *(Job: discover a new hotel to book — this is **Discover content wearing a Bookings costume**.)*
3. **The actual bookings** — Crew bookings (flights, hotel, bus, tour) + Your private items + a
   forward-email hint. *(Job: carry the tickets I already hold.)*

The v1 brief's P1-2 "fixed" Bookings by merging the duplicate summary and fixing the currency. It treated
the page as a **density** problem. It is not. It is a **purpose** problem: the page is trying to be a
wallet *and* a hotel store *and* a status dashboard at once.

### Why the method is wrong
- **Single-responsibility / Aesthetic & Minimalist (NN/g #8).** "Every extra unit of information in an
  interface competes with the relevant units and diminishes their relative visibility." A page with three
  jobs has no focal point; the eye has nowhere to land first.
  ([NN/g — Aesthetic and Minimalist Design](https://www.nngroup.com/articles/aesthetic-minimalist-design/);
  the "design for one message" discipline:
  [Webflow — minimalist design](https://webflow.com/blog/minimalist-graphic-design)).
- **Jakob's Law / mental model violation.** A "wallet" in every product the user already knows (Apple
  Wallet, airline apps) holds **things you already own**. Putting a *shop* inside the wallet breaks the
  borrowed mental model. ([Laws of UX — Jakob's Law](https://lawsofux.com/jakobs-law/)).
- **It cannibalizes Discover.** Hotel discovery is *exactly* what Discover's taste/ranking brain is for. Two
  surfaces now both "find you great places," which is the "stitched-together clone" smell the founder hates.

**User harm.** A first-time user opens Bookings expecting "my tickets," and is hit by a 12-card hotel
carousel they didn't ask for, above the tickets they came for. They scroll past a *store* to reach their
*wallet*. The page feels like an ad unit bolted onto a utility. Trust — the one thing a money-adjacent page
cannot spend — drops.

### The BETTER method — **evict, don't rebalance**

**Bookings has exactly ONE job: the tickets and confirmations the crew carries.** Everything that is not a
held confirmation leaves the page.

1. **Move hotel discovery OUT to Discover.** "Stays you'd love" does not belong on Bookings. Hotels become a
   **Stay** category in Discover's existing chip set (Eat · Coffee · Stay · Sights · …), ranked by the same
   taste brain, shown in the same card language, on the same map. Discovery has exactly one home.
2. **Bookings becomes a true wallet — and ONLY a wallet.** Lead with the held tickets as **boarding-pass /
   wallet cards** (the design already has `WalletCard` + `barcode.tsx` — lean into it). The page should feel
   like flipping through a stack of passes, not reading a dashboard.
3. **"To book" becomes a quiet checklist, not a second store.** The gap between *what the trip needs*
   (a hotel in each city, a flight, an eSIM) and *what's booked* is a **completion checklist**, not a sales
   surface. Each unbooked row has ONE action: *"Find on Discover →"* (deep-link into the relevant Discover
   category) or *"Mark as booked."* The booking *happens* in Discover; Bookings only tracks the gap.
4. **The value/status header shrinks to a single honest line.** Not a hero. One line: "6 booked ·
   {currency} 2,019 · 6 to go," tappable. It reports *state*, it does not compete with Money's spend total.

### The WOW target
Bookings opens and the user thinks *"this is my travel wallet"* — a beautiful, swipeable stack of real
boarding passes and confirmations, with one calm line of progress at the top and a short "still to sort"
checklist at the bottom. No store. No second total. It feels like the Apple Wallet of group travel. The
moment of delight is the **pass cards themselves** (barcode, route arc, glass), not a carousel of hotels.

### Acceptance criteria
- [ ] **No hotel-discovery rail on Bookings.** `StaysRail` is removed from `BookingsBoard`. Hotel discovery
      lives only in Discover (as a "Stay" category).
- [ ] The page's primary content is the **held bookings rendered as wallet/pass cards** — they are the first
      substantial thing below the header.
- [ ] "To book" is a **checklist of gaps**, each row with at most one primary action that routes to Discover
      or marks-as-booked. It is visibly *not* a product grid.
- [ ] The status header is a **single line** (state + booked value), not a hero card; it never uses the
      phrase "trip total spent" (that is Money's, and only Money's).
- [ ] A first-time user, shown the page for 3 seconds, can answer "what is this page for?" with "my tickets"
      — not "finding hotels."

---

## A2 · Discover category chips — an inline rail you must scroll to see all of

### Current method
In `discover-feed.tsx`, the chips are rendered as a single horizontally-scrolling inline rail:
`[All][Eat][Coffee][Sights][Nightlife][Shopping][Activities]` inside `overflow-x-auto scrollbar-none`. On a
phone, 7 chips do not fit; the last two or three are off-screen and only appear if the user happens to swipe
the rail sideways. The chips that fall off the edge are **invisible affordances**.

### Why the method is wrong
- **Hick's Law, applied wrong.** A flat row of 7 equal options forces the user to scan all of them to choose
  — and worse, the ones off-screen can't even be scanned. Decision time rises with visible-and-hidden
  choices alike. ([Laws of UX — Hick's Law](https://lawsofux.com/hicks-law/);
  [NN/g — Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) — "show only the
  most-used options first; reveal the rest on request").
- **Hidden affordance.** A horizontally-scrolling chip rail with no visual "more →" cue violates Visibility
  of System Status: the user has no signal that categories exist past the right edge. Filters should
  "clarify, not complicate… showing only the most-used filters first prevents tools from becoming
  cluttered" ([LogRocket — Hick's Law](https://blog.logrocket.com/ux-design/using-hicks-law-help-users-make-decisions/)).

**User harm.** The user never discovers "Nightlife" or "Activities" exists, because it lives past a swipe
they never make. The feed feels narrower than it is. The off-screen categories are dead weight.

### The BETTER method — **top few + one "More" affordance**

Surface the **2–3 highest-intent categories inline** (`All · Eat · Sights`), then **one glass "Filters"
pill** that opens a compact sheet/popover holding the full set plus future refinements (price, open-now,
rating, distance). This is the textbook Hick's-Law move: collapse a long visible menu to a short one + a
disclosure.

- The inline chips are the **80% intents** (data-driven later; `Eat`/`Sights` are the safe default for
  travel).
- The **Filters pill carries a count badge** when filters are active (`Filters · 2`), so state is visible.
- This *also* makes the chip row future-proof: price/open-now/rating have somewhere to live without growing
  the rail to 12 chips.

### The WOW target
The control strip reads as **one calm glass bar**: a short row of the categories that matter + a single
"Filters" pill with the glass treatment. It never overflows, never hides options off a swipe, and it scales
to richer filtering without ever getting busier. It feels considered, not crammed.

### Acceptance criteria
- [ ] At the narrowest supported width (~360px) **every category is reachable without horizontal scrolling
      of a hidden rail** — the overflow lives behind one "Filters/More" affordance, not off the screen edge.
- [ ] The inline strip shows **≤ 4 controls** (2–3 categories + the Filters pill); the rest are in the
      disclosure.
- [ ] The Filters affordance shows an **active-count badge** when any non-default filter is on.
- [ ] Opening Filters does not navigate away or cover the feed entirely on desktop (popover/inline panel,
      not full takeover).

---

## A3 · The glass treatment — loved, but a one-off. Make it a system.

### Current method
The glassy/frosted control treatment (`bg-white/10 … ring-white/15 backdrop-blur-md`, the `GlassBtn` helper
and the glass chips in `discover-feed.tsx`) exists in **exactly one place**: the **mobile** Discover stream.
The **desktop** Discover, and **every other surface** (Bookings, Money, Plan, Pack, Overview), use flat
`bg-muted` / `bg-card` controls. So the single most-loved, most-premium texture in the app is also the most
isolated. The app's "feel" is not consistent — one surface is glass, the rest are matte.

### Why this is a missed opportunity (not just inconsistency)
- **Consistency & Standards (NN/g #4) + Jakob's Law.** A cohesive design system is "a shared language…
  visual consistency across pages." When one surface uses a premium material and the rest don't, the product
  reads as assembled from parts, not designed as one.
  ([NN/g — Design Systems 101](https://www.nngroup.com/articles/design-systems-101/)).
- **Aesthetic-Usability Effect.** Users *perceive aesthetically pleasing design as more usable* and forgive
  minor issues when it looks premium. A coherent glass material across the app would buy goodwill on every
  screen, not just one. ([Laws of UX — Aesthetic-Usability Effect](https://lawsofux.com/aesthetic-usability-effect/)).
- **Glassmorphism specifically signals premium.** "Glassmorphism signals premium quality and 'newness' in a
  way few visual styles can" — *but* translucency "can limit contrast, causing legibility issues."
  ([Ramotion — Glassmorphism](https://www.ramotion.com/blog/what-is-glassmorphism/);
  [New Target — Glassmorphism with accessibility in mind](https://www.newtarget.com/web-insights-blog/glassmorphism/)).

### The BOLD call: **yes — promote it, but with discipline.** Glass is for *floating controls over content*,
never for *content itself or for text-on-background.*

This is the make-or-break nuance. Glass is gorgeous on a control that floats over a photo or a map. It is
**illegible and cheap** if used as the background of body text or a data table. So the call is not "glass
everywhere"; it's **"glass is the material of the control layer."** See the full spec in **§4 — The Paxawa
Control Language**. The short version:

- **DO** apply glass to: floating filter/category chips, the search & map-toggle buttons, the FAB / add
  affordances, sheet & panel headers that overlay content, map overlays, the bottom-nav bar, and toast/badge
  chrome.
- **DO NOT** apply glass to: long-form reading surfaces, the expenses/balances tables, settings forms, or
  any text-heavy card body where contrast must be ≥ 4.5:1. Those stay on solid `bg-card`.

### The WOW target
Every floating control in the app — on Plan's map, on Discover, on the bottom nav, on overlay sheets — is
the **same frosted glass**. The user feels a single, premium physical material throughout: controls that
float like frosted glass over real content. The app stops feeling like "Discover is the nice one" and starts
feeling uniformly high-end.

### Acceptance criteria (full spec in §4)
- [ ] A shared **`<GlassSurface>` / glass token** exists; the one-off `GlassBtn` in `discover-feed.tsx` is
      replaced by it, and so are the map-overlay controls on Plan.
- [ ] Glass is applied to the **control/overlay layer** on Discover (both breakpoints), Plan (map overlays +
      FAB), and the mobile bottom nav — consistently.
- [ ] **No body text or data table sits on a glass background.** Every glass control with text/icon passes
      ≥ 4.5:1 contrast over its *worst-case* backdrop (verified, not assumed) — a solid scrim under the blur
      where needed.
- [ ] `prefers-reduced-transparency` / `prefers-reduced-motion` fall back to a solid token automatically.

---

# PART B — METHOD-LEVEL FINDINGS BY SURFACE (prioritized by impact)

## B1 · [P0] Bookings — see **§A1**. (Highest-impact structural rethink in the app.)

The flagship. Restated here so it appears in the build order: **evict hotel discovery, become a true
wallet.** Acceptance criteria in §A1.

---

## B2 · [P0] Discover chips + the "what is Discover's ONE job" question

Chips fix is §A2. But step back to the **method** of the whole surface, because it's close to wow and one
decision away from it.

**Discover's ONE job:** *make the user fall in love with a real place and add it in one tap.* The mobile
stream nails this — full-bleed photo, glass controls, taste-ranked. The **desktop** Discover, by contrast,
falls back to a **2–3 column matte card grid beside a map** — competent, but it abandons the cinematic
photo-first feeling that makes the mobile version *wow*. Two different souls for one surface.

- **Why it's weak.** The desktop grid is the "stretched generic" pattern; the mobile stream is the
  opinionated one. The premium feeling does not survive the jump to desktop, so the founder's "wow" only
  happens on a phone. ([NN/g — Aesthetic-Usability](https://lawsofux.com/aesthetic-usability-effect/)).
- **Better method.** Desktop keeps the persistent map (good — it's the desktop affordance) but the **left
  panel becomes a larger, photo-first single/dual-column feed with the glass control strip**, not a dense
  3-up matte grid. One soul, two native layouts — the cinematic photo is the experience on both.
- **Acceptance:** desktop Discover leads with photo-dominant cards + the glass control strip (per §A2/§4);
  the matte 3-up grid is retired in favor of a 1–2 column photo-first feed beside the map.

---

## B3 · [P1] Plan — the map is the canvas, but the controls are matte and the chrome competes

**Current method.** Plan is the map-first itinerary (Mapbox full-bleed). Strong bones. But its overlay
controls (day switcher, add-place, AI entry, FAB) are **flat/matte**, not glass — so the one surface that
*most* resembles Discover (content under floating controls over a map) doesn't share Discover's material.
It's the clearest place the glass system is missing.

**Why it matters.** Plan and Discover are the two map surfaces; a user moving between them should feel one
continuous material. Today they don't. ([NN/g — Design Systems 101](https://www.nngroup.com/articles/design-systems-101/)).

**Better method.** Apply the §4 glass control language to **every floating control over the Plan map** — day
chips, add/AI affordances, the FAB, the directions/route toggle. The day list panel (text-heavy) stays
solid. Result: Plan and Discover read as the same product.

**Acceptance:** Plan's map-overlay controls use the shared glass token; the text list panel stays solid;
moving Discover→Plan shows no material discontinuity in the control layer.

---

## B4 · [P1] Overview — the method is "a wall of routers." It should be "one sentence + one button."

**Current method.** Even after v1's cleanup (one Up-Next router, compact stat strip), the Overview's *method*
is still "show the user several entry points and let them choose." Hero + status pill + onboarding strip +
stat strip + Up-Next + plan CTA + crew. It's *calmer* than before, but its job is still diffuse.

**Why it's weak.** The Overview's ONE job is to answer **"what should I do next?"** in one glance. A page
that offers a hero, a strip, a router, and a CTA is still asking the user to *choose where to look*, which is
the satisficing trap. ([Hick's Law](https://lawsofux.com/hicks-law/); on conserving complexity:
[Laws of UX — Tesler's Law](https://lawsofux.com/teslers-law/) — the system should carry the "what next"
decision, not the user.)

**Better method — make Overview a *briefing*, not a directory.** Lead with **one** dynamic, personalized
"here's where the trip stands and the single best next move" block (the Up-Next, promoted to hero), backed
by the quiet stat strip and crew. Demote everything that merely *links to a tab* — the nav already does that.
The Overview earns its keep only by being *smarter than a menu*: it tells you the one thing to do, today.

**Acceptance:**
- [ ] The Overview's visual hierarchy has exactly **one** focal element: the personalized next-move block.
- [ ] No Overview element duplicates a nav destination as its sole purpose (already true for Discover; audit
      the rest).
- [ ] The stat strip and crew are clearly secondary (smaller, below the fold-line is acceptable).

---

## B5 · [P1] Pack — one header/one tab system shipped, but re-question the *default* and the empty state

v1's P1-1 merged Pack into one segmented control (Packing | Docs) — good, that structural fix holds. The
remaining **method** question: Pack's wow is **"the list is already filled in for you"** (smart packing
defaults exist). Make that the hero moment. Ensure the **first run shows a pre-populated, confidence-building
list** (not an empty state), because a pre-filled packing list is the delight — an empty one is a chore.

**Acceptance:** first-run Pack shows smart-default items already present (designed, not blank); the segmented
control remains the single tab system; one add affordance per mode.

---

## B6 · [P2] Money — the model surface. Protect it; extend the material carefully.

Money remains the exemplar (one hero total → one primary action → activity/breakdown/balances). **Do not
glass the tables** (contrast). The only method note: Money owns the *sole* "Trip Total Spent" number; ensure
no other surface (esp. Bookings, per §A1) ever shows a competing trip total. Money is the trust anchor — keep
it matte, solid, legible.

---

# PART C — §4 · THE PAXAWA CONTROL LANGUAGE (the glass system)

This is the deliverable the designer builds the shared component from. It turns the loved one-off into a
governed material.

### 4.1 The rule of the material
> **Glass is the material of the *control & overlay layer*. Solid is the material of the *content layer*.**

- **Control/overlay layer (GLASS):** anything that floats *over* content — category/filter chips, search &
  map-toggle buttons, the FAB and add/AI affordances, map overlays, sheet/panel *headers* that overlay
  content, the mobile bottom nav, toasts, and status badges.
- **Content layer (SOLID):** anything you *read or fill* — card bodies with text, the expenses/balances
  tables, settings forms, long-form copy, the Plan day list. These stay `bg-card`/`bg-background`.

Rationale: glass over a photo/map is premium and legible (the backdrop is busy, the control needs to feel
detached). Glass under body text is a contrast failure and reads cheap.
([New Target](https://www.newtarget.com/web-insights-blog/glassmorphism/);
[Axess Lab — glassmorphism & accessibility](https://axesslab.com/glassmorphism-meets-accessibility-can-frosted-glass-be-inclusive/)).

### 4.2 The token
Define ONE glass surface (token + `<GlassSurface>` component), with two tones:
- **Glass-on-dark** (over photos/map): `bg-white/10 + ring-white/15 + backdrop-blur-md`, white content.
  (This is exactly today's `GlassBtn` — promote it verbatim.)
- **Glass-on-light** (over light content/sheets): `bg-background/70 + ring-border/50 + backdrop-blur-md`,
  foreground content.
- **Active/selected state** is the *opaque inversion* (today's `bg-white text-neutral-900` / `bg-foreground
  text-background`) — keep this; it's the legibility-safe "pressed" state.

### 4.3 Accessibility guardrails (non-negotiable — this is where glass usually fails)
- Every glass control's text/icon must clear **≥ 4.5:1** over its **worst-case** backdrop. Where a photo can
  be bright, add a subtle solid scrim *under* the blur (e.g. the existing `bg-black/55` pill pattern) so
  contrast never depends on luck.
- Honor **`prefers-reduced-transparency`** and **`prefers-reduced-motion`**: fall back to the solid token.
- Never put **essential body text or numbers** on a glass background — only short labels/icons on controls.

### 4.4 Where it goes (the rollout map)
| Surface | Glass control layer | Stays solid |
|---|---|---|
| Discover (mobile) | already glass — refactor onto the shared token | card bodies |
| Discover (desktop) | **add** glass to the control strip (§B2) | card bodies, map panel frame |
| Plan | **add** glass to all map-overlay controls + FAB (§B3) | day list panel |
| Bookings | the status line + any overlay chrome may use glass-on-light | wallet card bodies, checklist rows |
| Mobile bottom nav | **add** glass-on-light bar | — |
| Sheets / side panels | glass *header* over content | sheet body/forms |
| Money / Pack / Settings | — | everything (legibility first) |

### 4.5 Acceptance for the system
- [ ] One shared glass token/component; `GlassBtn` and Plan's map controls both consume it.
- [ ] Rollout matches the table; **no content-layer text on glass**.
- [ ] Contrast + reduced-transparency/motion guardrails verified on the three brightest real photos in the
      Discover seed.

---

# PRIORITY SUMMARY (build order — by impact)

| # | Pri | Surface | The METHOD change (not a polish) |
|---|---|---|---|
| A1 | **P0** | **Bookings** | **Evict hotel discovery → Discover. Bookings becomes a true wallet of passes + a quiet "to book" checklist.** The flagship rethink. |
| A2 | **P0** | **Discover chips** | Top 2–3 categories inline + ONE glass "Filters" pill (Hick's). No more hidden off-screen rail. |
| A3/§4 | **P0** | **Whole app** | Promote glass to **the Paxawa control language** — one material for the control layer, solid for content. |
| B2 | P1 | Discover (desktop) | Photo-first feed + glass strip; retire the matte 3-up grid. One soul on both breakpoints. |
| B3 | P1 | Plan | Glass-ify every map-overlay control so Plan and Discover share one material. |
| B4 | P1 | Overview | Make it a *briefing* (one personalized next-move hero), not a directory of routers. |
| B5 | P1 | Pack | First-run shows the pre-filled smart list (the delight), not an empty state. |
| B6 | P2 | Money | Protect the exemplar; keep it solid/legible; it owns the sole trip-spend total. |

## Surfaces needing the most fundamental rethink
1. **Bookings** — the only surface doing 3 jobs; needs *eviction*, not rebalancing. Biggest single win.
2. **The control layer, app-wide** — glass is a system waiting to happen; promoting it is the cheapest path
   to uniform "wow."
3. **Discover (desktop)** — the wow exists on mobile and dies on desktop; unify the soul.
4. **Overview** — still a directory; should be a smart briefing.

---

## Citations
- NN/g — Aesthetic & Minimalist Design (Heuristic #8): https://www.nngroup.com/articles/aesthetic-minimalist-design/
- NN/g — Consistency & Standards (Heuristic #4): https://www.nngroup.com/articles/consistency-and-standards/
- NN/g — Progressive Disclosure: https://www.nngroup.com/articles/progressive-disclosure/
- NN/g — Design Systems 101: https://www.nngroup.com/articles/design-systems-101/
- Laws of UX — Hick's Law: https://lawsofux.com/hicks-law/
- Laws of UX — Jakob's Law: https://lawsofux.com/jakobs-law/
- Laws of UX — Tesler's Law (Conservation of Complexity): https://lawsofux.com/teslers-law/
- Laws of UX — Aesthetic-Usability Effect: https://lawsofux.com/aesthetic-usability-effect/
- LogRocket — Using Hick's Law: https://blog.logrocket.com/ux-design/using-hicks-law-help-users-make-decisions/
- Ramotion — What is Glassmorphism: https://www.ramotion.com/blog/what-is-glassmorphism/
- New Target — Glassmorphism with accessibility in mind: https://www.newtarget.com/web-insights-blog/glassmorphism/
- Axess Lab — Glassmorphism meets accessibility: https://axesslab.com/glassmorphism-meets-accessibility-can-frosted-glass-be-inclusive/
- Webflow — Minimalist design (design for one message): https://webflow.com/blog/minimalist-graphic-design
