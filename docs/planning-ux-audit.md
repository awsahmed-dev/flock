# Planning UX audit — zero → filled (2026-09-15)

Fresh-eye walk on prod (paxawa.com), QA account, 440×956 mobile, Arabic. Created a real trip
("Tbilisi"), ran the AI wizard end-to-end twice, added 34 items, exercised both manual paths.
Screenshots: session scratchpad `audit/01–22`. Test trip left in place for retesting:
`d84a6a6d-5185-4910-bbf8-9d91bf8ee73f` ("Tbilisi International Airport Trip", QA account).

## The core diagnosis

**Planning has no home.** Living the trip has a home (اليوم), money has a home (المصاريف),
discovery has a home (بالقرب) — but planning, the single most important pre-trip activity, is
an *option inside an add-to-day sheet*: «أضف» → «خطة ذكية» → «خطّط للرحلة كاملة» → then a 4-step
wizard, all inside a narrow sheet stacked over the plan. Three taps deep, labeled like a day-level
utility, for the feature that builds the whole trip. Manual planning is likewise an add-sheet
option. The user's mental model ("I have an empty trip, help me plan it") has no screen that
answers it.

## BROKEN (ranked by consequence)

### B1 · The empty plan's planning CTA exists but never renders
On a fresh trip, الخطة shows day chips + «لا عناصر · لا شيء مخطط لهذا اليوم بعد» and *nothing
else*. Measured: a primary «خطة ذكية» button exists in the DOM with **width 0 / height 0**
(hidden), on both the default view and «الكل». The one affordance designed to rescue the empty
state is invisible. This is why planning feels undiscoverable — it literally is.

### B2 · A new trip drops you into live mode, not planning
Date presets («أسبوع» etc.) start **today**, so the trip is instantly "started" and post-create
lands on اليوم: a map of the destination (in our run: an airport tarmac), a «يوم حر — انطلق»
ticket, planning nowhere on screen. The moment of highest planning intent (just created a trip)
is answered with live-day UI. Cause chain: default dates → tripPhase=live → cockpit route.

### B3 · Closing the wizard destroys a completed AI generation
Generated a full 7-day/34-place plan (≈75s of AI work), closed the panel, reopened: everything
gone, back to step 1. No draft, no "resume". A user who peeks at their plan tab mid-wizard pays
with the whole generation. (Reproduced: run 1 lost, run 2 needed from scratch.)

### B4 · Destination autocomplete prefers airports; the name inherits the junk
Typing "Tbilisi", the top suggestion was **Tbilisi International Airport**; the trip auto-named
"Tbilisi International Airport Trip" and the wizard header reads «خطة ذكية لوجهة Tbilisi
International Airport، تبلّيسي». The AI then quietly plans the city anyway — UI says airport,
plan says city. Filter autocomplete to (cities), derive the name from the locality.

### B5 · «يحدث الآن» points at the wrong item
At 18:02, the 09:30 item (already 8.5h past) was flagged «يحدث الآن» while 19:00 sat as «التالي».
Honesty failure in the now-marker logic — first item of the day is not "now" all day.

## OVERWHELM (the feeling you reported, located)

### O1 · Wizard step 2 is ~14 decisions on one screen
Pace (3) + daily spend (3) + dietary (4) + must-see textarea + avoid textarea + arrival airport +
departure airport, then رجوع/اقترح. Step 1 is 7 decisions (6 vibes + interests). The wizard asks
~21 things before showing any value. Nothing is marked as skippable except by reading fine print;
defaults exist but aren't presented as "just continue".

### O2 · Step 4 stacks three add-CTAs and 34 pre-checked items
Per city: «أضف كل أماكن هذه المدينة»، «أضِف اليوم (5)»، «أضف 34 إلى الخطة» all visible together,
plus per-item checkboxes, day tabs, and a map. Three overlapping grains of the same verb. The
90% case (accept the plan) should be one button; per-item curation is the exception.

