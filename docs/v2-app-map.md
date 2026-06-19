# Paxawa v2 — App Structure Map (authoritative IA)

**Status:** Reference / analysis. The navigable source-of-truth for the v2 information
architecture — current state inventory reconciled against the v2 target. Companions:
- `v2-discovery-planning.md` — what/why, Google architecture, stays/changes/dies (§2), Discover (§3), data model (§7), roadmap (§9).
- `v2-discovery-logic.md` — modes (§1), in-session learning (§2), ranking (§3), decisions in chat (§6), cross-app thread (§13).
- `v2-discovery-build-spec.md` — Part A signal engine, Part B decision card, build order.
- `v2-design-system.md` — surfaces (§4), desktop/mobile pattern map (§5), component inventory (§7).
- `v2-build-roadmap.md` — phase/sprint plan + reuse-vs-rebuild table.

**Decision in force (roadmap 2026-06-19):** build directly into the real surfaces. No URL-only
staging, no flag purely to hide from testers. The `isDiscoveryEnabled` flag survives only as an
optional rollout switch (`src/lib/discovery/flags.ts`). The standalone `/trips/[id]/discover`
preview route is a temporary scaffold that **folds into the Plan IA in Phase 3** and is retired.

---

## 1. Current-state inventory

### 1.1 Routes (every `src/app/**/page.tsx` + API)

**Marketing / public**

| Path | File | Purpose |
|---|---|---|
| `/` | `src/app/page.tsx` | Landing (redirects signed-in users to `/dashboard`). |
| `/blog` | `src/app/blog/page.tsx` | Blog index. |
| `/blog/how-to-plan-a-group-trip` | `src/app/blog/how-to-plan-a-group-trip/page.tsx` | SEO article. |
| `/blog/ai-itinerary-planning-guide` | `src/app/blog/ai-itinerary-planning-guide/page.tsx` | SEO article. |
| `/blog/split-expenses-with-friends-on-vacation` | `src/app/blog/split-expenses-with-friends-on-vacation/page.tsx` | SEO article. |
| `/privacy` | `src/app/privacy/page.tsx` | Privacy policy. |
| `/terms` | `src/app/terms/page.tsx` | Terms of service. |

**Auth**

| Path | File | Purpose |
|---|---|---|
| `/auth/login` | `src/app/auth/login/page.tsx` | Sign in. |
| `/auth/signup` | `src/app/auth/signup/page.tsx` | Sign up. |
| `/auth/callback` | `src/app/auth/callback/route.ts` | OAuth/email callback handler. |
| `/auth/confirm` | (dir; handler) | Email confirm. |

**Signed-in shell + account**

| Path | File | Purpose |
|---|---|---|
| `/dashboard` | `src/app/dashboard/page.tsx` | Trip list / signed-in home. |
| `/account/profile` | `src/app/account/profile/page.tsx` | Name, avatar, bio. |
| `/account/notifications` | `src/app/account/notifications/page.tsx` | Per-channel notification prefs. |
| `/trips/new` | `src/app/trips/new/page.tsx` | Create-trip flow (+ AI questionnaire). |
| `/invite/[token]` | `src/app/invite/[token]/page.tsx` | Invite preview / accept. |
| `/share/[token]` | `src/app/share/[token]/page.tsx` | Public read-only trip share. |

**Per-trip (`/trips/[id]/*`)** — shell = `src/app/trips/[id]/layout.tsx` → `TripShell`

