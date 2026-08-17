# Paxawa — mechanical sweep brief for Claude Code

Paste the prompt at the top into Claude Code in the repo root. Everything below it is the spec it needs. Each task has a **falsifiable pass condition** — a command whose output is a number that must reach a target. Don't accept "done" without the number.

---

## ▶ THE PROMPT — paste this

```
You are doing a mechanical cleanup sweep on this repo (Paxawa, Next.js 16 + Tailwind v4).
Read docs/CLAUDE-CODE-BRIEF-mechanical-sweeps.md and work through the tasks in order.

Rules, in priority order:
1. Do NOT change behaviour. These are find-and-replace sweeps: tokens, labels,
   sizes, roles. If a change alters what the app DOES, stop and report instead.
2. Work one task at a time. After each, run that task's PASS COMMAND and paste
   the before/after numbers into your summary. A task is not done until its
   number hits the target.
3. Never touch: src/components/animate-ui/** (vendored, already clean),
   src/components/landing/**, src/app/blog/**, src/app/privacy, src/app/terms,
   src/app/vision* (bespoke marketing, deliberately off-token).
4. Commit per task with the number in the message, e.g.
   "chore(type-scale): replace 139 duplicate text-[Npx] with type-* utilities".
5. Run `npx tsc --noEmit` and `npx eslint src/` after every task. The baselines
   are in this brief — you must not exceed them.
6. If a task's target is unreachable without a judgement call, STOP and ask.
   Do not invent a design decision.

Start with Task 1 and report before moving to Task 2.
```

---

## Baselines — do not exceed these

Measured on `main` @ `f50dafe`. Anything above these numbers is a regression you introduced.

| Gate | Baseline | Command |
|---|---|---|
| TypeScript errors | 9 (all pre-existing `not assignable to never` in `animate-ui/slot`, `ui/glass`, `components/expenses/*` — documented in `next.config.ts`) | `npx tsc --noEmit` |
| ESLint problems | **470 (400 errors, 70 warnings)** | `npx eslint src/` |
| Production build | must exit 0 | `npm run build` |

---

## Task 1 — WITHDRAWN (premise was wrong)

The original task asked for a find-and-replace of `text-[12|13|14|16px]` with the
`type-*` utilities on the grounds they were "literal duplicates, zero visual risk".
Reproduced on `main @ f50dafe` — they are not:

```
.type-body-lg { font-size: 16px; font-weight: 400; line-height: 1.6; }
.type-body-sm { font-size: 14px; font-weight: 400; line-height: 1.5; }
.type-caption { font-size: 12px; font-weight: 500; letter-spacing: 0.2px; text-transform: uppercase; }
.type-label   { font-size: 13px; font-weight: 500; }
```

`type-*` are **semantic roles, not a size scale** — they set weight, case and
leading. Measured against the ~144 in-scope sites: 32/38 `text-[12px]` sites are
not uppercase and would be force-uppercased by `type-caption`; 31/69 `text-[13px]`
sites would jump 400→500 weight; the body-* utilities pin `line-height`/`weight`
over whatever `leading-*`/`font-*` the site already carries. A size-based swap
changes rendered output on ~80 sites, which is a design decision, not a sweep.
Moved to "Do NOT do these" below.

---

## Task 2 — Contrast: one token value

**Rule:** `docs/v2-design-system.md` §6 — *"≥4.5:1 contrast."*

`--text-tertiary: #8F8B99` in light mode measures **3.18:1** on `--background`, **3.32:1** on `--card`, **3.02:1** on `--muted`. It is used 27 times, always at 11–13px, so the 3:1 large-text allowance does not apply.

Change the **light-mode** value only (`:root`, ~line 118). Dark mode is 5.54:1 and passes — leave it.

**PASS COMMAND** — save as `scripts/contrast-check.mjs` and run it:
```js
const L = h => { const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255)
  .map(v=>v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4));
  return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]; };
const R = (a,b) => { const [x,y]=[L(a),L(b)]; return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); };
const FG = "#8F8B99";  // <-- put your new value here
for (const [name,bg] of [["background","#FAFAF8"],["card","#ffffff"],["muted","#F5F4F1"]]) {
  const r = R(FG,bg);
  console.log(`${name}: ${r.toFixed(2)}:1 ${r>=4.5?"PASS":"FAIL"}`);
}
```
**Target: all three PASS.** `#6E6A78` works; find the lightest value that clears 4.5:1 on `--muted` (the hardest of the three) so you lose as little of the hierarchy as possible.

---

## Task 3 — Tap targets: 61 controls below 44×44

**Rule:** `globals.css:322` — *"Tap-target floor (brief §1.7): ≥44×44 for every interactive element."* There is a `.tap-target` utility defined at line 323 and it is used **zero times**.

Start with the worst, all verified by rendering:

| File:line | Renders | What it is |
|---|---|---|
| `src/components/itinerary/itinerary-board.tsx:1329` | **10×10** | status-cycle button. Worst in the app. |
| `src/components/itinerary/itinerary-phase-sections.tsx:94` | 28×28 | mark item done |
| `src/components/documents/docs-panel.tsx:64` | 28×28 | docs/photos switch |
| `src/components/discover/discover-feed.tsx:800` | 32×32 | **save a place** — Discover's core action |
| `src/components/money/balances-block.tsx:58,81` | 32×32 | settle-up confirm / cancel |
| `src/components/expenses/expenses-board.tsx:410` | 32×32 | activity filter chips |

**How:** keep the *visual* size, grow the *hit* area. Add padding and negative margin, or use the `.tap-target` utility, or a `::after` inset overlay. Do **not** scale icons up — that changes the design.

