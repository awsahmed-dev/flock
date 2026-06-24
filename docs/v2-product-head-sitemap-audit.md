# Paxawa — Full-App Audit + Sitemap Restructure

**Author:** Product-head agent (Head of Product + UX Research)
**Audience:** ui-ux-designer (builds from this) → implementation + sign-off loop
**Date:** 2026-06-24
**Status:** BETA live at https://paxawa.com. Audited live at 1500px (desktop) + source-read for
mobile (harness can't render <1024px; Plan/Mapbox freezes screenshots). Test trip: Japan,
`cc3d284a-c5f9-46ff-9fbf-d197de752fd3`.

This brief sits **one level above** the two prior briefs (`v2-product-head-brief.md`,
`v2-product-head-brief-v2.md`). Those fixed *surfaces* (Bookings→wallet, glass control language,
Discover chips, Money exemplar). All confirmed shipped and good on the live app — **not re-litigated
here.** This brief audits the three things a per-surface pass cannot see:

1. **End-to-end flows** — the seams *between* tools, where the object falls through a gap.
2. **UI-look consistency** — where the app still reads "good but not wow" as one system.
3. **The headline: SITEMAP / IA RESTRUCTURE** — collapse the flat 9-item per-trip nav into a
   daily-use core + a single **Tools** hub, for both desktop sidebar and mobile bottom-nav.

> How to read each finding: **problem · cited principle · user harm · the bold better method ·
> acceptance criteria.** Taste is never the argument; a named law + the user harm is.

---

## 0. The thesis that drives every call

The app today is *good*. Every surface, taken alone, is competent — Money is genuinely excellent,
Bookings-as-wallet is a real wow, Discover is cinematic. **The remaining problem is not any one
screen. It is the JOINTS.** A first-time Gulf user doesn't experience screens; they experience a
*journey* — Discover a place → decide on it with the crew → see it land in the Plan → pay for it →
remember it. Today that journey is built from excellent parts that **don't quite click together**,
and the nav that holds them is a **flat wall of nine equal tabs** that makes the whole product feel
like a *suite of tools* rather than *one considered system*.

Two structural moves carry the payoff:

1. **Make the object flow.** A place must travel Discover → Decide → Plan → Money → Memory as **one
   continuous object the user can follow with their eyes**, with no dead end and no re-entry of data.
   Where the chain breaks (it breaks in three places — see §1), the magic leaks out.
2. **Tier the navigation.** Stop presenting nine equal doors. Present the **4 daily-use destinations
   as primary**, and tuck the rest behind **one "Tools" door** that opens into a clean hub. This is
   the founder's instinct and it is textbook-correct (Miller, Material, NN/g Priority+).

---

# PART 1 — FULL USER-FLOW AUDIT (end to end)

I walked the five real journeys on the live trip. Each finding is a **seam**, not a screen.

## F1 · [P0] The Discover → Decide → Plan chain has THREE competing homes for one verb

### The problem
"My crew should agree on this place" — a single user intent — is served by **three separate
surfaces that don't know about each other**:

- **Discover** (top-level tab) — where you fall in love with a place.
- **Decisions** (top-level tab) — a standalone vote board. Live empty state literally says *"Suggest
  a place from Discover and your crew can vote on it right here"* → button *"Open Discover."*
- **Chat** (top-level tab + side panel) — where the v2 spec said decision cards were supposed to
  live inline (`chat_message_type = 'decision_card'` exists in the schema; `decisions` table carries
  `chat_message_id`).
- …and a **fourth** pointer: the More sheet *also* lists "Decisions" as a row.

So the wiring for "decision card posts into chat" exists in the data model, but the **UI shipped a
separate Decisions page instead of the inline-chat lens the spec called for** (`v2-app-map.md` §2.2:
"Chat — now the decision hub… a Decisions lens replaces the Votes tab"). The user now has to learn
*two* places where group agreement happens (a Decisions tab AND a Chat tab), and a third entry that
re-points them back to Discover.

### Cited principle
- **Jakob's Law + Consistency (NN/g #4).** One verb should have one home. When "decide together"
  lives in three places, the user's mental model never stabilizes.
  ([NN/g — Consistency & Standards](https://www.nngroup.com/articles/consistency-and-standards/))
- **Tesler's Law (Conservation of Complexity).** The *system* failed to collapse the
  decision/chat/vote complexity, so it pushed that complexity onto the user, who must now figure out
  which surface is canonical. ([Laws of UX — Tesler's Law](https://lawsofux.com/teslers-law/))
- **Gulf of Execution (Norman).** The user knows *what* they want (get crew buy-in on Meiji Jingu)
  but the app offers three plausible paths and no signal which is right.

### User harm
A first-time crew opens "Decisions," finds it empty, gets bounced to Discover, taps a place,
suggests it — and the resulting card may appear in Chat, on the Decisions board, or both, depending
on path. The crew fragments: some vote in Chat, some on the board. **Group consensus — the single
most important job of a group-travel app — feels broken.** This is the worst seam in the product.

### The bold better method
**Collapse to ONE decision surface, and make it the thing the v2 spec already designed: decisions
live inside the crew conversation.**

- **Retire the standalone Decisions page as a top-level destination.** It becomes a **lens (filter)
  over Chat**: a chip at the top of Chat — `All · Decisions · Needs your vote (2)`. Decision cards
  post inline in the conversation (rich card: photo/name/rating/price + inline 👍/👎 + tally +
  countdown), exactly as the schema already supports.
- **Discover's "Suggest to crew" is the single on-ramp.** Tapping it on a place card creates the
  decision card *and drops it into Chat*, then toasts "Sent to the crew →" linking to that message.
  One verb, one path, one home.
- The **nav badge for "needs your vote"** rides on the Chat entry (and on Tools, see §3), driving
  participation — the spec's intended retention loop.

### Acceptance criteria
- [ ] There is exactly **one** surface where a crew votes on a place: a Decisions lens inside Chat.
- [ ] Discover's "Suggest to crew" posts a decision card into Chat and confirms with a deep-link.
- [ ] No standalone `/decisions` top-level nav entry; the route may survive as a deep-link target for
      the lens but is not a primary tab.
- [ ] The "needs your vote" count appears on exactly one primary nav affordance, not three.

---

## F2 · [P0] Discover and Plan are TWO map surfaces that should be ONE canvas

### The problem
The live sidebar shows **Plan** and **Discover** as two separate top-level tabs, each rendering its
own Mapbox map. But the v2 architecture (`v2-app-map.md` §2.2, `v2-discovery-logic.md` §1) is
explicit: **Discover is a *mode* on the Plan canvas (`Days | Discover` segmented control over one
shared map), not a route.** The code confirms the divergence: `PlanModeSwitch` exists in
`src/components/itinerary/` but only ever toggled map/book modes (Book was later removed), and the
`Days | Discover` segmented control was never wired — so Discover stayed a parallel route. The result
is **two souls for one job** (browse places ↔ arrange places) and **two of the nine nav slots spent
on the same map.**

### Cited principle
- **Spatial continuity / Doherty + Gestalt common region.** When "find a place" and "place it on my
  days" are the same map, the user keeps context — they *see* the place they just loved appear on the
  itinerary. Splitting them into two routes forces a context reload and breaks the spatial model.
  ([NN/g — Maintain context / minimize memory load, Heuristic #6](https://www.nngroup.com/articles/ten-usability-heuristics/))
- **Aesthetic-Usability + one-material consistency.** Two map screens that look subtly different read
  as a clone-of-two-products. ([Laws of UX — Aesthetic-Usability](https://lawsofux.com/aesthetic-usability-effect/))

### User harm
The user browses Discover, loves Meiji Jingu, adds it — then has to switch tabs to Plan to see where
it landed and which day it's on. The "I found it → here it is on my trip" payoff, which should be
*instant and on one screen*, is split across a tab switch. The wow evaporates in the gap.

### The bold better method
**Merge Discover into Plan as the spec always intended.** Plan becomes the single map canvas with a
glass `Days | Discover` segmented control floating top-center over the map:

- **Days mode** — the itinerary (today's Plan).
- **Discover mode** — the taste-ranked feed (today's Discover), over the *same* map, with hover↔pin
  sync.
- Adding a place in Discover mode animates it onto the day rail visible in Days mode — same canvas,
  no reload. This is the "fall in love → watch it land" moment, finally on one screen.

This also frees a top-level nav slot (critical for §3) and gives Discover a more discoverable home
than a tab a first-timer may never open: it's right inside Plan, the surface they live in.

### Acceptance criteria
- [ ] `Plan` is one route with a `Days | Discover` segmented (glass) control over one Mapbox map.
- [ ] Adding a place in Discover mode reflects on the Days rail without a route change.
- [ ] No standalone `Discover` primary nav tab (the `/discover` route folds in or becomes a deep
      link to Plan's Discover mode, per `v2-app-map.md` S3.3).
- [ ] Dead `PlanModeSwitch` map/book code is removed or repurposed for `Days | Discover`.

---

## F3 · [P1] First-run: signup → create trip → Overview lands on an empty briefing with no "first win"

### The problem
First-run today: signup → `/trips/new` (+ AI questionnaire) → land on Overview. The Overview is now
a *briefing* (good — the "Up Next" hero shipped). But on a brand-new trip, that hero reads **"12 days
still empty — Drop in activities or let AI fill the gaps,"** above a "How Paxawa works" 3-step strip,
above an "AI plan" button, above a stat strip of zeros. The first-run user is handed a **to-do list,
not a win.** The single highest-leverage moment in the whole funnel — the first 30 seconds of an
empty trip — asks the user to go *do work* rather than showing them something magic for free.

### Cited principle
- **Peak–End + first-time-user "aha" (NN/g onboarding).** The first session should deliver a *win the
  user didn't have to earn*, not a chore list. ([NN/g — Onboarding / first impressions](https://www.nngroup.com/articles/onboarding-tutorials/))
- **Zeigarnik / empty-state psychology.** An empty page of zeros lowers confidence; a *pre-filled*
  start raises it (the prior brief already prescribed this for Pack — apply it to the whole first run).

### User harm
The crew owner finishes the AI questionnaire — having just told Paxawa exactly where they're going
and their taste — and lands on **empty days and a stat strip of zeros.** The questionnaire's promise
("we'll plan it for you") is silently dropped. The product feels like it forgot what it just asked.

### The bold better method
**The AI questionnaire's output must already be on the Plan when the user lands.** Wire the create
flow so that by the time the user sees Overview, the AI has *already seeded* 1–2 days of real,
addable place cards (it has the destination + taste). The "Up Next" hero then reads the truth:
**"Your first 2 days are drafted — review them →"** routing to Plan/Days. The first session's wow is
*"it already started planning for me,"* not *"here's an empty calendar, get to work."*

### Acceptance criteria
- [ ] After the AI questionnaire, the user lands with ≥1 day pre-seeded with real place cards (clearly
      marked "AI draft — yours to keep or cut").
- [ ] First-run "Up Next" reflects the seeded state (review/confirm), never "12 days still empty"
      when the questionnaire was completed.
- [ ] A first-time user, 5 seconds after landing, can point to *something Paxawa did for them.*

---

## F4 · [P1] Money loop is excellent but the place→expense link is a dead end

### The problem
Money is the exemplar surface. But the journey **place → expense** has a gap: you can't pay *for a
place*. Expenses link only via `itinerary_item_id`; the specced `expenses.place_id` (logic §5/§7) was
never added. So when the user logs "Lunch — JPY 800," it never associates with the ramen shop they
discovered, planned, and are standing in. The taste engine's strongest signal ("✓ they actually paid
here") is lost, and the user can't see "what did this place cost us?"

### Cited principle
- **Object continuity / closing the loop.** The place object should carry its cost. Breaking the
  link orphans both the spend (no context) and the place (no outcome).
- **Recognition over recall (NN/g #6).** Forcing the user to mentally re-associate an expense with a
  place they already have in the app is needless memory load.

### User harm
Minor in isolation, structural in aggregate: the "memory" end of the journey (this trip cost us X,
and *here's the place* each cost bought) can never be assembled. The flywheel that makes Paxawa
smarter trip-over-trip (durable taste from real spend) never spins.

### The bold better method
- Add the **place link to the expense flow**: when logging an expense, an optional "for which place?"
  picker draws from the trip's planned/discovered places. One tap binds them.
- On a place's detail panel, show **"✓ Paid here · {amount}"** when a linked expense exists — closing
  the Discover→Plan→Money loop *visibly* on the object itself.

### Acceptance criteria
- [ ] An expense can be linked to a place (via `place_id` or the item's `google_place_id`).
- [ ] A place that has a linked expense shows a "paid here" affordance on its detail.
- [ ] Linking is one optional tap in the log-expense flow, never a required field.

---

## F5 · [P2] Travel-day mode is scattered: Pack, Bookings, offline have no shared "day-of" surface

### The problem
On the trip itself, the user needs three things fast and often: **today's plan, my passes/tickets,
and my packing checklist** — frequently offline (Gulf travelers roaming abroad). Today these are
three separate tabs (Plan, Bookings, Pack) with no "I'm traveling now" mode, and the offline cache
(`v2-discovery-logic.md` §9) is unbuilt. The product is optimized for the *planning* weeks and goes
quiet exactly when the user is *on the trip* — the highest-emotion moment.

### Cited principle
- **Context-of-use / mobile-first task priority.** The day-of context (low signal, on foot, glancing)
  has different needs than the planning context (browsing, deciding). One nav for both under-serves
  both. ([NN/g — Mobile context](https://www.nngroup.com/articles/mobile-ux/))

### User harm
Standing at a station in Kyoto with no signal, the user can't pull up today's plan or their rail
pass. The app that planned the trip is useless during it.

### The bold better method (directional — P2/P6, not this sprint)
- When `now ∈ [start,end]`, Overview's "Up Next" hero becomes a **Today card**: today's stops + the
  next booking + "X to pack" — a single day-of glance.
- Service-worker cache the committed itinerary + passes so Plan/Bookings/Pack render offline.

### Acceptance criteria
- [ ] During the trip dates, Overview leads with a "Today" glance (stops + next pass).
- [ ] Committed itinerary + booking passes are readable offline.

---

# PART 2 — UI-PAGE LOOK AUDIT (8-point rubric, desktop @1500px)

Rubric: (1) single clear job (2) hierarchy/one focal point (3) surface-language consistency
(4) chrome-to-content ratio (5) empty-state charm (6) control-language (glass) consistency
(7) spacing/rhythm (8) "wow vs competent." Only findings that are **not already shipped** appear.

## U1 · [P0] The per-trip sidebar is a flat undifferentiated list of 9 — the #1 "tool-suite" tell
**Job / hierarchy / wow:** The sidebar renders Overview · Plan · Discover · Decisions · Money ·
Bookings · Pack, then a divider, then Chat · Trip settings · Add to calendar — **all the same
weight, same type size, same matte row.** There is no visual tiering between "the thing I use every
day" (Money, Plan) and "the thing I touch once" (Add to calendar). It is the clearest reason the app
still reads as *a suite of nine tools* rather than *one product with a spine.*
- **Principle:** Miller's Law (7±2) — nine equal items exceed comfortable parallel scan; and
  visual-hierarchy theory — equal weight = no hierarchy = the eye has no entry point.
  ([Laws of UX — Miller's Law](https://lawsofux.com/millers-law/))
- **Harm:** the user scans all nine every time, and the rail feels like a settings menu, not a
  travel companion.
- **Fix:** the §3 restructure — 4 primary + Chat + a single **Tools** entry, with primary rows
  visually heavier than the Tools group. (Full spec in Part 3.)
- **Acceptance:** the trip sidebar shows ≤6 rows above the account menu, with a clear weight
  difference between the daily core and the Tools entry.

## U2 · [P1] Pack has a double-nested tab stack (Packing|Docs → then All|Photos|Files)
**Single job / chrome ratio:** Pack opens with a `Packing · 1/2 | Docs · 1` segmented control, an
"Add document" button, and **then a second tab row** `All · 1 | Photos · 1 | Files · 0` below it. Two
levels of tabs on one page, with a near-empty body (one photo). The page spends three rows of chrome
to show one item.
- **Principle:** NN/g — avoid nested tabs; "tabs within tabs" force the user to track two selection
  states. Chrome should be proportional to content (founder's calibration bar).
  ([NN/g — Tabs, used right](https://www.nngroup.com/articles/tabs-used-right/))
- **Harm:** cognitive overhead disproportionate to the payload; reads unfinished.
- **Fix:** collapse to **one** tab system. Inside Docs, replace the All/Photos/Files sub-tabs with a
  quiet filter chip row (only shown when docs exist), or auto-group with section headers — not a
  second tab bar. Empty Files (0) should not get a tab at all until it has content.
- **Acceptance:** Pack has exactly one row of primary tabs; any sub-filtering is a lightweight chip
  row that disappears when empty.

## U3 · [P1] Overview "How Paxawa works" strip + "AI plan" button + zero-stats compete with the hero
**One focal point:** The Overview hero ("Up Next") is correct, but it's sandwiched between a 3-step
"How Paxawa works" onboarding card *above* it and an "AI plan" button + stat strip *below* — so the
page still has 3–4 focal candidates on first load. The briefing isn't yet *the* briefing.
- **Principle:** Hick's Law + single-focal-point. The eye should land on one block.
  ([Laws of UX — Hick's Law](https://lawsofux.com/hicks-law/))
- **Harm:** the "what do I do next" answer is diluted by surrounding chrome.
- **Fix:** the onboarding strip should appear **only** when truly first-run and collapse permanently
  after; the "AI plan" button folds into the hero (it's the same AI the hero routes to); stats stay
  but visibly demoted. One block, one accent, one glance.
- **Acceptance:** on a non-first-run Overview, exactly one element (the next-move hero) is the
  dominant focal point.

## U4 · [P2] Crew right-rail on Overview is a heavy card for a light payload (2 members)
**Chrome ratio:** The right rail renders a full bordered card with header, manage link, member
chips, and a mono invite-URL row — substantial chrome for "2 people + an invite link." On a 2-person
trip it's the visual peer of the hero.
- **Principle:** chrome proportional to information value (founder's bar).
- **Fix:** collapse to a single compact "Crew · 2 + Invite" row until crew > ~4; expand to the full
  card only when there's a real roster to show.
- **Acceptance:** the crew rail's height scales with crew size; a 2-person trip shows a one-line
  crew+invite affordance, not a full card.

## U5 · [P2] Surface-language drift: Overview/Crew use `rounded-2xl ring-1` cards; Money uses a
gradient hero; Discover/Bookings use photo-bleed. These are individually good but there's **no single
"Paxawa card"** — radii (2xl vs 3xl), borders (ring vs none), and elevation differ surface to
surface. The glass *control* language shipped; the **content-card** language hasn't been unified.
- **Principle:** Design Systems 101 — a shared component language is "visual consistency across
  pages." ([NN/g — Design Systems 101](https://www.nngroup.com/articles/design-systems-101/))
- **Fix:** define one canonical content-card token (radius, border, padding, shadow) and apply it to
  every non-photo, non-glass surface (Overview cards, Crew, Pack, Settings). Photo-bleed and glass
  remain the two intentional exceptions.
- **Acceptance:** Overview, Crew, Pack, Settings cards share one radius/border/shadow token.

---

# PART 3 — SITEMAP / IA RESTRUCTURE (the headline)

## 3.1 The diagnosis, stated plainly

The per-trip nav is a **flat list of 9 destinations** (Overview, Plan, Discover, Decisions, Money,
Bookings, Pack + Chat + Trip settings + Add to calendar), and the **three nav surfaces disagree** on
what's primary:

| Destination | Desktop sidebar | Mobile bottom nav | More/Tools sheet |
|---|---|---|---|
| Overview | primary | primary (Home) | — |
| Plan | primary | primary | — |
| Discover | **primary** | **primary** | — |
| Money | primary | primary | — |
| Bookings | primary | **absent** | **in More** |
| Pack | primary | primary | — |
| Decisions | **primary** | **absent** | **in More** |
| Chat | secondary | absent (header ⋯) | **in More** |
| Crew | side panel | header | **in More** |
| Settings/Calendar/Share | secondary | — | **in More** |

The smell the founder named is real and provable:
- **Miller's Law (7±2):** the desktop sidebar's 9 flat rows exceed comfortable parallel scan.
  ([Laws of UX — Miller's Law](https://lawsofux.com/millers-law/))
- **Material / Priority+ pattern:** bottom navigation must cap at **3–5** primary items; the rest go
  behind a "More." Paxawa's mobile bottom nav already carries 5 but picked the **wrong 5** (it
  includes Discover but *drops Bookings*, which is primary on desktop — so a destination's importance
  is inconsistent across breakpoints).
  ([Material — Bottom navigation](https://m2.material.io/components/bottom-navigation);
  [Smashing — Golden rules of mobile navigation](https://www.smashingmagazine.com/2016/11/the-golden-rules-of-mobile-navigation-design/))
- **NN/g — frequency/importance IA:** "Place the most frequently used features in the most accessible
  positions." Paxawa never made that cut; it just listed everything flat.

**The founder's call is correct.** Repurpose the under-used "Pack" slot into a **"Tools" hub** that
holds the secondary destinations, each opening into its own clean focused page. The discipline below
decides *exactly* which surfaces are daily-core vs Tools — for both breakpoints — and reconciles the
mobile "More" sheet into the same "Tools" concept so there is **one overflow model, not two.**

## 3.2 The cut: which 4–5 are primary, and why

The cut is made on **frequency × importance over the trip lifecycle**, not on feature pride.

**Daily-use core (primary nav) — the 4 a user touches most days of planning AND travel:**

| Primary | Why it's core (frequency · importance) |
|---|---|
| **Overview** | The home/briefing — every session starts here; answers "what now?" |
| **Plan** (now holds `Days \| Discover`) | The heart of the product. Browsing places + arranging days is the daily verb. Absorbing Discover (F2) makes this the single most-used surface and frees a slot. |
| **Money** | Touched repeatedly across the trip; trust anchor; the exemplar. |
| **Chat** (now the decision hub) | The crew's living room + where decisions happen (F1). Group coordination is continuous, not occasional. |

**Plus one always-visible communication affordance:** Chat doubles as the "talk to the crew" entry,
so it earns a permanent slot on both breakpoints (not buried).

**Tools (secondary hub) — touched occasionally / per-phase, each a focused destination:**

| In Tools | Why it's secondary (not daily) |
|---|---|
| **Bookings** | High-value but *bursty* — you book over a few sessions, then it's a wallet you glance at. Not a daily verb after booking is done. |
| **Pack** | Used near departure + during the trip; near-zero use in early planning. |
| **Crew** | Set up once (invite), then occasional. Already a side panel/sheet. |
| **Add to calendar** | One-time export. |
| **Trip settings** (owner) | Rare, owner-only. |
| **Share invite** | Occasional. |
| **Decisions** (as a lens) | Not its own destination — it's a filter inside Chat (F1). Listed in Tools only as a shortcut if needed. |

**Why Bookings goes to Tools and not the core:** this is the bold, possibly-contested call.
Reasoning: Bookings is the highest *value-per-use* surface but among the **lowest frequency** — its
entire job (book the gaps) is front-loaded into a handful of sessions, after which it's a passive
wallet. Frequency-based IA (NN/g) says give the *daily* verbs the scarce primary slots. Bookings as
the top entry in a beautiful Tools hub is *more* discoverable than as the 6th flat tab no one's eye
reaches — it gets a hero tile in the hub, not a buried row. **If usage data later shows Bookings is
opened most days, promote it — the structure makes that a one-line change.**

## 3.3 The proposed nav tree

### Desktop sidebar (lg+)
```
Paxawa ▸ Japan Trip · Japan · 18 Jun – 2 Jul
│
├─ ◎ Overview                    ← primary core
├─ ◎ Plan            [Days|Discover]   ← primary core (Discover folded in, F2)
├─ ◎ Money                       ← primary core
├─ ◎ Chat            • (needs-vote badge)  ← primary core (decision hub, F1)
│   ─────────────────────────────
├─ ▤ Tools           >           ← single hub entry (was "Pack" slot)
│      └ opens /trips/[id]/tools (focused hub page, §3.4)
│         ├─ Bookings
│         ├─ Pack
│         ├─ Crew
│         ├─ Decisions (→ Chat lens)
│         ├─ Add to calendar
│         ├─ Share invite
│         └─ Trip settings (owner)
│   ─────────────────────────────
└─ ◔ Account (avatar) ▾   profile · notifications · theme · sign out
```
Primary rows render heavier (current active-tab weight); the **Tools** row is visually distinct (a
grid/box icon + chevron) so it reads as "a drawer," not a peer destination. The needs-your-vote badge
sits on Chat; a small dot on Tools when any Tools surface needs attention (e.g. a new booking gap).

### Mobile bottom nav (<lg) — exactly 5, thumb-zone, Material-compliant
```
┌───────┬───────┬───────┬───────┬───────┐
│  ◎    │  ◎    │  ◎    │  ◎    │  ▤    │
│ Home  │ Plan  │ Money │ Chat  │ Tools │
└───────┴───────┴───────┴───────┴───────┘
                          •badge   •dot
```
- **This is the reconciliation:** the mobile "More" sheet **becomes the Tools sheet** — same label,
  same contents, same mental model as desktop's Tools hub. No more "More vs Tools" split; **one
  overflow concept across both breakpoints.** Tapping Tools opens the bottom sheet (mobile) /
  navigates to the hub page (desktop), holding the identical set.
- **Discover** leaves the bottom nav (it's now inside Plan) — that's the slot that lets Chat become
  primary, fixing the F1 fragmentation on mobile too.
- **Bookings + Pack** leave the bottom nav into Tools — correcting today's inconsistency where
  Bookings was already absent on mobile but primary on desktop. Now both breakpoints agree.

### Reconciled cross-surface table (the fix for `v2-app-map.md` §6 open question 1)
| Destination | Desktop | Mobile | Lives in |
|---|---|---|---|
| Overview | primary | primary (Home) | core |
| Plan (+Discover mode) | primary | primary | core |
| Money | primary | primary | core |
| Chat (+Decisions lens) | primary | primary | core |
| Bookings | **Tools hub** | **Tools sheet** | Tools |
| Pack | **Tools hub** | **Tools sheet** | Tools |
| Crew | Tools hub (+panel) | Tools sheet (+panel) | Tools |
| Decisions | → Chat lens | → Chat lens | Chat |
| Calendar / Share / Settings | Tools hub | Tools sheet | Tools |

**Every breakpoint now agrees on what is primary and what is a tool.** That single consistency is the
biggest IA win in the brief.

## 3.4 The "Tools" hub page design (NOT a kitchen sink)

The Tools entry must open into a **clean, focused overview** — a calm grid of destinations, each a
real door, not a dumping ground that crams every feature onto one screen (the exact failure the
founder warns against). It is the *foyer* to the secondary surfaces, not a workspace itself.

**Desktop (`/trips/[id]/tools`) — a tile grid:**
```
Tools
Everything else for this trip, in one place.

┌──────────────────────┐  ┌──────────────────────┐
│ 🎟  Bookings          │  │ 🎒  Pack              │
│ 6 booked · 6 to go    │  │ 1/2 packed · 1 doc    │
│                    →  │  │                    →  │
└──────────────────────┘  └──────────────────────┘
┌──────────────────────┐  ┌──────────────────────┐
│ 👥  Crew              │  │ 🗳  Decisions          │
│ 2 travelers · invite  │  │ Vote in chat       →  │
│                    →  │  │                       │
└──────────────────────┘  └──────────────────────┘
┌──────────────────────┐  ┌──────────────────────┐
│ 📅  Add to calendar   │  │ 🔗  Share invite      │
│ Export .ics        ↓  │  │ Copy link          ⧉  │
└──────────────────────┘  └──────────────────────┘
┌───────────────────────────────────────────────┐
│ ⚙  Trip settings (owner)                    →  │   ← owner-only, set apart
└───────────────────────────────────────────────┘
```
- Each tile is a **focused door with one live stat** (Bookings shows "6 booked · 6 to go," Pack shows
  "1/2 packed," Crew shows "2 travelers") so the hub is a *status glance*, not just a menu — it earns
  its existence by summarizing, then routing.
- Tiles use the **canonical content-card token (U5)**; the active/important one (e.g. Bookings with
  gaps) may carry a subtle accent. Owner-only **Trip settings** sits in its own row, set apart.
- This replaces the current More sheet's flat list with a **considered, single-job-per-tile foyer.**

**Mobile (Tools sheet) — the existing bottom-sheet, re-skinned as the same hub:**
- Same destinations as the desktop tiles, rendered as the current sheet rows (icon + label + live
  meta + chevron) — but **relabeled "Tools," not "More,"** and holding the **same canonical set** as
  desktop. The "Coming soon" section (Photos) stays muted/non-interactive. Owner zone (Settings,
  Clear plan) stays at the bottom with the two-tap arming gate.
- **One concept, two native renderings:** grid on desktop, sheet on mobile.

## 3.5 Migration — what moves where
| Item | From | To |
|---|---|---|
| Discover | top-level tab (both) | **Plan → Discover mode** (F2) |
| Decisions | top-level tab + More row | **Chat → Decisions lens** (F1) |
| Bookings | desktop primary / mobile-absent | **Tools** (both breakpoints) |
| Pack | desktop primary / mobile primary | **Tools** (both); the freed "Pack" slot becomes **Tools** entry |
| Chat | desktop secondary / mobile ⋯ | **promoted to primary core** (both) |
| Crew · Calendar · Share · Settings | More sheet / dropdown | **Tools hub/sheet** |
| "More" sheet | mobile-only overflow | **renamed + restructured as the Tools sheet** = mobile twin of the Tools hub |

Net per-trip primary nav: **9 flat → 4 core + 1 Tools entry** on desktop; **5 thumb-zone tabs** on
mobile (Home · Plan · Money · Chat · Tools). Account menu unchanged (pinned bottom).

## 3.6 Acceptance criteria (sitemap)
- [ ] Per-trip **desktop sidebar** shows: Overview · Plan · Money · Chat · **Tools** (+ account menu).
      No flat list of 7+ destinations.
- [ ] Per-trip **mobile bottom nav** shows exactly 5: Home · Plan · Money · Chat · **Tools**.
- [ ] **Discover** has no top-level tab; it is a `Days | Discover` mode inside Plan.
- [ ] **Decisions** has no top-level tab; it is a lens inside Chat with the needs-your-vote badge.
- [ ] **Bookings, Pack, Crew, Calendar, Share, Settings** all live under **one** Tools hub/sheet,
      identical on both breakpoints.
- [ ] The **Tools hub page** is a clean tile grid (desktop) / structured sheet (mobile), each tile a
      single-job door with a live status line — never a kitchen-sink workspace.
- [ ] The mobile **"More" sheet is renamed "Tools"** and holds the same set as the desktop hub
      (one overflow concept, not two).
- [ ] A first-time user can name the 4 things they do daily (plan, money, chat, overview) and knows
      "everything else is in Tools."

---

# BUILD ORDER (by impact × dependency)

| # | Pri | Item | Why this order |
|---|---|---|---|
| 1 | **P0** | **Sitemap restructure** (§3): 4 core + Tools, both breakpoints; build the Tools hub page; rename More→Tools | The headline; everything else slots into this skeleton. Unblocks F1/F2 nav slots. |
| 2 | **P0** | **F1 — Decisions → Chat lens** | Fixes the worst seam (3 homes for one verb); frees a nav slot the restructure needs. |
| 3 | **P0** | **F2 — Discover → Plan `Days\|Discover` mode** | Fixes the two-map split; frees the other nav slot; delivers the "found it → watch it land" wow. |
| 4 | P1 | **F3 — first-run seeds the Plan from the AI questionnaire** | Highest-leverage funnel moment; makes onboarding feel magic. |
| 5 | P1 | **U2/U3 — Pack single-tab + Overview one-focal-point** | Removes the two clearest "competent-not-wow" UI tells. |
| 6 | P1 | **F4 — place↔expense link** | Closes the money loop; starts the taste flywheel. |
| 7 | P2 | **U4/U5 — crew rail scales + canonical content-card token** | Final consistency pass; one card language. |
| 8 | P2 | **F5 — travel-day "Today" mode + offline** | Day-of delight; bigger build, lands last. |

## Surfaces needing the most fundamental rethink
1. **The per-trip navigation** — flat 9 → tiered 4 + Tools. The headline; the single biggest "feels
   like one product" win.
2. **The Discover/Decide/Plan chain** — one object, one path; collapse Decisions into Chat and
   Discover into Plan. Today it's three doors for one journey.
3. **First-run** — the questionnaire's promise must already be on the Plan when the user lands.

---

## Citations
- NN/g — Ten Usability Heuristics (esp. #4 Consistency, #6 Recognition): https://www.nngroup.com/articles/ten-usability-heuristics/
- NN/g — Consistency & Standards: https://www.nngroup.com/articles/consistency-and-standards/
- NN/g — Design Systems 101: https://www.nngroup.com/articles/design-systems-101/
- NN/g — Tabs, Used Right: https://www.nngroup.com/articles/tabs-used-right/
- NN/g — Onboarding / first impressions: https://www.nngroup.com/articles/onboarding-tutorials/
- NN/g — Mobile UX: https://www.nngroup.com/articles/mobile-ux/
- Laws of UX — Miller's Law (7±2): https://lawsofux.com/millers-law/
- Laws of UX — Hick's Law: https://lawsofux.com/hicks-law/
- Laws of UX — Tesler's Law (Conservation of Complexity): https://lawsofux.com/teslers-law/
- Laws of UX — Aesthetic-Usability Effect: https://lawsofux.com/aesthetic-usability-effect/
- Material Design — Bottom navigation (3–5 max): https://m2.material.io/components/bottom-navigation
- Smashing Magazine — The Golden Rules of Mobile Navigation Design: https://www.smashingmagazine.com/2016/11/the-golden-rules-of-mobile-navigation-design/
- UXPin — Mobile Navigation Design (Priority+ / frequency-based): https://www.uxpin.com/studio/blog/mobile-navigation-examples/
