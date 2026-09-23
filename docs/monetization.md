# Sawia — monetization plan

**Written** 2026-09-24 · **Status** proposal, nothing built
**Decision taken going in:** planning stays free end-to-end; the paywall sits on
*depth*, not on any feature being unavailable.

---

## 1. The call, in one page

**Caps and Pro ship with the Play launch.** Not after it.

Two things that look like one thing, and must not be confused:

- **Caps are a cost guard.** Every AI plan is an Anthropic invoice; every cold
  city is $0.32 of Google. An uncapped free tier is an open wallet pointed at a
  public app store. One user with a script can create 200 trips and generate a
  plan for each. Caps ship even if the price is zero — they are an operational
  requirement, not a pricing decision, and they are enforced **server-side**.
- **Pricing is revenue.** This is the part that will be slow. At freemium's
  2–3% conversion, subscriptions do not pay for anything until ~50k MAU
  (§7). That is an argument for *also* doing affiliate, not an argument for
  launching without limits.

An earlier draft of this document merged those two and concluded "ship free,
instrument, price later". That was wrong. Instrumenting an unbounded meter in
public is how you find out what it costs by being billed for it.

The plan in order:

| Stage | When | What | What it earns |
|---|---|---|---|
| **0 — Caps + Pro** | **ships with the Play launch** | Hard server-side caps on every metered resource. Pro at SAR 99/yr raises them. | Small, but the bill is bounded |
| **1 — Affiliate** | ~launch + 4 weeks | Booking hand-off on hotels already in the trip. Paywalls nothing. | The first real money |
| **2 — Tune the caps** | continuously | Move the numbers to where real usage actually sits | Conversion |
| **3 — Crew** | only if group usage becomes real | One payer covers the crew | Higher ARPU |

Stage 3 may never happen, and that is a legitimate outcome — see §2.

Set the launch caps **generously but finitely**. A generous cap is a product
decision you can loosen next week; no cap is a liability you cannot take back
once people are relying on it.

---

## 2. Where Sawia actually is

Pulled from production (`jrlmtsgnchjghhgufjyh`) on 2026-09-24. This includes
the demo data (Marco/Rania, trips `…0001/0002/0003`) and Aws's own test trips,
so treat it as directional, not as a market signal.

| | |
|---|---|
| Registered users | **25** |
| Signed in within 30 days | **8** |
| Trips | **43** (8 created in the last 30 days) |
| Trips already finished | 33 |
| Average crew size | **1.49** |
| Trips with 1 member | **31** |
| Trips with 2 members | 7 |
| Trips with 3+ members | **5** (largest: 5 people) |
| Trips with ≥5 stops | 19 · average 18.3 stops |
| Trips with any expense | 19 |
| Trips with a packing list | 25 |
| Trips with a vote | **4** |
| Trips with sharing enabled | 7 |
| Stops sourced from Google | 184 of 513 |

### The one number that matters

**Average crew is 1.49, and only five trips in the product's entire history
have had three or more people in them.**

Sawia is positioned as "plan the trip, together". Right now it is being used as
a very good solo trip planner. That is not a failure — solo planning is a real
job and the product does it well, 18 stops a trip is genuine depth — but it
means:

- **Any per-seat or per-crew pricing is dead on arrival today.** There is no
  crew to charge for.
- **Voting must not be paywalled.** Four trips have ever used it. Putting a
  price on the least-used feature converts nobody and signals that the thing
  you charge for is the thing nobody wanted.
- **The features with real pull are packing (25 trips), money (19 trips), and
  itinerary depth (18.3 stops).** That is where a limit will actually be felt.

Before Stage 3, the question to answer is not "will they pay" but "will they
invite anyone".

---

## 3. What the competition charges

### Direct — trip planning