| Path | File | Purpose |
|---|---|---|
| `/trips/[id]` | `…/page.tsx` | **Overview** — trip dashboard / action hub. |
| `/trips/[id]/itinerary` | `…/itinerary/page.tsx` | **Plan** — map-first itinerary (Mapbox + day list). |
| `/trips/[id]/expenses` | `…/expenses/page.tsx` | **Money** — expenses + budget. |
| `/trips/[id]/expenses/balances` | `…/expenses/balances/page.tsx` | Who-owes-who. |
| `/trips/[id]/expenses/breakdown` | `…/expenses/breakdown/page.tsx` | Category breakdown. |
| `/trips/[id]/expenses/transactions` | `…/expenses/transactions/page.tsx` | Transaction list. |
| `/trips/[id]/wallet` | `…/wallet/page.tsx` | **Bookings** — hotels/flights (`BookingsBoard`). |
| `/trips/[id]/pack` | `…/pack/page.tsx` | **Pack** — merged Docs + Packing (segmented `?view=docs|packing`). |
| `/trips/[id]/packing` | `…/packing/page.tsx` | **Redirect** → `/pack?view=packing`. |
| `/trips/[id]/documents` | `…/documents/page.tsx` | **Redirect** → `/pack?view=docs`. |
| `/trips/[id]/votes` | `…/votes/page.tsx` | **Votes** — standalone polls. |
| `/trips/[id]/chat` | `…/chat/page.tsx` | Chat (also a side panel in the shell). |
| `/trips/[id]/members` | `…/members/page.tsx` | Crew list (also a side panel). |
| `/trips/[id]/settings` | `…/settings/page.tsx` | Trip settings (owner). |
| `/trips/[id]/discover` | `…/discover/page.tsx` | **v2 scaffold** — standalone Discover preview (URL-only, not in nav). |

**API routes (`src/app/api/*`)**

| Group | Routes | Purpose |
|---|---|---|
| AI | `ai/plan`, `ai/detect-actions` | AI Plan wizard; chat smart-action detection. |
| Discover (v2) | `discover/{autocomplete,search,nearby,details,photo,events,profile}` | Server proxy to Google Places (New) + taste-event ingest + taste profile read. |
| Places (legacy) | `places/{search,details}` | Older place lookup (Foursquare-era). |
| Hotels | `hotels/search` | Bookings hotel search. |
| Trips | `trips/[id]/calendar.ics`, `trips/[id]/chat`, `trips/[id]/chat/read` | Calendar export; chat fetch/read-receipt. |
| Notifications/Push | `notifications`, `push/subscribe` | In-app inbox; web-push enrollment. |
| Cron | `cron/notif-digest`, `cron/pre-trip-nudge` | Scheduled digests + nudges. |
| Wallet/Internal/Health | `wallet/image`, `internal/backfill-trip-images`, `health` | Image proxy; image backfill; healthcheck. |

### 1.2 Per-trip navigation (the trip shell)

Shell component: `src/components/trips/trip-shell.tsx`. Three nav surfaces, all driven off the
same routes:

- **Desktop (`lg+`) — persistent left sidebar:** `src/components/trips/desktop-trip-sidebar.tsx`.
  Tabs in order: **Overview · Plan (itinerary) · Money (expenses) · Bookings (wallet) · Pack · Votes**,
  then secondary actions (**Chat**, **Trip settings/More**, **Share**, **Add to calendar**) and an
  account menu pinned bottom.
- **Mobile (`<sm`) — floating bottom nav (5 tabs):** `src/components/pwa/mobile-nav.tsx`.
  **Home · Plan · Money · Bookings (Wallet) · Pack.** Chat + Votes are *not* in the bottom nav.
- **Tablet (`sm`–`lg`) — top sub-nav tabs:** in `trip-shell.tsx` `NAV_TABS`:
  **Overview · Plan · Votes · Money · Pack** (+ Wallet/Bookings).
- **"More" sheet** (`src/components/trips/trip-more-sheet.tsx`), opened from the `⋯` header icon /
  sidebar: **Chat · Votes · Crew · Share**, "coming soon" (Photos/Docs/Calendar/Full map), and an
  owner zone (**Trip settings · Clear plan**).
- **Chat** + **Crew** also render as lazy side panels inside the shell (not just routes).

Note the nav order/contents differ slightly across the three surfaces (e.g. Votes sits mid-list on
tablet, is absent from mobile bottom nav, lives in More). v2 unifies this — see §2.

