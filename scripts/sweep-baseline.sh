#!/usr/bin/env bash
# Capture the numbers that must not regress. Run BEFORE touching anything.
set -u
cd "$(dirname "$0")/.."
echo "Capturing baseline… (tsc and eslint take a minute)"
TSC=$(npx tsc --noEmit 2>&1 | grep -cE "error TS" || true)
npx eslint src/ > /tmp/.esl.out 2>&1 || true
ESL=$(awk 'match($0,/[0-9]+ problems/){print substr($0,RSTART,RLENGTH); exit}' /tmp/.esl.out | tr -dc '0-9'); ESL=${ESL:-0}
ESE=$(awk 'match($0,/[0-9]+ errors/){print substr($0,RSTART,RLENGTH); exit}' /tmp/.esl.out | tr -dc '0-9'); ESE=${ESE:-0}
DUP=$(grep -rhoE 'text-\[(12|13|14|16)px\]' src/components src/app --include=*.tsx 2>/dev/null | wc -l | tr -d ' ')
ARB=$(grep -rhoE 'text-\[[0-9.]+px\]' src/components src/app --include=*.tsx 2>/dev/null | wc -l | tr -d ' ')
PAL=$(grep -rhoE '(text|bg|border)-(red|orange|amber|yellow|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}' src/components src/app --include=*.tsx 2>/dev/null | wc -l | tr -d ' ')
I18N=$(python3 -c "
import json
en=json.load(open('src/lib/i18n/messages/en.json')); ar=json.load(open('src/lib/i18n/messages/ar.json'))
def f(d,p=''):
    for k,v in d.items():
        yield from f(v,p+k+'.') if isinstance(v,dict) else iter([p+k])
e,a=set(f(en)),set(f(ar)); print(len(e^a))")
cat > .sweep-baseline.json <<JSON
{ "tscErrors": $TSC, "eslintProblems": $ESL, "eslintErrors": $ESE,
  "duplicateTextSizes": $DUP, "arbitraryTextSizes": $ARB,
  "paletteClasses": $PAL, "i18nKeyMismatch": $I18N }
JSON
cat .sweep-baseline.json
echo "✓ baseline written to .sweep-baseline.json — commit it."