| Product | Model | Price | Free tier | Notes |
|---|---|---|---|---|
| **Wanderlog** | Freemium sub | **$39.99/yr** (annual only on their site; App Store listings vary $31.99–$59.99) | Generous — full collaborative planning | Pro = route optimisation, offline maps, unlimited attachments, inbox scanning. Closest analogue to Sawia. |
| **TripIt** | Freemium sub | **$49/yr**, 30-day trial | Itinerary from forwarded email | Pro = flight alerts, seat tracker, fare monitoring. Older, itinerary-not-planning. |
| **Pilot** | **Free, affiliate** | — | Everything | Earns from hotel bookings at private rates. Explicitly *not* sponsored placement. |
| **Polarsteps** | **Free, ad-free, physical goods** | Books €30–€80 | Everything | Journal, not planner. Revenue from printed travel books. |
| **Troupe** | Free | — | — | Group *destination voting* only. Narrow. |

### Adjacent — the money half of Sawia

| Product | Price | Free tier |
|---|---|---|
| **Splitwise** | **$4.99–$7.99/mo, ~$39.99–$59.99/yr** | 3–5 expenses/day, **10-second unskippable ads** |

Splitwise is the sharpest read in the table: they found that the way to
monetize a free utility is a **daily volume cap plus ads**, not feature
removal. Their Pro unlocks receipt scanning, currency conversion and charts —
all of which Sawia already gives away.

### What this tells us

1. **The price band is $39–$49/yr.** Nobody in this category sustains more.
2. **Everyone keeps core planning free.** No serious competitor gates the
   itinerary itself. The choice Aws already made matches the market.
3. **Two viable models, and they are not exclusive:** metered freemium
   (Wanderlog, Splitwise) and booking affiliate (Pilot). Sawia can run both,
   because the affiliate model paywalls nothing.
4. **Nobody is Arabic-first.** Every product above is an English product with,
   at best, a translation. This is Sawia's actual moat and it is not a pricing
   feature — it is a distribution feature.

---

## 4. What the market data says

### Freemium converts badly. Trials convert well. This matters.

| Model | Trial→paid (D35 median) |
|---|---|
| Freemium | **2.1–2.6%** |
| No-card opt-in trial | 18.2% |
| Card-gated opt-out trial | **48.8%** |

Travel apps are the *best* category for subscriptions — median trial→paid
**48.7%**, upper quartile 54.3% — but that is driven by card-gated trials taken
at the moment of booking, when the subscription pays for itself immediately.
Install→purchase across travel apps is **2.42%**.

Trials of 17–32 days convert at a median 42.5%. A 3-day trial sees 26%
cancellation; a 30-day trial sees 51% — but converts far more people overall.

**Read for Sawia:** having chosen freemium, expect **2–3%**, not 48%. That is
the honest planning number. Do not model revenue on the travel-category
headline; that headline belongs to apps that sell a discount at checkout.

### The Saudi payment picture is good

- Apple Pay is set up by **~36% of Saudi consumers** — among the highest in
  MENA.
- mada e-commerce is running **~SAR 29.86bn in a single month, +79% YoY**.
- 79% of Saudi consumers make purchases with digital wallets; subscription
  commerce is already normal across streaming, fitness and e-learning.

Recurring Apple Pay + mada billing is supported. There is no payments-rail
excuse not to charge in SAR.

### The market is large and growing

- Saudi online travel: **$5.8bn (2025) → $13.0bn (2034)**, 9.41% CAGR.
- Domestic tourism contributed **~SAR 176.6bn in 2025**; SAR 34.7bn in Q1 2026
  alone.
- Domestic travel was **46% of Almosafer bookings** Jan–Jul 2026, +13% YoY.

Domestic, multi-city, group-shaped travel inside Saudi is exactly the trip
Sawia was built around (Jeddah → Riyadh → Jeddah). The market is real.

### Store fees, as of the 2026 changes

Following the Epic settlement (announced 2026-03-04, effective 2026-06-30):

- **10%** service fee on the first $1M of annual revenue, *regardless of
  billing system*.
- **+5%** on top if you use Google Play billing → **~15% all-in** at your scale.
- Alternative billing cuts the service fee by **4 percentage points**.
- Above $1M: 20% new installs / 25% existing, or **15%** if you qualify for the
  Apps Experience Program.
