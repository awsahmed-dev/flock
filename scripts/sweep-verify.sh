#!/usr/bin/env bash
# The gate. Exits non-zero if anything regressed. This is the authority.
set -u
cd "$(dirname "$0")/.."
[ -f .sweep-baseline.json ] || { echo "✗ no .sweep-baseline.json — run scripts/sweep-baseline.sh first"; exit 2; }
TSC=$(npx tsc --noEmit 2>&1 | grep -cE "error TS" || true)
npx eslint src/ > /tmp/.esl.out 2>&1 || true
ESL=$(awk 'match($0,/[0-9]+ problems/){print substr($0,RSTART,RLENGTH); exit}' /tmp/.esl.out | tr -dc '0-9'); ESL=${ESL:-0}
ESE=$(awk 'match($0,/[0-9]+ errors/){print substr($0,RSTART,RLENGTH); exit}' /tmp/.esl.out | tr -dc '0-9'); ESE=${ESE:-0}
DUP=$(grep -rhoE 'text-\[(12|13|14|16)px\]' src/components src/app --include=*.tsx 2>/dev/null | wc -l | tr -d ' ')
I18N=$(python3 -c "
import json
en=json.load(open('src/lib/i18n/messages/en.json')); ar=json.load(open('src/lib/i18n/messages/ar.json'))
def f(d,p=''):
    for k,v in d.items():
        yield from f(v,p+k+'.') if isinstance(v,dict) else iter([p+k])
e,a=set(f(en)),set(f(ar)); print(len(e^a))")
B=$(python3 -c "import json;print(' '.join(str(v) for v in json.load(open('.sweep-baseline.json')).values()))")
read -r bTSC bESL bESE bDUP bARB bPAL bI18N <<< "$B"
FAIL=0
chk(){ if [ "$2" -gt "$3" ]; then echo "  ✗ $1: $2 (baseline $3) — REGRESSED"; FAIL=1; else echo "  ✓ $1: $2 (baseline $3)"; fi; }
echo "── gates ──"
chk "tsc errors"            "$TSC"  "$bTSC"
chk "eslint problems"       "$ESL"  "$bESL"
chk "eslint errors"         "$ESE"  "$bESE"
chk "i18n en/ar mismatch"   "$I18N" "$bI18N"
echo "  · duplicate text sizes: $DUP (baseline $bDUP — LOWER is the goal)"
echo "── no forbidden files touched? ──"
if git diff --name-only main...HEAD 2>/dev/null | grep -qE 'src/lib/actions/|src/lib/(fx|settle|budget|trip-phase|numerals)\.ts|src/lib/db/schema\.ts|src/components/animate-ui/|scripts/sweep-'; then
  echo "  ✗ a protected path was modified:"; git diff --name-only main...HEAD | grep -E 'src/lib/actions/|src/lib/(fx|settle|budget|trip-phase|numerals)\.ts|src/lib/db/schema\.ts|src/components/animate-ui/|scripts/sweep-' | sed 's/^/      /'; FAIL=1
else echo "  ✓ none"; fi
echo "── tests ──"
if npx vitest run 2>&1 | tail -4 | grep -q "failed"; then echo "  ✗ tests failing (if a fresh-eyes-money test failed, a BUG WAS FIXED — confirm intentionally)"; FAIL=1; else echo "  ✓ all pass"; fi
[ "$FAIL" -eq 0 ] && echo "✓ ALL GATES PASS" || { echo "✗ GATES FAILED — you are not finished"; exit 1; }
