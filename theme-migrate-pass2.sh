#!/bin/sh
echo "🎨 AG360 Theme Migration — Pass 2"
echo "==================================="

FILES=$(find app components -name "*.tsx" -type f)
echo "Files to scan: $(echo "$FILES" | wc -l | xargs)"
echo ""

for f in $FILES; do
  # ─── TERNARY / DYNAMIC HEX (quoted hex in JS expressions) ──
  # These catch: condition ? "#34D399" : "#EF4444"  and similar
  sed -i '' 's/"#34D399"/"var(--ag-green)"/g' "$f"
  sed -i '' 's/"#2DD4A8"/"var(--ag-green)"/g' "$f"
  sed -i '' 's/"#6EE7B7"/"var(--ag-green)"/g' "$f"
  sed -i '' 's/"#2CC48D"/"var(--ag-accent-hover)"/g' "$f"
  sed -i '' 's/"#EF4444"/"var(--ag-red)"/g' "$f"
  sed -i '' 's/"#F87171"/"var(--ag-red)"/g' "$f"
  sed -i '' 's/"#F59E0B"/"var(--ag-yellow)"/g' "$f"
  sed -i '' 's/"#FBBF24"/"var(--ag-yellow)"/g' "$f"
  sed -i '' 's/"#60A5FA"/"var(--ag-blue)"/g' "$f"
  sed -i '' 's/"#38BDF8"/"var(--ag-blue)"/g' "$f"
  sed -i '' 's/"#A78BFA"/"#A78BFA"/g' "$f"
  sed -i '' 's/"#0F1629"/"var(--ag-bg-card)"/g' "$f"
  sed -i '' 's/"#0F1729"/"var(--ag-bg-card)"/g' "$f"
  sed -i '' 's/"#111827"/"var(--ag-bg-card)"/g' "$f"
  sed -i '' 's/"#080C15"/"var(--ag-bg-base)"/g' "$f"
  sed -i '' 's/"#0B1120"/"var(--ag-bg-primary)"/g' "$f"
  sed -i '' 's/"#1E293B"/"var(--ag-border-solid)"/g' "$f"
  sed -i '' 's/"#151F32"/"var(--ag-bg-secondary)"/g' "$f"
  sed -i '' 's/"#F1F5F9"/"var(--ag-text-primary)"/g' "$f"
  sed -i '' 's/"#94A3B8"/"var(--ag-text-secondary)"/g' "$f"
  sed -i '' 's/"#64748B"/"var(--ag-text-muted)"/g' "$f"
  sed -i '' 's/"#475569"/"var(--ag-text-dim)"/g' "$f"
  sed -i '' 's/"#8B5CF6"/"#8B5CF6"/g' "$f"
  sed -i '' 's/"#EC4899"/"#EC4899"/g' "$f"
  sed -i '' 's/"#22C55E"/"var(--ag-green)"/g' "$f"

  # ─── TAILWIND BORDER WITH OPACITY ──────────────────────────
  sed -i '' 's/border-\[#EF4444\]\/20/border-[var(--ag-red)]\/20/g' "$f"
  sed -i '' 's/border-\[#EF4444\]\/15/border-[var(--ag-red)]\/15/g' "$f"
  sed -i '' 's/border-\[#34D399\]\/20/border-[var(--ag-accent-border)]/g' "$f"
  sed -i '' 's/border-l-\[#34D399\]/border-l-[var(--ag-accent)]/g' "$f"

  # ─── RING OFFSET ──────────────────────────────────────────
  sed -i '' 's/ring-offset-\[#111827\]/ring-offset-[var(--ag-bg-card)]/g' "$f"

  # ─── BUTTON TEXT ON ACCENT ────────────────────────────────
  sed -i '' 's/text-\[#0F1629\]/text-[var(--ag-accent-text)]/g' "$f"
  sed -i '' 's/text-\[#0F1729\]/text-[var(--ag-accent-text)]/g' "$f"

  # ─── HOVER STATES ─────────────────────────────────────────
  sed -i '' 's/hover:bg-\[#2CC48D\]/hover:bg-[var(--ag-accent-hover)]/g' "$f"

  # ─── MAP POPUP HTML STRINGS ───────────────────────────────
  # These are template literals inside backtick strings
  sed -i '' "s/background:#0F1629/background:var(--ag-bg-card)/g" "$f"
  sed -i '' "s/border:1px solid #1E293B/border:1px solid var(--ag-border-solid)/g" "$f"
  sed -i '' "s/color:#F1F5F9/color:var(--ag-text-primary)/g" "$f"
  sed -i '' "s/color:#64748B/color:var(--ag-text-muted)/g" "$f"
  sed -i '' "s/'#34D399'/'var(--ag-green)'/g" "$f"
  sed -i '' "s/'#EF4444'/'var(--ag-red)'/g" "$f"
  sed -i '' "s/'#FBBF24'/'var(--ag-yellow)'/g" "$f"
  sed -i '' "s/'#60A5FA'/'var(--ag-blue)'/g" "$f"

  # ─── GRADIENT FIXES ───────────────────────────────────────
  sed -i '' 's/linear-gradient(135deg, #34D399, #2DD4A8)/linear-gradient(135deg, var(--ag-accent), var(--ag-accent-hover))/g' "$f"

  # ─── RGBA with hardcoded values ───────────────────────────
  sed -i '' 's/rgba(52,211,153,0.08)/var(--ag-green-dim)/g' "$f"
  sed -i '' 's/rgba(248,113,113,0.08)/var(--ag-red-dim)/g' "$f"
  sed -i '' 's/rgba(15,22,41,0.85)/var(--ag-bg-card)/g' "$f"

done

echo ""
REMAINING=$(grep -rn '#111827\|#0F1629\|#0F1729\|#080C15\|#0B1120\|#34D399\|#EF4444\|#F87171\|#1E293B' app/ components/ --include="*.tsx" 2>/dev/null | wc -l | xargs)
echo "Remaining hardcoded hex: $REMAINING"
echo ""
echo "Done. Run: git diff --stat"