### 1.3 Dashboard + global nav

- Shell: `src/components/dashboard/dashboard-shell.tsx`.
- Desktop sidebar: `src/components/dashboard/desktop-dashboard-sidebar.tsx` — **Dashboard · New trip ·
  Blog · Notification settings** + account menu. Minimal (no destination inspiration yet).
- Mobile: top header (logo + bell + account) + main content.

### 1.4 Data model (`src/lib/db/schema.ts`), grouped by domain

| Domain | Tables |
|---|---|
| Trips / members | `trips`, `trip_members`, `trip_invites`, `profiles` |
| Itinerary | `itinerary_items` (+ legacy `fsq_*`/`photo_url`/`rating`/`price_level` and **v2 google cols**, see below) |
| Expenses / budget | `expenses`, `expense_splits` (+ per-member `personal_budget` on `trip_members`, `scope` enum on expenses) |
| Packing / docs | `packing_items`, `documents` |
| Chat / notifications | `chat_messages`, `message_reactions`, `notifications`, `push_subscriptions`, `comments` |
| Votes | `votes`, `vote_options`, `vote_responses` |
| Misc | `waitlist_signups` |
| **v2 Discovery (additive, present, unused by current UI)** | `cached_places`, `places_spend`, `place_events`, `taste_profiles`, `decisions` |

**v2 google cols already on `itinerary_items`:** `google_place_id`, `provider` (default `'manual'`),
`user_ratings_total`, `place_types` (jsonb), `address`. (Specced fields `dwell_min`, `sort_order`,
`start_time`, `status` partly exist already; `price_level`/`rating`/`photo_url` predate v2.)
**`chat_message_type` enum already includes `decision_card`** — wiring exists for the chat decision card.

### 1.5 Server actions (`src/lib/actions/*`)

| Domain | Files |
|---|---|
| Trips / settings / share | `trips.ts`, `trip-settings.ts`, `share.ts`, `ensure-trip-hero.ts` |
| Invites / members | `invite.ts`, `invite-accept.ts`, `member-stats.ts` |
| Itinerary | `itinerary.ts`, `geocode-items.ts` |
| Money | `expenses.ts`, `budget.ts`, `money-page-data.ts` |
| Bookings | `hotels.ts` |
| Pack | `documents.ts`, `packing.ts` |
| Chat / votes / smart | `chat.ts`, `votes.ts`, `smart-actions.ts` |
| AI | `ai-planner.ts` |
| Account / notif / i18n / misc | `profile.ts`, `notifications-prefs.ts`, `set-locale.ts`, `feedback.ts`, `waitlist.ts` |

### 1.6 Component folders + v2 engine libs

- Components: `account`, `affiliate`, `auth`, `blog`, `chat`, `dashboard`, **`discover`**, `documents`,
  `expenses`, `feedback`, `hotels`, `i18n`, `itinerary`, `landing`, `legal`, `map`, `members`,
  `notifications`, `pack`, `packing`, `pwa`, `trips`, `ui`, `votes`, `wallet`.
- **v2 scaffold components** (`src/components/discover/`): `discover-feed.tsx`, `place-card.tsx`,
  `place-detail-panel.tsx`, `powered-by-google.tsx` — built during Phase A/B as a **test scaffold**;
  roadmap rebuilds these to the canonical design-system versions.
- **v2 engine libs (keep & harden):** `src/lib/places/*` (Google New client, `cache`, `meter`,
  `features`, `types`), `src/lib/discovery/*` (`taste`, `score`, `rerank`, `ingest`, `flags`, and
  `client/{event-queue,rank-feed,use-dwell-tracker,use-taste-session}`).

---

## 2. v2 target navigation model

### 2.1 Top-level model (one sentence)

**Mobile = thumb-zone bottom nav + sheets; desktop = persistent left sidebar + side panels; per-trip
IA collapses to Overview · Plan (`Days | Discover`) · Money · Bookings · Pack · Chat (now the
decisions hub) — with Votes retired and Discover folded into Plan, not a route.** (design §5, logic §1/§6.)

