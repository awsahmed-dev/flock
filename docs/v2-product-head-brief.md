# Paxawa v2 — Product-Head Redesign Brief

**Author:** Product-head agent (Head of Product + UX Research)
**Audience:** ui-ux-designer (builds from this), then the implementation loop
**Date:** 2026-06-23
**Status:** BETA is live at https://paxawa.com. This brief is the rework backlog before a wider opening. No code edits made by product-head.
**Scope of audit:** every primary trip surface, walked live on desktop (1500px) + reasoned for mobile from the responsive source (Chrome harness can't render <1024px). IA/nav read from source: `desktop-trip-sidebar.tsx`, `mobile-nav.tsx`, `trip-more-sheet.tsx`, `trip-shell.tsx`, `trip-overview.tsx`, `trip-action-hub.tsx`.

How to read each finding: **the problem · the named principle (cited) · the user harm · the prescribed target · acceptance criteria.** "I don't like it" is never an argument here — every call is grounded.

---

## 0. North star & IA statement

**Paxawa is one considered system for planning a group trip together: discover real places → decide as a crew → plan the days → settle the money.** Every destination has exactly one job and one name. The system carries the complexity; the user is never asked to reconcile two summaries, two labels, or two ways to do the same thing.

**The single canonical navigation taxonomy** (one label per destination, used identically on every breakpoint and in every entry point):

| Canonical destination | One job | Route today | The ONE label everywhere |
|---|---|---|---|
| **Overview** | The trip at a glance + the next best action | `/trips/[id]` | Overview |
| **Plan** | The day-by-day itinerary on the map | `/itinerary` | Plan |
| **Discover** | Find real places to add | `/discover` | Discover |
| **Decisions** | Vote on places the crew is weighing | `/decisions` | Decisions |
| **Money** | What was spent + who owes whom | `/expenses` | Money |
| **Bookings** | Tickets/confirmations you carry | `/wallet` | Bookings |
| **Pack** | What to bring + trip docs | `/pack` | Pack |
| **Chat** | The crew conversation | (sheet/panel) | Chat |

**North-star IA principles for this rework:**
1. **One label per destination, on every surface.** Today the same destination is called three different things (see P0-1). That ends.
2. **One navigation system per breakpoint.** No surface shows two parallel nav systems at once (see P0-2).
3. **Each tool page = a clean, focused overview of that ONE tool** — a coherent header → content hierarchy, not a busy page wearing the trip header and cramming two tools in (see P1-1 Pack, P1-2 Bookings).
4. **One router for "what next."** The Overview may have exactly one smart "next action" surface, not three competing ones (see P1-3).
5. **Chrome scales to the value of its content.** A one-number metric does not get a three-line card (see P1-4).
6. **Don't duplicate a control across surfaces** unless it's genuinely the same affordance with the same outcome (see P0-3 Plan/AI redundancy).

---

# PRIORITY P0 — coherence faults a first-time Gulf user trips on immediately

## P0-1 · The same destination has three different names

**Problem.** A single destination is labeled differently depending on which nav surface you're in:
- `/itinerary` is **"Itinerary"** in the desktop sidebar (`NAV_TABS`, `desktop-trip-sidebar.tsx`), but **"Plan"** in the mobile bottom nav (`mobile-nav.tsx`, `label: t("cards.plan")`).
- `/expenses` is **"Expenses"** in the sidebar but **"Money"** in the mobile bottom nav (`t("cards.money")`).
- `/wallet` is **"Bookings"** in the sidebar and More sheet, **"Wallet"** in the tablet sub-nav (`trip-shell.tsx` adds `nav.wallet` = "Wallet"), and the route itself is `/wallet`. Three names, one place.
- `/pack` is **"Pack"** in nav but the More sheet routes "Docs" and "Full map" *into* it (`pack?view=docs`, and "Full map" actually points at `/itinerary`).

**Principle.** Nielsen's Heuristic #4, Consistency & Standards: *"Users should not have to wonder whether different words, situations, or actions mean the same thing."* ([NN/g — Consistency and Standards](https://www.nngroup.com/articles/consistency-and-standards/)). Internal consistency means the same label means the same thing throughout one app.

**User harm.** A first-time user builds a mental model from the bottom nav ("Plan", "Money"), then opens the desktop/tablet view and sees "Itinerary", "Expenses", "Bookings", "Wallet" — and can't tell whether these are the same features or new ones. Learnability drops, the app reads as stitched-together rather than one system. This is the founder's "feels like a clone" failure mode.

**Target.** Adopt the canonical taxonomy table in §0 as the single source of truth. One label per route, in every nav surface and every cross-link. Recommended canonical set: **Overview · Plan · Discover · Decisions · Money · Bookings · Pack · Chat.** Rename the `nav.wallet`="Wallet" tablet entry to "Bookings" (it's the same `/wallet` route). Remove "Itinerary"/"Expenses" variants in favor of "Plan"/"Money" (or the reverse — but pick ONE and apply globally).

**Acceptance criteria.**
- [ ] Each route renders the identical label string in the desktop sidebar, the mobile bottom nav, the tablet sub-nav, the More sheet, AND any in-content cross-link (e.g. Overview cards, onboarding copy).
- [ ] `/wallet` is never labeled both "Bookings" and "Wallet" anywhere in the product.
- [ ] No destination has more than one user-facing name. A grep of nav label keys shows one key per route.

---

## P0-2 · Two parallel navigation systems on the tablet band

**Problem.** In `trip-shell.tsx`, the tablet band (`sm`–`lg`) renders BOTH a top **sub-nav tab row** (`hidden sm:flex`, the full NAV_TABS + Wallet, lines ~484–518) AND the app still relies on the bottom `MobileNav` for `<sm`. The result across breakpoints: phones get a 5-tab bottom nav + a More sheet; tablets get a horizontal top sub-nav tab strip; desktop gets the left sidebar. Two of these (top sub-nav + bottom nav / sidebar) can present the *same* destinations simultaneously, and the desktop sidebar's own comment admits the prior stacked top-bar+sub-nav+bottom-nav was "the single biggest reason the app read as code-vibed."

**Principle.** Aesthetic & Minimalist Design (Heuristic #8): *"Every extra unit of information in an interface competes with the relevant units of information and diminishes their relative visibility"* ([NN/g — Aesthetic and Minimalist Design](https://www.nngroup.com/articles/aesthetic-minimalist-design/)). Plus Jakob's Law — users expect ONE primary nav per context, not two ([Laws of UX](https://lawsofux.com/)).

**User harm.** Duplicate navigation doubles the scan cost, creates ambiguity about which control is "the" nav, and is the visual tell of a mobile pattern stretched onto a bigger screen.

**Target.** Exactly one primary nav per breakpoint:
- **`<sm` (phone):** bottom nav (5 tabs) + More sheet for the overflow. No top sub-nav.
- **`sm`–`lg` (tablet):** choose ONE — either promote the desktop sidebar earlier (preferred, it's the cleaner system) OR keep the bottom nav. Kill the top sub-nav tab strip on this band.
- **`lg`+ (desktop):** the left sidebar only.

**Acceptance criteria.**
- [ ] At no viewport width do two systems that list the same destinations render at the same time.
- [ ] The top horizontal sub-nav tab strip in `trip-shell.tsx` is removed or is the *only* nav on its band.
- [ ] Tablet (e.g. 768–1023px) shows a single, coherent primary nav.

---

## P0-3 · "Plan this day" vs "AI Plan" — two controls, near-identical job, duplicated across surfaces

**Problem.** The founder's flagship example. On the **Overview** there are two adjacent buttons: **"Plan this day"** (gradient, flex-2) and **"AI Plan"** (outline, flex-1). On the **Plan page** the same two appear AGAIN, now joined by a third, **"Add place"** — three stacked plan/add affordances in one header. Both AI buttons open an AI flow that assembles real places into the itinerary; to a user they do nearly the same job, and they're duplicated on two surfaces.

**Principle.** Hick's Law — decision time rises with the number of choices, especially when choices overlap in meaning ([NN/g — Hick's Law: Designing Long Menus](https://www.nngroup.com/videos/hicks-law-long-menus/); [Laws of UX](https://lawsofux.com/)). And Tesler's Law / Conservation of Complexity — collapsing two near-duplicate controls into one clear primary + progressive disclosure pushes complexity to the system, not the user ([Laws of UX](https://lawsofux.com/)).

**User harm.** The user can't tell what's different between "Plan this day" and "AI Plan," hesitates, and distrusts a tool that offers two doors to the same room. Three add-affordances on the Plan header is choice paralysis at the exact moment of action.

**Target.**
- Establish ONE primary "add to plan" action and ONE AI assist, with a clear division of labor and distinct copy:
  - **Add place** = the manual/search path (Google autocomplete). Primary on the Plan page.
  - **AI: Plan this day** = the single AI entry. Merge "Plan this day" and "AI Plan" into one button; if the multi-day wizard must remain distinct, make it a secondary option *inside* the AI flow (progressive disclosure: "Plan one day" vs "Plan the whole trip" as a choice on the opened panel), not a second top-level button.
- Do not duplicate the AI plan button on both Overview and Plan. Overview gets ONE plan CTA that routes to the Plan page's flow; the Plan page owns the actual controls.

**Acceptance criteria.**
- [ ] The Plan page header shows at most TWO action affordances: "Add place" (manual) and one AI entry. Not three.
- [ ] "Plan this day" and "AI Plan" are not both present as sibling top-level buttons on any single surface.
- [ ] Each remaining action's label/sublabel makes its distinct outcome obvious without the user having to open it to find out.

---

# PRIORITY P1 — tool-page IA & overview density (the founder's core complaints)

## P1-1 · Pack crams two unrelated tools into one undifferentiated page

**Problem.** `/pack` renders **two independent tools side by side under one "Pack" header**: a **Docs** module (its own All / Photos / Files tabs + "Add document" button) on the left, and a **Packing** module (its own Shared / Yours / Crew tabs + category dropdown + "Add" button) on the right. Two tab systems, two add buttons, two mental models, one header that announces neither clearly. This is the founder's "opening a secondary tool dumps you into a busy page that crams every feature in" example, exactly.

**Principle.** Aesthetic & Minimalist Design (#8) — competing information diminishes relative visibility ([NN/g](https://www.nngroup.com/articles/aesthetic-minimalist-design/)). Miller's Law / chunking — group related content into one coherent unit, don't present two parallel structures at once ([Laws of UX](https://lawsofux.com/)). A destination should have a single clear job and a coherent header→content hierarchy.

**User harm.** The user lands and faces two toolbars and two "add" buttons with no signal which is primary; the page has no single job. First-time confidence collapses.

**Target.** Give Pack a single, focused job and a clean header→content hierarchy. Recommended: a **header (title + one-line purpose + overall progress)**, then a **single segmented control** that switches the body between **Packing** and **Docs** (one tab system, not two). Each mode has exactly one primary add affordance. Packing is the default mode (it's the page's namesake). Docs is the second segment. Crew/Yours/Shared and Photos/Files become sub-filters *within* their mode, not a competing top-level system.

**Acceptance criteria.**
- [ ] One header that states the page's single job; one overall progress/summary line.
- [ ] One top-level tab/segment system (Packing | Docs), not two side-by-side.
- [ ] Exactly one primary "add" affordance visible per mode.
- [ ] On mobile the two modes stack into one scannable column, not two cramped halves.

---

## P1-2 · Bookings shows two competing trip-spend summaries and collides with Money

**Problem.** `/wallet` (labeled "Bookings") opens with **"Total Trip Spend SAR 2,019"** and a **Booked 6 / To book 6** split — and then *below* it a **second** segmented **"Booked / To book"** tab control. Two summaries of the same thing stacked. Worse, this "Total Trip Spend" (SAR 2,019) contradicts the **Money** page's **"Trip Total Spent USD 130.87"** — two surfaces, two different "trip totals," two currencies. The page also overlaps Money's job (both report trip spend).

**Principle.** Consistency & Standards (#4) — the same concept ("trip total spent") must not show two different values/labels in one app ([NN/g](https://www.nngroup.com/articles/consistency-and-standards/)). Aesthetic & Minimalist (#8) — the duplicated Booked/To-book control is redundant chrome ([NN/g](https://www.nngroup.com/articles/aesthetic-minimalist-design/)).

**User harm.** A user who sees "SAR 2,019" on Bookings and "USD 130.87" on Money cannot trust either number — the cardinal sin for a money-adjacent product whose whole credibility rests on Expenses. The duplicated tab control wastes a scan.

**Target.**
- Bookings owns ONE clear job: *the tickets/confirmations the crew carries.* Lead with the **Booked / To book** state ONCE (a single summary that is also the tab control — merge the top stat block and the lower segmented control into one). Remove the second copy.
- Resolve the number conflict: Bookings should report **booking value** (cost of tickets), labeled distinctly (e.g. "Booked value"), in the **trip's display currency**, never an unqualified "Total Trip Spend" that competes with Money. "Trip Total Spent" is Money's number and only Money's.
- Confirm currency normalization is consistent with Money's FX so the two pages never disagree on a shared figure.

**Acceptance criteria.**
- [ ] Bookings shows the Booked/To-book breakdown exactly once (summary == tab control, not two separate blocks).
- [ ] No label on Bookings reads "Total Trip Spend"/"Trip Total Spent" — that phrase belongs only to Money.
- [ ] Any spend/value figure on Bookings uses the same currency and FX basis as Money; the two pages never show conflicting totals for the same concept.
- [ ] Header states Bookings' single job in one line.

---

## P1-3 · The Overview has three competing "what next" routers + a duplicated component

**Problem.** The Overview stacks THREE next-action surfaces: (1) **"Plan this day" / "AI Plan"** buttons, (2) an **"Up Next"** smart-suggestion card, and (3) a **"Discover — Find places to add"** router card at the bottom. Discover is *also* a primary nav tab, so the bottom card is a redundant fourth path to it. Separately, `trip-action-hub.tsx` is a near-duplicate of the Overview's inline "Up Next" + snapshot logic (both import `pickSuggestion`) — an orphaned/duplicated component.

**Principle.** Hick's Law — multiple overlapping "do this next" prompts increase decision time ([NN/g](https://www.nngroup.com/videos/hicks-law-long-menus/)). Aesthetic & Minimalist (#8) — the Discover card duplicates a nav tab, adding chrome without new information ([NN/g](https://www.nngroup.com/articles/aesthetic-minimalist-design/)).

**User harm.** "Where do I actually start?" — the Overview should answer that in one glance; instead it offers four answers and the user satisfices or stalls.

**Target.**
- ONE smart "Up Next" router is the single next-action surface on the Overview (keep it — it's good, and personalized).
- The plan CTA stays as the primary action (per P0-3, one button).
- REMOVE the standalone "Discover — find places to add" card from the Overview; Discover is already a nav tab and can be the target of "Up Next" when relevant.
- Resolve the duplicated `trip-action-hub.tsx` vs inline overview logic — one implementation, not two. (Flag for engineering cleanup; product position: a single source of truth for the suggestion.)

**Acceptance criteria.**
- [ ] The Overview has exactly ONE generic "next action" router (the Up Next card) plus the single primary plan CTA. No third/fourth router card.
- [ ] No Overview card merely duplicates an existing nav tab's destination as its sole purpose.
- [ ] The "Up Next"/snapshot suggestion is rendered from a single component, not two parallel ones.

---

## P1-4 · Oversized chrome for one-number content (the snapshot tiles)

**Problem.** The Overview's snapshot row is four tall cards — each a 32px rounded icon + a big number + a label — to show a single tiny value ("3/15", "7", "USD 130.87", "1/2"). This is the founder's "snapshot cards are 3 lines tall to show one tiny number" example precisely: big space, small information value. The desktop trip-context card in the sidebar similarly spends a gradient panel to restate name/destination/dates already implied by context.

**Principle.** Tufte's data-ink ratio applied to UI — chrome should scale to information value; remove visual elements that don't carry data ([NN/g — Clutter-Free / 3 Cs for Better Charts](https://www.nngroup.com/articles/clutter-charts/)). Aesthetic & Minimalist Design (#8) ([NN/g](https://www.nngroup.com/articles/aesthetic-minimalist-design/)). NN/g eye-tracking: in a repeated row, attention drops sharply left-to-right, so the 4th tile is barely registered — tall tiles waste the most-expensive vertical space on the least-read items.

**User harm.** The most valuable vertical real estate (above the fold) is consumed by low-density tiles, pushing the genuinely useful content (crew, plan, next action) down. The page reads as padded — "code-vibed."

**Target.** Replace the four tall tiles with ONE compact, scannable snapshot strip (a single low-profile row of inline stat chips: `📅 3/15 · 📍 7 · 💰 USD 130 · 🎒 1/2`), each still tappable to its page, occupying a fraction of the current height. Each stat's chrome must be proportional to its one-number payload. Re-evaluate the sidebar gradient context card — slim it; the trip name/dates don't need a hero treatment in a persistent rail.

**Acceptance criteria.**
- [ ] The four snapshot metrics occupy a single compact row, not four multi-line cards.
- [ ] Each metric remains individually tappable to its destination.
- [ ] Vertical space spent on the snapshot is materially reduced (target: ≤ ~1/3 of current), measured by box height in the responsive source.
- [ ] No metric tile's chrome (icon + padding) is taller than ~2× its data line.

---

# PRIORITY P2 — polish, copy/IA mismatches, and consistency sweeps

## P2-1 · Overview onboarding copy describes an IA that doesn't exist

**Problem.** The "How Paxawa works" onboarding strip says **"Switch to Book mode in the Plan tab — hotels, flights, eSIM."** There is no "Book mode" inside Plan; Bookings is its own destination (`/wallet`). The copy teaches a wrong mental model on first run.

**Principle.** Consistency & Standards (#4) and Match Between System and the Real World — labels in instructions must match the actual UI ([NN/g](https://www.nngroup.com/articles/consistency-and-standards/)).

**User harm.** The user hunts for a "Book mode" in Plan, fails, and the very first thing the app taught them is false.

**Target.** Rewrite step 2 to match reality: point at the **Bookings** destination by its canonical name and real entry point. Align all three onboarding steps to the canonical taxonomy (§0).

**Acceptance criteria.**
- [ ] Onboarding copy references only destinations and entry points that exist, by their canonical names.
- [ ] No instruction references a "mode" or tab that isn't in the shipped IA.

## P2-2 · Discover card photos and map tiles not loading on first paint

**Problem.** On the live `/discover` walk, place-card hero photos rendered as gray placeholders and the Mapbox tiles were only partially loaded after a 2s wait. (Could be lazy-load/network in the harness, but worth confirming on real devices since Discover is the v2 centerpiece.)

**Principle.** Aesthetic-Usability Effect — users judge usability by polish; a hero feature showing empty image frames reads as broken and erodes trust disproportionately ([Laws of UX](https://lawsofux.com/)). Visibility of System Status (#1) — show loading skeletons, not blank gray ([NN/g — 10 Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)).

**User harm.** The flagship "real places with real photos" promise visibly fails to deliver photos on the first screen the founder wants to wow people with.

**Target.** Verify Google Places photo fetch + Mapbox tile load on real mobile/desktop. If lazy, show proper skeleton states (not flat gray) and prioritize loading the first row of cards' photos eagerly. If a real fetch/quota failure, fix at source.

**Acceptance criteria.**
- [ ] On a normal connection, the first row of Discover cards shows real photos (or a branded skeleton, never a flat gray box) within ~1s.
- [ ] The Discover map renders tiles, not a blank/partial basemap, on load.

## P2-3 · Cross-surface label & icon consistency sweep

**Problem.** Beyond the big renames, icons drift: Bookings uses `CreditCard` in the sidebar and More sheet but the route is `/wallet`; "Money"/"Expenses" use `Wallet`/`Wallet` icons — so a Wallet icon means "Money," while the "Bookings" tool lives at `/wallet`. The Overview's plan button uses `Sparkles` for both the primary and the AI secondary.

**Principle.** Consistency & Standards (#4) — *"the plus sign used as an icon to represent both adding items and expanding content"* is NN/g's canonical example of internal-consistency failure; the same applies to a Wallet icon meaning two different tools ([NN/g](https://www.nngroup.com/articles/consistency-and-standards/)).

**User harm.** Icon ambiguity slows recognition and makes the icon set feel arbitrary.

**Target.** One icon per concept across the whole app. Pick a distinct icon for Bookings (e.g. ticket) vs Money (e.g. wallet/coins), and don't reuse `Sparkles` for two adjacent-but-different actions.

**Acceptance criteria.**
- [ ] Each canonical destination has one icon, used everywhere it appears.
- [ ] No single icon represents two different destinations/actions in the same context.

## P2-4 · Mobile More-sheet "Coming soon" rows ship muted-but-tappable, and overlap real nav

**Problem.** The More sheet lists "Coming soon" rows (Photos, Docs, Calendar, Full map) at 60% opacity — but Docs and "Full map" are actually wired (Docs → `/pack?view=docs`, Full map → `/itinerary`). So "coming soon" items are live, and "Full map" duplicates the Plan tab. Mixed live/dead affordances under a "coming soon" header.

**Principle.** Visibility of System Status (#1) and Consistency (#4) — an affordance must honestly signal whether it works ([NN/g — 10 Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)).

**User harm.** Users either avoid working features (they look disabled) or tap "coming soon" rows that actually navigate — both break the contract.

**Target.** Separate truly-not-ready items (keep muted, non-interactive) from live ones (full opacity, in the appropriate section). Remove "Full map" (it's just Plan) — don't duplicate a primary tab in the overflow. Move live "Docs" into Pack's IA per P1-1 rather than as an orphan More-sheet row.

**Acceptance criteria.**
- [ ] No row under a "Coming soon" header navigates anywhere.
- [ ] The More sheet contains no row that merely re-opens an existing primary nav destination (no "Full map" == Plan duplicate).

---

# Surfaces that PASS (hold these as the bar)

- **Money (`/expenses`)** — exemplary hierarchy: one hero total → one primary "Log expense" → Activity + Spending breakdown + Balances. Clear single job, proportional chrome. **This is the model every other tool page should match.** (Only cross-surface fix: it must own the sole "Trip Total Spent" number — see P1-2.)
- **Discover (`/discover`)** — strong header ("Find your Japan"), category chips, search, card grid + synced map. Single clear job, clean header→content. (Only fix: photo/tile loading — P2-2.)
- **Decisions (`/decisions`)** — clean header, good empty state with ONE clear CTA ("Open Discover"). Model empty-state behavior.

---

# Priority summary (build order)

| ID | Priority | Surface | One-line fix |
|---|---|---|---|
| P0-1 | P0 | Global nav | One label per destination, everywhere |
| P0-2 | P0 | Shell / tablet | Kill the duplicate top sub-nav; one nav per breakpoint |
| P0-3 | P0 | Overview + Plan | Merge "Plan this day"/"AI Plan"; ≤2 actions on Plan header; no duplication across surfaces |
| P1-1 | P1 | Pack | One header, one tab system (Packing \| Docs), one add per mode |
| P1-2 | P1 | Bookings | One Booked/To-book summary; stop competing with Money's total; fix currency conflict |
| P1-3 | P1 | Overview | One "Up Next" router; remove duplicate Discover card; dedupe action-hub component |
| P1-4 | P1 | Overview | Snapshot tiles → one compact stat strip; slim sidebar context card |
| P2-1 | P2 | Overview | Fix onboarding copy ("Book mode" doesn't exist) |
| P2-2 | P2 | Discover | Fix/skeleton card photos + map tiles |
| P2-3 | P2 | Global | One icon per concept |
| P2-4 | P2 | More sheet | Separate live from "coming soon"; drop "Full map" duplicate |

**Surfaces needing the most rework:** (1) **Global nav/IA** (P0-1, P0-2) — the labels-and-double-nav problem touches every screen and is the strongest "stitched-together clone" signal. (2) **Pack** (P1-1) — the clearest single-page "two tools crammed in" violation. (3) **Bookings** (P1-2) — the trust-breaking number conflict with Money. (4) **Overview** (P0-3, P1-3, P1-4) — density + redundant routers + the founder's snapshot-tile example.

---

## Citations
- NN/g — Maintain Consistency and Adhere to Standards (Usability Heuristic #4): https://www.nngroup.com/articles/consistency-and-standards/
- NN/g — Aesthetic and Minimalist Design (Usability Heuristic #8): https://www.nngroup.com/articles/aesthetic-minimalist-design/
- NN/g — 10 Usability Heuristics for User Interface Design: https://www.nngroup.com/articles/ten-usability-heuristics/
- NN/g — Hick's Law: Designing Long Menus (video): https://www.nngroup.com/videos/hicks-law-long-menus/
- NN/g — Progressive Disclosure: https://www.nngroup.com/articles/progressive-disclosure/
- NN/g — Clutter-Free: One of the 3 Cs for Better Charts (data-ink): https://www.nngroup.com/articles/clutter-charts/
- Laws of UX (Hick's, Jakob's, Miller's, Tesler's/Conservation of Complexity, Aesthetic-Usability): https://lawsofux.com/