### O3 · The whole experience happens in a stacked sheet
Trip-wide planning renders inside the day-add sheet's panel over the itinerary. Progress ("step 2
of 4") competes with the day chips, the bottom nav, and the sheet chrome. A full-screen planning
surface would halve the perceived noise with zero feature change.

### O4 · Manual add defaults to the heavy form
«أضف يدويًا» opens 7 fields (title, type ×5, time, location, cost, booking link, notes) for what
is usually "write a note on Tuesday". «أضف مكانًا» (search-first) is the better default and
already exists — the two should be one sheet: search → pick or free-text → optional details
collapsed.

### O5 · Long trips multiply everything
Your KSA run: 4 cities / 32 days. Step 4 then means 32 day-tabs and 150+ pre-checked places.
The wizard has no "plan the first city now, the rest later" release valve.

## POLISH (worth fixing while in there)

- Plus-codes leak as addresses: «MRX8+3H8، تبلّيسي» as item subtitles.
- Dietary chips render in English (halal/vegetarian/vegan/gluten-free) inside Arabic UI.
- Route step: travel-hop select («طيران ▾») looks like static text until tapped.
- Empty itinerary day chips show no affordance difference from filled ones (·5 dots only).

## Recommendation — smallest structural change that fixes the causes

1. **Give planning a front door.** Empty الخطة = a real launcher: three big cards —
   «خطة ذكية» (wizard), «أضفها بنفسي» (search-first add), «من ريلز» (import). Fixes B1 by
   replacing the broken hidden CTA with the screen's actual purpose. The add-sheet keeps only
   day-level quick actions.
2. **Planning mode until the trip starts.** Default date presets to start next week; and for any
   not-yet-started trip, land on الخطة (pre-start overview) instead of اليوم. Fixes B2.
3. **Wizard: 2 screens, not 4-with-21-questions.** Screen A = vibe + pace (2 decisions, big
   chips, «التالي» always enabled with defaults). Everything else (diet, must-see, avoid,
   airports, spend) collapses under «تفضيلات إضافية». Screen B = route → journey as today.
   Cuts required decisions from ~21 to ~2 without removing any power.
4. **Step 4: one primary CTA.** «أضف الخطة كاملة (34)» as the single sticky button; «تخصيص»
   toggles per-item checkboxes. Day/city partial-adds live behind the customize mode.
5. **Persist the draft.** Keep the assembled result server-side (or sessionStorage minimum) keyed
   by trip; reopening the wizard offers «أكمل خطتك المقترحة». Fixes B3.
6. **Autocomplete (cities) + clean naming.** Fixes B4 and the downstream header/name junk.
7. Fix the «يحدث الآن» marker window (B5), map plus-codes → locality names, translate dietary
   chips.

Items 1, 2, 6, 7 are small, independent fixes. 3–5 are one focused pass on
`ai-planner-panel.tsx`. Nothing here needs new backend capability.

---

# Part 2 — The concept roundtable (2026-09-15)

Three fresh-eye agents interrogated "why would a user use planning at all", from user POV only:
a traveler-personas simulator (المنظّم / the lazy member / the picky one / first-time family
organizer), a hostile skeptic (alternatives, abandonment, when the package idea is wrong), and a
first-principles strategist (minimum inputs, show-then-shape, group mechanics). Full outputs in
the session transcript; synthesis below.

## Where all voices converged

1. **The package hypothesis is right — but for a deeper reason.** Users don't want a package
   because they love packages; they want it because *reacting to a concrete plan is the only way
   a group actually decides*. The real enemy is group indecision (six weeks of «يلا نخطط» with
   zero decisions), and a ready plan is the fastest indecision-killer.
2. **Nobody wants questions; reacting IS the input.** All four personas reject a 21-decision
   wizard; swap/veto/pin reactions are both easier and *more accurate* than forms, because they
   collect real preferences instead of one person's guesses.