### 2.2 Per-trip IA (target)

| Primary nav slot | Surface | Notes |
|---|---|---|
| Overview | Trip dashboard | Unchanged; later gains smart suggestions. |
| **Plan** | Itinerary canvas with **`Days \| Discover`** segmented control over one shared Mapbox map | Replaces today's single day-list. Discover is a *mode*, not a route. (logic §1, design §4.4) |
| Money | Expenses + budget | Keep as-is; light smart-split later. (planning §2) |
| Bookings | Hotels/flights (`wallet`) | Keep the flow; richer real hotel cards later. |
| Pack | Docs + Packing | Unchanged. |
| **Chat** | Trip chat — **now the decision hub** | Decision cards post inline; a **Decisions lens** (open-needs-your-vote) replaces the Votes tab, with a nav badge for *your* pending votes. (logic §6, build-spec B8) |

- **Mobile:** bottom nav stays thumb-zone; place detail = full-screen sheet; Add place = FAB →
  picker; Discover = vertical card stream over a map peek. (design §5)
- **Desktop:** persistent left sidebar; place detail = **right slide-over panel** (never a bottom
  sheet); Plan = full-bleed map + persistent left panel with the card grid. (design §4.2/§4.4/§5)
- **Decisions nav badge = decisions awaiting *your* vote** — drives participation. (build-spec B8)

### 2.3 Dashboard / global (target)

Largely unchanged short-term. Phase 6 adds **"destinations you'd love" / trip ideas** powered by the
durable taste vector across the user's trips (logic §13.2) — the retention flywheel.

---

## 3. Surface-by-surface transformation table

Verdict legend: **KEEP** (no structural change) · **CHANGE** (rebuilt in place) · **MERGE** (folded
into another surface) · **DIE** (retired) · **ADD** (new surface).

| Surface | Today | v2 target | Verdict | Doc ref |
|---|---|---|---|---|
| Landing / blog / legal / auth | Marketing + auth routes | Unchanged | KEEP | — |
| Dashboard | Trip list + minimal sidebar | + "trips you'd love" from durable taste (later) | KEEP → ADD (P6) | logic §13.2 |
| Trip Overview | Action hub | Unchanged; smart suggestions later | KEEP | planning §2 |
| **Plan / itinerary** | Single map + day list; **free-text "Add place"** | **`Days \| Discover`** modes on one Mapbox canvas; Add place = Google autocomplete | **CHANGE** | planning §2/§3/§4, logic §1, design §4.4, roadmap P1/P3 |
| Free-text "Add place" | Default add path | **Dies** as default; survives as rare "add manually" fallback; replaced by Google-backed search | **DIE** (→ ADD autocomplete) | planning §2/§4, roadmap S1.3 |
| **Discover** | `/trips/[id]/discover` standalone scaffold (URL-only) | Folded **into Plan** as the `Discover` mode; standalone route retired | **MERGE** | logic §1, roadmap S3.3 |
| **Votes** | `/trips/[id]/votes` standalone polls | **Retired** → "Decisions" lens over Chat; decision cards in chat | **DIE** (→ MERGE into Chat) | logic §6, build-spec B, roadmap P4 |
| Chat | Conversation only | **Decision hub** — decision cards + Decisions lens + badge | CHANGE | logic §6, build-spec B8 |
| Money / Expenses | Expenses + budget + sub-tabs | Keep core; add suggested-split / shared-meal + place-link + budget-aware discovery | KEEP (→ ADD smarts P6) | planning §2/§8, logic §7/§13.3 |
| Bookings (`wallet`) | Hotels/flights board | Keep flow; richer real hotel cards + taste warm-start; hotel = discovery anchor | KEEP (→ CHANGE cards P6) | planning §8, logic §8/§13.1 |
| Pack | Docs + Packing merged | Keep; smart context-based defaults | KEEP | logic §13.5 |
| Members / settings | Crew + owner settings | Unchanged | KEEP | — |
| AI Plan wizard | Text-wall output | Reframed: outputs **real addable place cards** across days | CHANGE | planning §2/§3.5, logic §11, roadmap P5 |

