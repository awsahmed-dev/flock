# Paxawa v2 — Design System & UX Spec

**Status:** Planning / spec. The design canon for v2. Companion to the three logic docs.
**The bar:** what we have is *great*. v2 must be *perfect* — the kind of polish that makes a
first-time visitor trust the product with their trip and their money, not feel like a cheap clone.

This doc is the source of truth for the **ui-ux-designer** agent and for anyone touching screens.

---

## 1. Design philosophy

1. **Two native designs, not one stretched.** Desktop and mobile are *designed separately* — not
   one layout that flexes. Mobile = thumb-zone, bottom nav, sheets, single column. Desktop =
   persistent sidebar, multi-column, hover states, keyboard, side panels (not bottom sheets).
   Everything desktop is gated `lg:`; **mobile is never regressed for a desktop win.**
2. **Real data, real proof, always.** Every place/card shows a real photo, real rating, real price.
   No lorem, no gray boxes where content should be. Empty states are *designed*, not blank.
3. **Calm hierarchy.** One clear focal point per screen. Generous whitespace. Type does the work;
   borders and shadows are restrained. If everything is bold, nothing is.
4. **Alive, not animated.** Micro-interactions on hover/press/state-change that signal "this is a
   real app" — but never theatrical. The feed should feel like it's "getting warmer," cards should
   lift, the map and list should breathe together.
5. **Trust is a feeling you design.** Attribution, security cues, clean money formatting, no broken
   states, no overlapping popups. Cheapness shows in the seams — kill the seams.

---

## 2. The "vibe-coded" tells to eliminate (the anti-patterns)

A redesign checklist of what makes UI read as AI/cheap, and the fix:

| Tell | Fix |
|---|---|
| Mobile layout centered in a desktop column | Desktop-native multi-column + sidebar |
| Bottom nav / FAB / bottom sheet on desktop | Sidebar nav, inline actions, side panels |
| Everything the same weight | One focal point, clear type scale |
| Tiny icons (<16px), cramped tap targets | 16px+ icons, ≥40px hit areas |
| Empty right rails / dead space | Conditional grids; fill width with purpose |
| Floating popups overlapping content | One surface owns the corner; no collisions |
| Flat gray empty states | Designed empty states with art + a clear next action |
| Inconsistent spacing (mb-4/6/8 mixed) | One spacing rhythm via a shared scale |
| Photos washed out by heavy overlays | Bottom-up gradients; keep the image visible |
| No hover/focus feedback | Hover lift/tint, focus rings, pressed states everywhere |

---

## 3. Design language

### 3.1 Type scale (desktop / mobile)
- Display (page title): `text-4xl` desktop / `text-2xl–3xl` mobile, extrabold, tight tracking.
- Section heading: `text-xl–2xl` / `text-lg`.
- Card title: `text-sm–base` bold.
- Body: `text-sm`, `leading-relaxed`.
- Meta/caption: `text-xs`, muted.
- Eyebrow/label: `text-[10px]–[11px]` bold, tracking-widest, uppercase, muted.

### 3.2 Spacing rhythm
- One vertical rhythm per page: sections separated by a single consistent gap (`space-y-6` mobile /
  `space-y-8–10` desktop). No ad-hoc `mb-*` mixing.
- Card padding: `p-4` mobile / `p-5–6` desktop.
- Content max width: `max-w-7xl` desktop trip/dash shells; reading columns `max-w-2xl–4xl`.

### 3.3 Color, elevation, surface
- Keep the brand: primary → violet gradient, the aurora accents.
- Elevation by **border + subtle shadow on hover**, not heavy drop shadows at rest.
- Money always: currency code + grouped digits + tabular-nums; never raw floats.
- Status/semantic colors consistent (emerald=ok/paid, amber=pending, red=destructive, blue=info).

### 3.4 Motion
- Card hover: `-translate-y-0.5` + border tint + (photo) `scale-105`, ~200–500ms ease.
- Press: subtle scale-down.
- Feed re-rank: smooth reorder of the *unseen tail* only; never yank a card mid-read.
- Map↔list: hover a card → pin pulses; click a pin → card scrolls into view.
- Sheets/panels: spring in; respect reduced-motion.

---