3. **The one-thumb problem is fatal to the current design.** The wizard asks ONE person to
   answer pace/diet/budget *for the whole group*, then bypasses the app's own voting feature.
   The flagship AI flow is a solo product bolted onto a group app.
4. **The group's own saves are the trust engine.** The modal Gulf group arrives with 40 saved
   reels. A package built from THEIR saves («من ريل سالم») first, strangers' picks second, flips
   the AI from author to assembler — the only trust posture skeptics accept.
5. **Trust is destroyed by deal-breakers, not built by delights.** One non-halal suggestion, one
   closed venue, one top-10-TripAdvisor smell poisons all 34 items. Verify constraints (halal
   badges with evidence, live open-hours, «قريب من بعض», prices in their tier) before polishing
   anything else.
6. **The finish line is «shared and reacted to», not «generated».** The share-to-group artifact
   (cover, cost per person, reaction buttons) IS the product — and the organizer's real job is
   looking good in the group chat.

## The situations map (skeptic) — "package" means five things

| Situation | What the package must be |
|---|---|
| Arriving with nothing (rare) | authored starting point — the only case today's wizard serves |
| Arriving with 40 saved reels (modal case) | «رتّب محفوظاتنا» — their content clustered into days, gaps filled |
| Dates + flights only | skeleton around fixed anchors |
| Umrah / anchored trips | evenings-and-gaps only; full-day plans are wrong |
| Mid-trip 6pm («وش الحين؟») | next-4-hours, near-me, from what's left — highest-value moment, wizard can't even open here |

## The emerging concept — «الباقة» (show-then-shape)

- Minimum input = what the trip already knows (destination + dates). Zero gate questions; one
  optional budget chip (اقتصادي/متوسط/فخم) ON the results, not before them.
- «جهّز لي باقة» → first content in <15s (stream day 1), full package <60s. جاهزة is a latency promise.
- Six reaction verbs replace seven questions: بدّل / احذف / ثبّت / خفّف·كثّف / غيّر جو اليوم /
  أضف من محفوظاتنا. Preferences become inferences from edits.
- Group mechanic: **organizer drafts → crew reacts (🔥/🙂/تجاوز + «لازم نروح», ideally from the
  share link pre-signup) → contested slots auto-become 24h Paxawa votes → «اعتمدوها»**. Flat
  democracy rejected (mush); whole-package voting rejected (wrong granularity).
- Saves-first seeding with provenance badges; the plan stays editable after adoption (verbs
  persist into the itinerary — which also serves the mid-trip moment).

## Honest remaining walls

(i) AI quality with zero questions is now load-bearing — needs a quality bar + eval before
shipping; (ii) organizer still arbitrates contested slots (fatigue); (iii) crew apathy — if
nobody reacts it degrades to today's solo flow; link-reactions are the mitigation.

## Open decisions (founder's call)

1. Quality bar: can zero-question defaults produce a package worth the word «جاهزة»? What's the
   eval before shipping?
2. Reactions without installing: build pre-auth reactions on the share link (infra decision that
   makes or breaks the group mechanic)?
3. One streamed package vs 2–3 titled options (رحلة الأسواق / رحلة الطبيعة)? Options feed voting
   but triple latency/cost.
4. Sequencing: ship «رتّب محفوظاتنا» (saves-first arrangement) before or together with the
   authored package?

---

# Part 3 — Founder verdicts + roundtable round 2 → the decided concept (2026-09-15)

Founder verdicts: (1) canonical-first packages (Japan → Tokyo–Kyoto–Osaka instantly; add or
customize; optional "write your things" path); (2) owner edits, members contribute links + short
reactions; (3) solo must be first-class (hide group features); (4) arranging members' link-dumps
is the core job. Radical license granted (beta): kill/merge features freely.

## Verdicts after critique