**Verdict counts:** KEEP **9** · CHANGE **4** (Plan, Chat, Bookings cards, AI wizard) · MERGE **2**
(Discover→Plan, Votes→Chat) · DIE **2** (Votes page, free-text Add place) · ADD **3** (autocomplete
add, Decisions lens / decision card, dashboard inspiration). *(Bookings and Money each count once
under their primary verdict; their "→ ADD/CHANGE later" notes are the Phase 6 follow-ons.)*

---

## 4. Data-model map

### 4.1 What exists today (current UI reads these)

`trips`, `trip_members`, `trip_invites`, `profiles`, `itinerary_items`, `votes`/`vote_options`/
`vote_responses`, `expenses`/`expense_splits`, `documents`, `packing_items`, `chat_messages`/
`message_reactions`, `notifications`/`push_subscriptions`, `comments`, `waitlist_signups`.

### 4.2 What v2 already added (present in schema, mostly unused by current UI)

| Object | Purpose | Spec |
|---|---|---|
| `cached_places` | Shared cross-user Google place cache (biggest cost lever) | planning §5.3, logic §5.1 |
| `places_spend` | Per-(day, SKU) spend ledger → kill-switch source of truth | planning §5.4, logic §10 |
| `place_events` | Raw in-session signal log feeding the taste engine | build-spec A1 |
| `taste_profiles` | Persisted durable taste vectors (per trip/user; null user = crew) | logic §2.1 |
| `decisions` | Chat-embedded vote (place + votes jsonb + status + chat_message_id) | logic §6, build-spec B |
| `itinerary_items.{google_place_id, provider, user_ratings_total, place_types, address}` | Google place data on items | planning §7 |
| `chat_message_type` enum value `decision_card` | The decision card message kind | build-spec B1 |

### 4.3 Still missing for Phases 2–4 (verify against specs before building)

- **Expense → place link:** specced `expenses.place_id` (logic §5.1/§7) — not present; expenses only
  link via `itinerary_item_id`. Needed for "✓ paid here" + the strongest taste signal.
- **Cache TTL field:** spec describes a `ttl` alongside `fetched_at`; current `cached_places` has only
  `fetched_at` (TTL applied in code). Confirm whether a column is wanted (logic §5.1).
- **Item v2 fields:** `dwell_min`, explicit `photo_ref` + cached-URL/TTL pair (logic §5.1) — partly
  covered by existing `photo_url`; reconcile naming.
- **`popularity_pref` / `price_pref` scalar axes** (build-spec A4) — live inside the `taste_profiles.vector`
  jsonb today; fine as jsonb, just confirm the engine writes them.
- **Decisions niceties:** `closes_at` exists; `no_quorum`/`cancelled` are string statuses (no enum) —
  acceptable, but verify the resolution logic (build-spec B4) writes them.
- **Offline cache (P6):** client-side IndexedDB / service-worker store for committed items — not a DB
  concern, but the offline plan (logic §9) is unbuilt.

---

## 5. New surfaces to build (mapped to roadmap phases)

