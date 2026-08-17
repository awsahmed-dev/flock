<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:paxawa-guardrails -->
# Paxawa — house rules for any agent working in this repo

This is a **live app with real users**. Read these before writing code. They are
not style preferences; each one exists because breaking it has already cost
something.

## 1. Never work on `main`

Branch first, always. `git checkout -b <type>/<scope>`. One commit per logical
change, with the measured number in the message where there is one. If you
cannot describe what a commit does in one sentence, it is two commits.

## 2. Capture the baseline BEFORE you touch anything

```bash
bash scripts/sweep-baseline.sh      # writes .sweep-baseline.json
```
When you are done:
```bash
bash scripts/sweep-verify.sh        # exits non-zero if ANY gate regressed
```
`sweep-verify.sh` is the authority, not your judgement and not mine. If it
exits non-zero, you are not finished. Do not edit the scripts to make them
pass — that is the one unforgivable move in this repo.

## 3. Do not add. Fix.

This app has been through a deliberate simplification. Features were removed on
purpose, and re-adding them is not an improvement:

- **Do not add new routes, tabs, screens, or nav entries.** The nav is
  phase-aware by design (PLANNING / DEPARTURE / LIVE / RECAP each get their own
  three tabs). Changing tab structure has been explicitly rejected.
- **Do not add libraries.** If you think you need one, stop and ask.
- **Do not "also fix" things you noticed.** Report them; do not act on them.
- **Do not refactor for elegance.** A larger diff is a worse diff here.
- **Do not delete code you think is unused.** Several files look dead and are
  reachable through non-obvious paths, and several genuinely-dead files are
  kept as reference. Ask.

## 4. Do not touch these without an explicit instruction naming the file

| Path | Why |
|---|---|
| `src/lib/actions/**` | Authorization. Being fixed separately, with tests. |
| `src/lib/fx.ts`, `settle.ts`, `budget.ts`, `trip-phase.ts`, `numerals.ts` | Money and time correctness. Same. |
| `src/lib/db/schema.ts` | Deployed with `drizzle-kit push` and there are **no migration files**, so a schema edit can silently drop indexes and data. Never edit without a hand-written migration plan. |
| `src/components/animate-ui/**` | Vendored. Cleanest code in the repo. Leave it. |
| `src/lib/i18n/messages/*.json` | 1,334 keys, exact en/ar parity. Adding a key means adding it to **both**. Check the key does not already exist first — most "missing" strings are already translated and simply not called. |
| `src/lib/__tests__/fresh-eyes-money.test.ts` | These tests are written to **pass against current buggy behaviour**. A failure means someone fixed a bug — that is the signal. Do not "repair" them. |
| `scripts/sweep-*.sh` | The gates. See rule 2. |

## 5. STOP and ask when any of these is true

- A change would alter what the app **does**, not just how it looks.
- A fix needs a design decision (which colour, which size, which wording).
- You are about to touch a file on the list above.
- A gate in `sweep-verify.sh` regresses and you cannot see why.
- The task turns out to be bigger than described.
- You find a second bug while fixing the first.

Stopping costs a message. Guessing costs a revert, or worse, a silent
regression in production.

## 6. Verify from ground truth, never from your own summary

"I fixed X" is a claim. The evidence is a number, a test that fails without the
fix, or a render. Specifically:

- **UI claims** need a render. There is a real database harness — `get-user.ts`
  falls back to a `DEV_USER` in development, so seeding that user's rows is
  enough to render every page with no code changes. A layout bug like a label
  wrapping only appears in pixels.
- **Logic claims** need a test that fails before your change and passes after.
  If it passes both ways it is proving nothing.
- **Never** report a build as green if you did not watch it finish.

## 7. Say what you did not do

A stub you flagged is good engineering. A gap presented as finished is the
thing that costs money. End every piece of work with what is incomplete, what
you skipped, and what you could not verify.
<!-- END:paxawa-guardrails -->

## 8. If you are the session that originally built this code

Most of these findings are about code you wrote. That is not an accusation —
it is the reason a second pair of eyes existed at all. But it creates one
specific failure mode worth naming: **you will see what you meant, not what
you made.**

So:

- **Reproduce the finding before you argue with it.** Every one comes with a
  command, a test, or a render. Run it. "I did check authorization there" is a
  memory; `npx vitest run src/lib/__tests__/authz.test.ts` is a fact. Those
  seven tests failed on `main` — the attacker really did delete the victim's
  expense, vote and document.
- **Your context may be stale.** Decisions you remember making may have been
  changed since, or compacted out. Read the current file, not your memory of it.
- **A finding you disagree with is a finding to test, not to dismiss.** One
  swept claim in this audit was already disproved by execution ($10 ÷ 3 does
  not fail the validator). That is the right way to kill a finding — with a
  result, not a recollection.
- **Do not defend a decision by re-explaining the intent.** The intent is
  usually fine. `?? amt` was meant to degrade gracefully; it makes ¥50,000
  render as $50,000. Both things are true.