**1. Canonical-first — CONFIRMED, with three bindings:**
- **Label it.** «المسار الكلاسيكي — أغلب الرحلات الأولى تمشي عليه» reads as honest institutional
  knowledge; the same route presented as "your AI plan" reads as generic slop. Canonical is
  trustworthy only when it says it's canonical.
- **Canon = skeleton, personal = flesh.** Cities/nights/structure are canonical; the venues
  inside each day are seeded from the group's saves (provenance badges) + taste pool. Precedence
  is dynamic: saves >~40% of slots → flip the frame to "built from your saves". One save in the
  group = arrangement mode, not famous-route mode.
- **Tiered honesty for the long tail.** Tier 1 (~15–50 Gulf-volume destinations): hand-curated,
  the only tier allowed to say «جاهزة» — an ops commitment, not an AI feature. Tier 2: generated
  once → reviewed → cached (user never watches generation). Tier 3: no package claim; free-text
  path + discover seeding. Never fake a canon for Tbilisi.
- Constraint chips ON the package («حلال فقط» / «مع أطفال») that visibly re-filter in place —
  the picky persona needs to see the package obey her once, not fill a form.
- «أبي أكتب شروطي» = ONE screen (free text + budget/pace chips) feeding the same renderer.
  If it regrows into steps, we rebuilt what we killed.

**2. Owner/members roles — CONFIRMED, with the participation loop hardened:**
- Members' links get **visible fate**: resolved place + status («في اليوم ٣» / «مكرر» /
  «مغلق — استبدلناه») + avatar credit («من ريل سارة») + a ping when it lands. Without fate,
  members contribute exactly twice — once to try, once to check.
- One escalation valve: «اقترح مكان» → owner's tray (not the plan). Plus a «⚠️ ما يناسبنا»
  flag distinct from a dislike — the picky member is the group's quality gate; give her the role.
- Reactions must have consequence (a thrice-vetoed place can't silently stay) or participation
  is decorative.
- **Shortest reaction pass (adopted design):** one screen, day-level cards, 🙂 pre-selected —
  a happy member submits with ONE tap; deviations cost one tap each (🔥/تجاوز); long-press a
  thumbnail for per-place veto. 1–6 taps total; works from the share link pre-signup.
  (Rejected: per-place swipe deck — 25 gestures.)

**3. Solo — AMENDED by unanimous roundtable override:** solo is not a mode to choose; it's
**every trip's starting state**. Group chrome (crew tab, reactions, votes, split, «اعرضها على
الربع») is dormant at member-count = 1 and materializes when a second member joins by link.
No upfront «لحالي/مع الربع» question, no fork, no migration wall ("I planned solo, friends want
in — do I remake the trip?"), and inviting becomes the growth loop. Founder's goal (solo feels
first-class) achieved with one gating rule.

**4. Arrange-imports — CONFIRMED as the moat.** «رتّبها لي» on the saves tray: merge into the
canonical skeleton with visible triage reasons («أُضيف لليوم ٢ — قريب من فندقكم»). Rejection
reasons are trust-builders. Canonical packages are copyable; sequencing THIS group's chaos isn't.

## The final flow (8 beats)

1. Create trip: destination + dates (autocomplete = cities). No solo/group question.
2. **Instant canonical باقة** (tier-labeled): cover, day cards, real places, cost/person.
   Buttons: «اعتمدها» / «خصّصها» / quiet «أبي أكتب شروطي».
3. Saves auto-merge with badges; unplaced → «مقترحاتكم» tray + «رتّبها لي».
4. Owner shapes via six verbs (بدّل، احذف، ثبّت، خفّف/كثّف، غيّر الجو، أضف من المحفوظات).
5. «اعرضها على الربع» (appears only at n>1) — share link works pre-signup.
6. Reaction pass: day cards, 🙂 default, 1–6 taps.
7. Resolve & adopt: contested slots → owner one-tap alternatives → optional 24h vote → «اعتمدوها».
8. Living package: verbs persist in-trip; same surface serves «وش الحين؟» mid-trip.