| New surface | What | Phase | Doc ref |
|---|---|---|---|
| Real "Add place" autocomplete | Session-tokened Google Autocomplete → Details → pinned item; kills dead-text bug | **P1 (S1.3)** | planning §4, roadmap S1.3 |
| Canonical place primitives | `RatingPill`, `PriceLevel`, `TagChip`, `CategoryChips`, `SkeletonCard`, `EmptyState`, `PoweredByGoogle` | **P1 (S1.2)** | design §7, roadmap S1.2 |
| Signal engine + live re-rank | Full event taxonomy, honest dwell, scalar axes, rendered/upcoming buffers, exploration, cold-start | **P2** | build-spec A, roadmap P2 |
| **Discover feed** (canonical) | Feed-first card grid/stream, category-chip filters, live "getting warmer" re-rank | **P3 (S3.2)** | planning §3, design §4.1, roadmap S3.2 |
| **Place detail panel** (canonical) | Photo carousel, top reviews, hours, Maps link, accordion Add-to-day, attribution; desktop slide-over / mobile sheet | **P3 (S3.1)** | design §4.2, roadmap S3.1 |
| **Plan canvas `Days \| Discover`** | One Mapbox map + state shared across both modes; hover↔pin sync; retire standalone `/discover` | **P3 (S3.3)** | logic §1, design §4.4, roadmap S3.3 |
| **Unscheduled tray** | Holds passed-but-undated ("Any day") places; owner drags onto a day | **P4 (B5)** | build-spec B5, design §4.4 |
| **Decision card** (in chat) | Rich card: photo/name/rating/price + inline 👍/👎 + tally + countdown; open/passed/failed/no-quorum states | **P4 (S4.1–4.2)** | logic §6, build-spec B, design §4.3 |
| **Decisions lens** | Retired Votes tab → "Open (needs your vote)" filter over chat + nav badge | **P4 (S4.3)** | logic §6.4, build-spec B8 |
| AI "Plan this day" / wizard cards | Real-place sequence assembly; wizard emits addable cards | **P5** | logic §4/§11, roadmap P5 |
| Cross-app smart suggestions + offline | Expenses split smarts, Bookings hotel cards, dashboard inspiration, offline cache | **P6** | logic §13, planning §9.4 |

**Build order (roadmap):** P1 foundation/bug-fix → P2 engine → P3 Discover-in-Plan → P4 chat
decisions → P5 AI curation → P6 spread + offline.

---

## 6. Open questions / decisions needed

1. **Three nav surfaces disagree on contents.** Desktop sidebar shows Votes; mobile bottom nav omits
   it; tablet sub-nav lists it mid-row; More sheet also lists it. When Votes dies (P4), confirm the
   single replacement: a **Decisions** entry (lens over chat) — and where it lives in each of the
   three nav surfaces (sidebar slot? bottom-nav slot vs More sheet?). The docs specify a **nav badge**
   but not which nav bar owns it on mobile.
2. **Discover entry point in nav.** Plan gains a `Days | Discover` segmented control — but should
   Discover *also* have a top-level nav affordance (chip/icon) for discoverability, or is the segmented
   control the only entry? The standalone `/discover` route is being retired (S3.3); confirm no public
   URL survives.
3. **Expense → place link column.** Spec wants `expenses.place_id` (logic §5/§7) but the schema only
   has `itinerary_item_id`. Decide: add `place_id`, or bind via the planned `itinerary_item`'s
   `google_place_id`? This gates budget-aware discovery + the strongest taste signal.
4. **Two place-API stacks coexist.** `src/app/api/places/*` (legacy/Foursquare-era) and
   `src/app/api/discover/*` (Google New) both exist; `itinerary_items` still carries `fsq_*` columns.
   Decide retirement of the legacy places routes + fsq columns once Google autocomplete (S1.3) lands.
5. **Cache TTL representation.** `cached_places` has `fetched_at` only; specs reference a `ttl`. Keep
   TTL in code (constant) or add a column? Minor, but pin it before the cache hardens.
6. **AI Plan wizard reframe scope.** It currently produces text; logic §11 says it becomes the on-ramp
   to the discovery engine (real cards). Confirm whether the existing questionnaire UI stays verbatim
   (only output changes) or also gets a redesign pass in P5.
7. **Flag posture.** Build-directly is decided, but `isDiscoveryEnabled` remains as a rollout switch.
   Confirm whether v2 Plan/Chat surfaces ship behind it initially or go live unflagged for the
   bug-fix (S1.3) vs the larger Discover weave (P3).