- Apple: 15% under $1M via the Small Business Program.

⚠️ **Verify these in Play Console before modelling.** They changed twice this
year and the public write-ups disagree on details.

**Plan on keeping ~85% of gross.**

---

## 5. Unit economics — what a trip actually costs

Read from the code, not estimated.

### Google Places

`LIST_MASK` in `src/lib/places/google.ts` requests `rating`,
`userRatingCount`, `priceLevel` and `photos` — those push Nearby Search into
the **Pro** tier. `DETAIL_MASK` adds `reviews` and `editorialSummary`, which is
**Enterprise + Atmosphere**.

| SKU | Tier we hit | Rate |
|---|---|---|
| Nearby Search | Pro | **$32 / 1,000** |
| Place Details | Enterprise + Atmosphere | **$25 / 1,000** |

`IDEA_BUCKETS` in `src/lib/places/facts.ts` is **9 buckets**, each one Nearby
Search call, plus a text-search anchor for the "must-see" row. So:

> **~10 Nearby Search calls ≈ $0.32 per city refresh.**
> `IDEAS_STALE_DAYS = 7`, so an actively-browsed city refreshes weekly.

### The thing that saves the whole model

**`city_ideas` is keyed by `base_id` — the city — not by trip or user.** One
refresh of Riyadh serves every user planning Riyadh, for a week.

This means **discovery COGS scales with cities covered, not with users.** A
hundred users planning Jeddah cost the same as one. The marginal cost of a new
Saudi user is close to zero once the Saudi cities are warm.

Current state: **4 cities cached** (1 fresh), against **22 distinct bases** and
29 distinct destinations. Most cities have never been warmed.

**Implication:** an Arabic-first, Gulf-first strategy is not just a marketing
position — it is the cheapest possible cost structure. A generous free tier is
affordable precisely because Sawia's users concentrate in a small set of
cities. Going global city-by-city is what would make it expensive.

### Claude

All the hot paths are on **Haiku 4.5** — OCR, confirmation parsing, inspiration
parsing, taste tagging, budget watching, nudges. Only `/api/ai/plan` reaches
for **Sonnet 5**, and only for final assembly.

That is already the right shape. The journey wizard is the only per-use cost
worth metering; everything else is background noise.

### Rough per-trip COGS (planning-heavy trip, 2 cities, 4 weeks)

| Line | Estimate |
|---|---|
| City refreshes (2 cities × 4 weeks, amortised across all users of those cities) | **$0.05–$2.56** depending on how many users share the city |
| Place Details on opened cards (~40) | ~$1.00 |
| Place Photos | not measured — **instrument this** |
| AI planner run (Sonnet 5 assembly) | cents |
| Supabase / Vercel | negligible at this scale |

**Ceiling for a heavy solo user in a cold city: roughly $3–4 a trip.** In a warm
city with sharing: cents.

A $25/yr net subscription covers a heavy user doing ~6 cold-city trips a year.
It does not cover someone planning 20 cold cities. **That is the shape of the
limit you should meter.**

---

## 6. The recommended model

### Free — every feature, bounded volume

No feature is removed. Someone must be able to plan Jeddah → Riyadh → Jeddah
end to end, with the crew, and never see a price — but not two hundred times.

Unrestricted on free, with no cap at all:

- The full itinerary, the Horizon, all four phases
- **Money in full** — expenses, splits, multi-currency, settle-up
- **Votes in full** — Huddle, decisions, crew match
- Packing, Pocket Day offline for the active trip
- Sharing and inviting the crew, any crew size
- **No ads, ever**

Splitwise's ads are the most complained-about thing in that category. That is a
gift to a competitor, not a model to copy.

### The caps — these ship at launch