## 4. Core v2 surfaces to design (the new work)

Each needs a **desktop** and a **mobile** design.

### 4.1 The Discover feed + place card
- **Place card:** hero photo (16:10) · name · rating + review count · price ($–$$$$) · category ·
  distance · contextual tags (`✨ AI pick`, `Hidden gem`, `Crew favorite`). One-tap **Add** /
  **Suggest** affordance. Hover → lift + pin pulse.
- **Feed:** desktop = card grid in the left panel beside the map; mobile = vertical card stream over
  a map peek. The "getting warmer" feel as it personalizes (§A5 of build-spec).
- **Category chips** + search bar pinned at top.

### 4.2 The place detail panel
- **Desktop = right-side slide-over panel** (never a bottom sheet). Mobile = full-screen sheet.
- Photo carousel · rating + top reviews · hours · price · address · "Open in Google Maps" ·
  **"Add to day" accordion** (collapsed → expands to pick Day N → collapses) · attribution.

### 4.3 The decision card (in chat)
- Rich card in the chat stream: photo · name · rating · price · proposer note · proposed day ·
  inline 👍/👎 + live tally + countdown. State variants: open / passed / failed / no-quorum.
- The **Decisions lens** (retired Votes tab) — open-needs-your-vote pinned, resolved below, nav badge.

### 4.4 The plan canvas (Days | Discover)
- Desktop = persistent left panel (no drag sheet) beside a full-bleed map. Mobile = the existing
  drag sheet, refined.
- Day cards, item rows with the 3-column layout (number+drag · content · actions), route polylines.
- **Unscheduled tray** for passed-but-undated places.

### 4.5 System states (designed, not default)
- **Empty:** illustration + one-line value + a single clear CTA (per surface — empty plan, no
  expenses, no decisions, no results).
- **Loading:** skeleton cards that match the real card shape (not spinners).
- **Error/offline:** friendly, branded, with a retry or "here's your cached plan."

---

## 5. Desktop vs mobile pattern map

| Pattern | Mobile | Desktop |
|---|---|---|
| Primary nav | bottom nav | persistent left sidebar |
| Secondary actions | bottom sheet | inline / right side-panel |
| Add place | FAB → picker | inline buttons in the panel header |
| Place detail | full-screen sheet | right slide-over panel |
| Multi-section page | stacked single column | 2-col main + sticky right rail |
| Lists | full-width rows | card grids (2–3 col) |
| Plan | map + drag sheet | map + persistent left panel |

---

## 6. Accessibility, RTL, i18n (non-negotiable)
- **RTL:** logical properties only (`ms/me/ps/pe`, `start/end`), `rtl:` variants for directional
  icons. Arabic is a first-class language, not an afterthought.
- **i18n:** no hardcoded strings — every label via the dictionary; ICU plurals for counts.
- **A11y:** ≥4.5:1 contrast, ≥40px hit targets, visible focus rings, keyboard paths for every
  action, `aria-*` on custom controls, respect `prefers-reduced-motion`, alt text on images.

---

## 7. Component inventory (standardize, stop re-inventing)
Build/centralize: `PlaceCard`, `PlaceDetailPanel`, `DecisionCard`, `CategoryChips`, `RatingPill`,
`PriceLevel`, `TagChip` (AI pick / gem / crew), `EmptyState`, `SkeletonCard`, `SidePanel`,
`StatTile`, `DayCard`, `ItemRow`, `MapPin`. One canonical version each, desktop + mobile aware.

---

## 8. The audit rubric (how we judge "perfect")
The ui-ux-designer agent scores every screen, **desktop and mobile separately**, against:
1. **Hierarchy** — one obvious focal point? scannable in 2s?
2. **Native fit** — does it use the platform's idioms (not a stretched phone on desktop)?
3. **Real content** — real data, designed empty/loading/error states?
4. **Rhythm** — consistent spacing/type, no orphan margins?
5. **Alive** — hover/press/focus feedback present and tasteful?
6. **Trust** — attribution, clean money, no overlaps/broken states, no cheap seams?
7. **A11y + RTL + i18n** — passes §6?
8. **Motion** — purposeful, not theatrical, reduced-motion safe?

A screen ships only when it scores well on all eight, at both fidelities.