**PASS COMMAND:** the render sweep in `docs/fresh-eyes-gates/` (Task 6) reports `sub-44px` per page. **Target: 0 on itinerary, money, pack, settings, discover.**

---

## Task 4 — Keyboard access: 15 clickable non-interactive elements

**Rule:** design-system §6 — *"keyboard paths for every action, aria-\* on custom controls."*

The important one: **`src/components/discover/place-card.tsx:93`** is `<article onClick={...}>` with no `role`, no `tabIndex`, no `onKeyDown`. grep that file for those three — it returns nothing. Opening a place is the Discover feed's whole interaction and it cannot be done with a keyboard.

Also: `place-card-compact.tsx:87` sets `tabIndex={-1}` on a `role="button"` Save with no key handler. `photos-grid.tsx:44` has a close button with an `aria-label` and **no `onClick`** — it only works because the click bubbles to its parent.

Prefer converting to a real `<button>`. Where the element must stay a div/article, add all three of `role="button"`, `tabIndex={0}`, and an `onKeyDown` handling Enter and Space.

Then: 21 sites use `outline-none` / `focus:outline-none` with no `focus-visible` replacement. Two are in shared primitives (`src/components/ui/tabs.tsx:76`, `src/components/ui/dropdown-menu.tsx:36,44`) — **fix those two first**, they multiply across every screen.

**PASS COMMAND:**
```bash
npm i -D @axe-core/playwright
```
then run axe over each rendered page from the gates folder. **Target: zero `critical` violations.**

---

## Task 5 — i18n: 156 hardcoded English strings

**The dictionaries are already perfect** — 1,334 keys, exact en/ar parity, zero empty Arabic values, real CLDR plurals. **Do not add keys unless one genuinely doesn't exist.** Check first; for most of these the Arabic is already sitting there unused.

In severity order:

1. **`src/app/auth/login/page.tsx:9` and `signup/page.tsx:9`** hardcode *both* languages at once: `subtitle="أهلًا بعودتك ✈"`, `boarding="Re-boarding · تسجيل الدخول"`. An English user's very first screen is in Arabic. Fix these first.
2. **`src/app/error.tsx` and `src/app/global-error.tsx`** have zero `t()` calls — every error an Arabic user ever sees is English.
3. **`src/components/expenses/transactions-page.tsx:412`** and **`expenses-board.tsx:516`** render `"You"` / `"Someone"` while `expenses.payerYou = "أنت"` and `expenses.payerSomeone = "شخص ما"` exist unused.
4. **`src/components/itinerary/edit-item-dialog.tsx`** — 17 strings, zero `t()`, every key already present.
5. **`src/components/pwa/offline-banner.tsx:46`** concatenates raw English onto a translated string.

**PASS COMMAND:**
```bash
grep -rEc '>[A-Z][a-z]+ [a-z]+' src/components/expenses src/components/itinerary src/app/auth src/app/error.tsx | grep -v ':0'
```
Target: trending to zero. Then render each page with cookie `paxawa_locale=ar` and confirm no Latin-script body text outside brand names.

---

## Task 6 — Set up the gates (do this FIRST if the others need measuring)

Copy these from the `fresh-eyes/first-run` and `fix/authz` branches — they already exist and are proven:

- `vitest.config.ts` aliases for `server-only` / `next/cache` / `next/headers`. **Without these nothing under `src/lib/actions` can be imported by a test at all** — which is why none of it had coverage.
- `src/test-support/*.ts` — the three no-op stubs those aliases point at.
- `src/lib/__tests__/authz.test.ts` — the IDOR attack matrix. Proven non-vacuous: 7 fail on `main`, 7 pass on `fix/authz`.
- `src/lib/__tests__/fresh-eyes-money.test.ts` — 23 cases documenting current wrong money behaviour. **These are written to pass today.** Each one flipping to failing means a bug got fixed. Don't "repair" them.

**Local database for rendering** (no code changes needed — `src/lib/auth/get-user.ts:56` already falls back to a `DEV_USER` in development, so seeding that user's rows is enough):
```bash
/usr/lib/postgresql/16/bin/initdb -D /tmp/pgdata -U postgres --auth=trust
/usr/lib/postgresql/16/bin/pg_ctl -D /tmp/pgdata -o '-p 5433' -l /tmp/pg.log start
psql -p 5433 -U postgres -c 'create database paxawa;'
# set DATABASE_URL="postgresql://postgres@localhost:5433/paxawa" in .env.local
npx drizzle-kit push --force
# then seed profile id 00000000-0000-0000-0000-000000000001 as a trip member
```

---

## Do NOT do these

They need design decisions, not sweeps. Leave them:

- **The `text-[12|13|14|16px]` → `type-*` swap (ex-Task 1)** — `type-*` are semantic roles (weight/case/leading), not sizes; swapping alters ~80 sites. Needs the type-scale decision below first.
- **The remaining 506 `text-[Npx]`** — there are two competing type scales documented in this repo (`docs/v2-design-system.md` §3.1 vs `globals.css:301`) and they disagree on every step except the eyebrow. Someone has to pick one first.
- **The 780 raw palette classes / 247 decorative uses of brand purple** — genuine findings, but collapsing 18 hue families into the token ramps is a visual redesign.
- **Anything in `src/lib/actions`, `src/lib/fx.ts`, `src/lib/settle.ts`, `src/lib/budget.ts`, `src/lib/trip-phase.ts`** — authorization, money and time correctness are being handled separately, with proof. Touching them will conflict.
- **Adding confirmation dialogs to destructive actions** — the right pattern already exists (`src/components/trips/now-cockpit.tsx:214`, a 3s undo toast) but applying it changes behaviour.