| Metered resource | Free | Pro | Why it is capped |
|---|---|---|---|
| **AI journey plans** | **3 / month** | 30 / month | Sonnet 5 per run. The single most abusable call in the app. |
| **Receipt scans (OCR)** | **10 / month** | 200 / month | Haiku + image storage per scan. |
| **Active trips** (start date today or later) | **3** | 25 | Past trips do not count and are never deleted. Stops the 200-trip case dead. |
| **Cities per trip** | **5** | 15 | Each new cold city is a $0.32 Places refresh. |
| **On-demand Discover refresh** | ✗ (7-day cache only) | 5 / day | Directly the $32/1,000 SKU. |
| **Document storage** | **100 MB** | 5 GB | Supabase storage. |
| **Offline packs** | active trip | all trips | Storage. |
| **Trip archive** | last 12 months browsable | forever | 33 of 43 trips are already past. |
| **Wrap export** | view | PDF + photo book | Polarsteps proved people pay for the artifact. |

Pro is **not unlimited** on anything metered. "Unlimited" against a
usage-priced upstream is a promise you cannot keep — one scripted Pro account
at SAR 99/yr can outspend its own subscription in an afternoon. Pro buys a
bigger number, and the number is still a number.

Every cap above is **volume on something that costs Sawia money**. None is a
feature removed and sold back. That distinction is the brand — the studio page
says "no dark patterns, no engagement traps", and this table has to survive
that sentence. It does: a free user can plan three real trips a month with the
whole product, which is more travel than almost anyone does.

### Abuse controls — separate from tiers, apply to everyone

Tier caps stop a heavy user. They do not stop an attacker, and they do not stop
a bug in your own client looping a request. These are independent:

| Control | Where |
|---|---|
| Per-user rate limit on every AI route (e.g. 10/hour) regardless of tier | `src/app/api/ai/*` |
| Per-IP rate limit on unauthenticated routes | middleware |
| Hard monthly spend ceiling on the Anthropic key, alerting before it | Anthropic console |
| Budget alert + quota cap on the Google Maps key | Google Cloud console |
| Per-account trip-creation throttle (e.g. 10/hour) | server action |
| Enforcement **server-side only** — never a disabled button | all of the above |

The Anthropic and Google console limits are the real backstop: they are the
only two that hold if the application logic has a hole in it. Set them before
the store listing goes public, not after the first bill.

### What NOT to paywall — explicitly

- ❌ **Votes / Huddle.** 4 trips have used it. Pricing it converts nobody.
- ❌ **Crew size.** 31 of 43 trips are solo. Capping crew when the problem is
  that nobody invites anyone is exactly backwards — if anything, *pay people*
  in free Pro months for bringing a crew.
- ❌ **Expense splitting.** This is the Splitwise wedge. Free splitting with no
  ads and no daily cap is a reason to switch.
- ❌ **Arabic, RTL, or any localisation.** Obviously, but worth writing down.
- ❌ **Ads.** Not at any tier.

---

## 7. Pricing

Anchored to the $39–49/yr band, positioned *below* it, priced locally.

| | KSA / Gulf | International |
|---|---|---|
| Monthly | **SAR 14.99** | **$4.99** |
| Annual | **SAR 99** (~$26, 45% off monthly) | **$29.99** |
| Lifetime (launch only, capped) | **SAR 299** | **$79** |

Reasoning:

- **SAR 99/yr undercuts Wanderlog ($39.99 ≈ SAR 150) by a third** while being
  the only Arabic-first option. Price is not the reason to choose Sawia; it
  should not be the reason to reject it either.
- **Annual is the default offer.** Travel is seasonal; monthly churns after one
  trip. Push annual hard and expect most revenue from it.
- **Lifetime, capped and launch-only,** buys early cash and — more useful —
  buys a cohort of committed users who will tell you what is wrong. Cap it at
  200 so it does not become a liability.