## Kill list (approved direction)

| Kill | Replaced by |
|---|---|
| 4-step AI wizard (entire code path) | Beat 2 + one-screen «أبي أكتب شروطي» |
| «خطة ذكية → ليوم واحد/كاملة» chooser | Gone; day-level verbs cover it |
| أضف-sheet's 5 planning options | 2: «أضف مكان» (search+URL paste in one field) & «أضف من المحفوظات» |
| Dual manual forms (مكانًا/يدويًا) | One type-ahead card: matches a real place or saves free text |
| Group UI at member-count = 1 | Dormant layer, wakes on join |

## Still open (founder)

1. **Canonical ops**: who curates Tier-1 packages and keeps them fresh (closures, seasons,
   Ramadan variants)? Standing commitment required.
2. **Reaction pass skippable?** Lean: skippable with a "who hasn't reacted" nudge.
3. **Solo as the acquisition wedge**: does the باقة need a public «أنا رايح — من معي؟» share
   artifact as the solo→group growth loop?

---

# Part 4 — The unified system: capture → tray → package → react → live (2026-09-15)

Round 3 scope (founder): where does AI live post-wizard; Discover's why + the 30-day-chips add
wall; TikTok-as-search-engine + native share-to-Paxawa with multi-trip routing.

## The unanimous model — «المحفوظات» saves layer

One object (the place card), one motion (capture → fate). Discover, TikTok share, paste-link,
manual search, and members' links are FEEDERS with different discovery costs; none of them
schedules. The plan PULLS: canonical package at render, «رتّبها لي» in batch, day-suggestion
toasts one by one. Save-time and plan-time are permanently divorced — the 30-chip wall was the
app forcing arrangement at collection time.

```
FEEDERS                          SAVES LAYER                     PLAN (pull-only)
Discover (search-first) ─┐
TikTok/IG share-sheet ───┤→ trip-match? ─yes→ tray الرحلة ─┐
Paste-link / search ─────┤        │no                      ├ canonical باقة (skeleton)
Members' links ──────────┘        └→ «محفوظاتي» global     ├ «رتّبها لي» (THE visible AI verb)
                                     inbox → trip genesis: ├ day-suggest toast («قريب من يوم ٥ — نحطه؟»)
                                     «٧ أماكن باليابان —   └ owner verbs → adopted → live trip
                                     نسوي رحلة؟»                («وش الحين؟» pulls unvisited)
```

Three honest cracks + fixes: (1) hoarder tray-rot → the plan must keep pulling (nudges, رتّبها,
mid-trip resurfacing «أنت قريب من مكان حفظته»); tray-decay is a first-class metric; (2)
time-bound items → optional «له وقت؟» pin at save; (3) the "add to tomorrow NOW" impulse →
smart-suggestion toast makes it 2 taps, never slower than today.

## Capture rules (from the personas)

- Save = ONE tap, zero questions — the TikTok-favorite gesture. Scheduling is offered, never
  asked: high-confidence toast suggestion (1 extra tap), else segment-grouped picker (a 30-day
  trip = 4–6 city segments, never 30 chips).
- Share window is ~3 seconds inside TikTok: share → named toast («مطعم إيتشيران — طوكيو ·
  انحفظ في رحلة اليابان ↩») → back to scrolling. Any modal kills the habit.
- Every save is a promise to resurface (visible fate: «في اليوم ٣» / «مكرر» / «مغلق —
  استبدلناه» / contributor avatar + ping). A save never mentioned again teaches users to stop.

## Share-target routing (agreed algorithm)

