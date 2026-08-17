import pathlib, re, sys
ARABIC = re.compile(r'[؀-ۿ]')

# Deliberately bilingual by design. Do NOT "fix" these — the brand copy is
# bilingual on purpose ("Paxawa — travelers, together · English + العربية").
EXCLUDE = ("src/components/landing/", "src/components/blog/", "src/components/legal/",
           "src/app/blog/", "src/app/privacy", "src/app/terms", "src/app/vision",
           "src/app/dev/", "src/components/animate-ui/")

def is_noise(s):
    s = s.strip()
    if s.startswith(("//", "*", "/*", "/**")): return True        # comments
    if re.search(r'\[[^\]]*٠-٩[^\]]*\]', s): return True  # numeral regex classes
    if "pattern=" in s and "٠" in s: return True
    return False

hits = []
for p in sorted(pathlib.Path("src").rglob("*.tsx")):
    if any(str(p).startswith(e) for e in EXCLUDE): continue
    for i, l in enumerate(p.read_text(encoding="utf-8", errors="ignore").split("\n")):
        if ARABIC.search(l) and not is_noise(l):
            hits.append(f"{p}:{i+1}  {l.strip()[:120]}")

for h in hits: print(h)
print(f"\nVIOLATIONS: {len(hits)}  (target: 0)")
sys.exit(1 if hits else 0)