- **No trial on Pro.** With everything genuinely free, a trial is meaningless.
  The upsell fires at the limit, in context ("you've used your 3 plans this
  month"), which is the moment intent is highest.

### Honest revenue model

At freemium's 2–3% conversion, 85% net:

| MAU | Payers (2.5%) | Gross (SAR 99 blend) | Net / yr |
|---|---|---|---|
| 500 | 13 | SAR 1,287 | **~SAR 1,094** |
| 5,000 | 125 | SAR 12,375 | **~SAR 10,519** |
| 50,000 | 1,250 | SAR 123,750 | **~SAR 105,188** |

**Subscriptions do not pay for anything until ~50k MAU.** This is the reason
Stage 1 exists.

---

## 8. Stage 1 — affiliate, the part that actually earns early

Booking.com's affiliate programme pays **4% of a completed accommodation stay**
(6% car rental, 4% attractions, ~£2/€2 per flight), or framed the other way,
**25–40% of Booking's own commission** depending on monthly volume tier. 30-day
cookie.

Sawia already has `BookingAnchors` — it already knows the trip needs a hotel in
Jeddah for five nights and then Riyadh.

| | |
|---|---|
| Saudi domestic trip, hotel spend | SAR 2,000–6,000 |
| At 4% | **SAR 80–240 per converting trip** |

**One converted booking is worth 1–2.5 years of Pro.** Even at a 10% attach
rate this dominates subscription revenue for the next two years.

Three conditions, and they are not negotiable given the brand:

1. **No sponsored placement.** Pilot's line — "earns from hotels, not from
   sponsored placement" — is the model. The ranking must not change because of
   commission.
2. **Disclosed.** In Arabic and English, in the UI, not buried in terms.
3. **Real-world goods, so no store IAP requirement.** Hotel bookings are not
   digital goods; affiliate links are permitted. Verify against current Play
   and App Store policy text before shipping.

Risk: it makes Sawia partly dependent on an aggregator, and Booking's affiliate
approval needs volume. Treat it as a second line, not the strategy.

---

## 9. Stage 0 — instrument alongside the caps, not instead of them

The caps ship regardless. These events ship with them, so the cap *numbers* can
be moved to where real usage sits instead of where this document guessed.

**The three questions the numbers depend on:**

1. **Does anyone invite anyone?** `crew_invite_sent`, `crew_invite_accepted`,
   trip crew size at day 7 / day 30. If crew stays at 1.49, Stage 3 is dead and
   the positioning needs revisiting before the pricing does.
2. **Which cap actually bites?** Count, per user per month: AI plans run, OCR
   scans, active trips, cities per trip, cold-city refreshes, storage used.
   **If fewer than ~10% of active users hit a given cap, that cap converts
   nobody** — it is still doing its job as a cost guard, but it is not the
   upsell. Find the one that does and tune it; loosen the rest.
3. **What does a trip cost us?** Log the Places SKU tier and call count per
   trip and per city, and the Photo SKU that is currently unmeasured. The
   free-tier generosity above is only affordable if the city-cache sharing
   holds at scale.

**Also worth having before launch:** `paywall_seen` / `paywall_dismissed` with
the trigger name, so the first pricing test measures the right surface.

---

## 10. Risks

| Risk | Severity | Note |
|---|---|---|
| **The group premise is unproven** | **High** | 1.49 crew. Everything about "Sawia Crew" and per-seat pricing depends on this moving. It may not. |
| Sample size | High | 25 users, 8 active, demo data included. Every conclusion here is a hypothesis. |
| Places cost if users spread across cities | Medium | The cheap free tier depends on city-cache sharing. A global user base breaks it. |
| Store fee rules shifting again | Medium | They moved twice in 2026. Re-check before modelling. |
| Booking affiliate approval | Medium | Needs volume; may not be available at launch scale. |
| Wanderlog ships Arabic | Low–Medium | Would remove the moat. Unlikely to be done well, but it is the thing to watch. |
| **Launching uncapped** | **Critical** | A public store listing over an uncapped Sonnet route and a $32/1,000 Places SKU. One scripted account, or one client-side retry loop, and the bill is unbounded. This is the only item here that can end the project in a weekend. |
| Caps set too tight | Medium | Recoverable — loosen them. The asymmetry with the row above is the whole argument for shipping generous-but-finite. |

---

## 11. What to do next, concretely

1. **Before the store listing is public** — non-negotiable:
   - Hard spend ceiling + alert on the Anthropic key.
   - Budget alert + quota cap on the Google Maps key.
   - Server-side per-user rate limits on `/api/ai/*`.
2. **With the Play launch:** the cap table in §6, enforced server-side, plus
   Pro at SAR 99/yr raising them. Annual-first, no trial, upsell fires at the
   cap with the reason named.
3. **Also with the launch:** the §9 events, so the cap numbers can move to
   where real usage is.
4. **Launch + 2 weeks:** read the crew-invite numbers. That answers whether
   Sawia is a group product or a very good solo planner — and the answer
   changes the positioning, not just the price.
5. **Launch + 4 weeks:** if trips with real hotel gaps are common, start the
   Booking affiliate application.
6. **Continuously:** tune the caps toward the one that converts; loosen the
   ones that only ever annoy.
7. **Revisit this document** rather than following it. Every number in §2 will
   be wrong within a month of launch, and the recommendations are downstream
   of those numbers.

---

## Sources

- [Wanderlog Pro cost 2026](https://monkeyeatingmango.com/blog/wanderlog-pricing-2026/) · [Wanderlog pricing breakdown](https://tripstone.app/blog/wanderlog-pro-cost)
- [TripIt Pro cost 2026](https://monkeyeatingmango.com/blog/tripit-pricing-2026/) · [TripIt review 2026](https://www.going.com/guides/tripit-review)
- [Splitwise free vs Pro 2026](https://www.areweeven.com/blog/splitwise-free-vs-pro-2026) · [Splitwise free limits](https://splittyapp.com/learn/splitwise-free-limits/) · [Splitwise pricing 2026](https://getfinny.app/blog/splitwise-pricing-2026)
- [Best group trip planner apps 2026](https://swipesights.com/blog/best-group-trip-planner-apps) · [Pilot vs Polarsteps](https://www.pilotplans.com/compare/polarsteps-alternative-feature-comparison) · [Polarsteps business model](https://vizologi.com/business-strategy-canvas/polarsteps-business-model-canvas/)
- [RevenueCat — State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps) · [App subscription trial benchmarks 2026](https://www.businessofapps.com/data/app-subscription-trial-benchmarks/) · [Free trial conversion benchmarks by model](https://vmobify.com/blog/free-trial-conversion-rate) · [iOS free-to-paid benchmarks 2026](https://appsops.store/blog/ios-free-to-paid-conversion-benchmarks-2026)
- [Saudi online travel market forecast](https://www.imarcgroup.com/saudi-arabia-online-travel-market) · [Saudi tourism statistics 2026](https://thesauditimes.net/en/saudi-tourism-statistics-2026-40-key-numbers-revealed/) · [Almosafer 2026 Saudi travel trends](https://saudishopper.com.sa/en/saudi-travel-trends-almosafer-2026-report/)
- [Apple Pay + mada recurring payments](https://blog.noonpayments.com/blog/apple-pay-mada-recurring-payments/) · [Payments in Saudi Arabia](https://www.checkout.com/blog/mastering-payments-saudi-arabia)
- [Google Play service fees](https://support.google.com/googleplay/android-developer/answer/112622?hl=en) · [Play 2026 fee changes](https://taylancetech.com/blog/google-play-2026-changes-app-store-fees-third-party-stores) · [Play subscription fees — the real math](https://pricepush.app/blog/google-play-subscription-fees-2026-real-math)
- [Booking.com affiliate rates and terms 2026](https://affiliatejob.org/programs/booking) · [Booking.com affiliate teardown 2026](https://track360.io/blog/booking-com-affiliate-partner-program-operator-teardown-2026)
- [Google Places API pricing 2026](https://www.woosmap.com/blog/google-places-api-pricing) · [Google Maps Platform pricing list](https://developers.google.com/maps/billing-and-pricing/pricing)

Production figures: Supabase `jrlmtsgnchjghhgufjyh`, queried 2026-09-24.
COGS figures: `src/lib/places/google.ts`, `src/lib/places/facts.ts`.