Extract → geocode → match active/upcoming trips (city→country→radius). Exactly one match =
auto-route + undo toast. True ambiguity (rare) = 2–3 row picker, one tap. No match / no trips =
«محفوظاتي». Never bounce a share («سوّ رحلة أول» = rejecting the user's first gift). Build the
OS share extension (the doorway; extraction engine already exists) with paste-link inside the
unified add field as week-one fallback. The moat and the risk are the same thing: extraction
precision — wrong-café auto-routes poison the entire saves layer.

## «محفوظاتي» — the missing primitive (unanimous)

Global geo-clustered inbox, same component as the trip tray, no trip attached. Solves: shares
before any trip; the dreamer phase (months of «يارب نروح» reels); routing failures; solo users
pre-commitment; and inverts the funnel — collecting becomes the top of it («عندك ٧ أماكن
باليابان — نسوي لها رحلة؟» = trip genesis pre-seeded with saves, wrapped by the canonical
skeleton). Strongest organic trip-creation trigger the app will have; incubator, not archive.

## AI's home (settled)

Six seats, one face. Silent: package render, بدّل alternatives, شروطي parsing, extraction+
routing (reasons shown, no brand), «وش الحين؟». VISIBLE exactly at assembly — «رتّبها لي» /
the باقة appearing WITH its reasoning lines («خليت الجمعة خفيف — رحلتكم فيها مطار») — because
sequencing the group's chaos is the job users visibly can't do themselves, and reasoning IS the
sparkle. Certification badges («تم التحقق: حلال — مذكور في ٤٠ تقييم») may carry the smart mark.
No chat box (a form in costume), no ✨ chrome elsewhere — every sparkle is a promise you'll be
blamed for on the ground.

## Additional kills (round 3)

- The 30-chip day picker: dead on sight, replaced by save-default + suggestion toast + segment picker.
- Day-choice at add-time as a *question*: only survives as context («يومك الثلاثاء فاضي») or offer.
- Discover as a destination FEED: demoted (see open decision 2).

## Founder decisions locked this round

- Solo growth artifact: YES — trip starts solo, friends' «أنا جاي» → invite → group layer wakes;
  the «أنا رايح — من معي؟» share card doubles as marketing.
- Reaction pass: skippable with «من ما تفاعل بعد» nudge.

## Open decisions (round 3)

1. **Extraction precision bar**: required accuracy before silent auto-route; low-confidence
   extractions land as «غير مؤكد» cards? (Recommend: yes + measure before building the OS sheet.)
2. **Discover posture**: skeptic says kill the feed (search/ask surface only — "TikTok is the
   feed, Paxawa is the librarian"); strategist says demote and decide on data; personas found
   4 real modes (slot-filling, couch-scrolling, vetting, near-me-now). Recommendation:
   search-first header + intent chips («قريب مني» «فطور» «عوائل»), browse rail below, measure.
3. **«محفوظاتي» privacy at trip genesis**: do inbox saves auto-become group-visible when they
   seed a group trip, or stay private until the owner shares? (Shapes whether users trust the
   share-sheet with everything.) Recommendation: one-time consent at genesis.
4. **Canonical Tier-1 ops ownership** (carried from Part 3) — still unassigned.

---

# Part 5 — Final decisions & build plan (2026-09-15)

## Founder's final calls

1. **Discover LIVES** — repositioned, not killed: the Google-Maps-powered lookup surface.
   Three modes: strengthened search, map-tap exploration (GPS, "what's near this point"),
   near-me-now. It is the premier in-app FEEDER into the saves layer; the browse feed demotes
   below search. Its add flow follows the capture rules (one-tap save, day offered never asked).
2. **«محفوظاتي» = bookmarks with FOLDERS** (TikTok bookmark model): save anything from anywhere,
   organize into folders («رحلة اليابان»), auto-suggested geo-folders welcome. A folder can
   attach to an existing trip or become one («نسوي رحلة من هذا الفولدر؟»). Privacy resolved
   structurally: bookmarks are personal; ATTACHING a folder to a group trip is the explicit,
   consented share moment.
3. **Canonical ops assigned**: Claude owns Tier-1 freshness — monthly automated pass (Places
   API open/closed verification on every venue + review sweep), dead venues flagged & replaced.
   Tier-1 list (~15, Gulf-volume): إسطنبول، طرابزون، جورجيا، باكو، البوسنة، كوالالمبور/لنكاوي،
   بانكوك/بوكيت، بالي، اليابان (طوكيو–كيوتو–أوساكا)، لندن، باريس، القاهرة، صلالة، المالديف، دبي/العلا (تأكيد لاحقًا).
4. **All building happens on branch `planning-v2` → Vercel PREVIEW deployments only.**
   Production (paxawa.com) untouched until explicit go-live. Founder tests via the preview URL
   logged in as himself. (Supabase auth redirect allowlist must include the preview domain.)

## Extraction pipeline — the expansion (decision 1)

**Stages:** (1) URL/share intake (TikTok, IG reel, YouTube short) → (2) content acquisition:
oEmbed metadata + caption text + top comments where accessible; frame OCR as later upgrade →
(3) candidate mining: LLM extracts place-name candidates + city hints from caption/comments
(the comments carry the halal/quality signals users actually trust) → (4) grounding: each
candidate → Google Places text search scoped by city hint → real place with ID/photo/rating →
(5) confidence score per place: name-match strength × geo-consistency (all places in one city?)
× source agreement (caption AND comments) → (6) routing (Part 4 algorithm) with confidence gates.

**Confidence gates (UX):** HIGH → silent auto-route, named undo toast. MEDIUM → lands as
«غير مؤكد» card (place + "هل قصدت؟" one-tap confirm/fix — every fix is training data).
LOW/none → the raw video saved in محفوظاتي with «ما قدرنا نطلع الأماكن — أضفها يدويًا» (never
silently dropped; the video itself keeps value as a bookmark).

**Measurement before the OS share-sheet ships:** golden set of 100 real Gulf travel reels
(founder + marketing session collect), measure place-level precision/recall. Gate: ≥90%
precision on HIGH-confidence auto-routes → build the share extension. Below → paste-link only
(same pipeline, lower stakes) while extraction improves. Precision failures reviewed monthly
alongside canonical ops.

**Existing foundation:** api/ai/parse-inspiration already does caption→places; the work is
comments mining, confidence scoring, gates, and the golden-set eval harness.

## Build plan — phases (each = testable on preview)

**P0 · Broken windows (independent, can ship to prod anytime):** B1 invisible CTA, B2 dates/
live-mode trap, B3 wizard draft loss (interim), B4 airport autocomplete, B5 «يحدث الآن», plus
plus-codes + dietary i18n polish.

**P1 · The saves layer (foundation):** place-card object + trip tray + «محفوظاتي» with folders;
one-tap «احفظ» everywhere (Discover, search, import results); day-suggestion toast + segment
picker; visible-fate statuses. Kills the 30-chip wall.

**P2 · The package:** canonical data model + 3 hand-built Tier-1 packages to start (اليابان،
إسطنبول، جورجيا); instant باقة screen (cover/day cards/cost, «اعتمدها/خصّصها/أبي أكتب شروطي»);
saves merge with provenance; the six verbs; draft persistence. The 4-step wizard dies here.

**P3 · Group layer on member-count gate:** solo-dormant chrome; share link + reaction pass
(day cards, 🙂 default); «اقترح مكان» tray; visible fate pings; «أنا رايح — من معي؟» artifact.

**P4 · Capture at scale:** unified add field (search+URL one box); extraction confidence gates +
golden-set eval; paste-link flow; then OS share-target once ≥90% gate passes; folder→trip genesis.

**P5 · Live-trip pull:** «وش الحين؟» from unvisited tray/plan; mid-trip resurfacing
(«أنت قريب من مكان حفظته»).

Sequence rationale: P1 is the spine everything pulls from; P2 delivers the founder's package
vision; P3 makes it group-true; P4 opens the funnel; P5 closes the loop on the ground.
