#!/bin/sh
echo "AG360 Theme Migration — Pass 3 (final cleanup)"
echo "================================================"

FILES=$(find app components -name "*.tsx" -type f)

for f in $FILES; do

  # ─── #1E293B remaining contexts ────────────────────────
  sed -i '' 's/divide-\[#1E293B\]\/60/divide-[var(--ag-border-solid)]\/60/g' "$f"
  sed -i '' 's/hover:bg-\[#1E293B\]\/30/hover:bg-[var(--ag-bg-active)]/g' "$f"
  sed -i '' 's/hover:bg-\[#1E293B\]/hover:bg-[var(--ag-bg-active)]/g' "$f"
  sed -i '' 's/bg-\[#1E293B\]\/50/bg-[var(--ag-border-solid)]\/50/g' "$f"
  sed -i '' 's/bg-\[#1E293B\]/bg-[var(--ag-border-solid)]/g' "$f"
  sed -i '' 's/border-\[#1E293B\]/border-[var(--ag-border-solid)]/g' "$f"
  sed -i '' 's/border-\[var(--ag-border-solid)\]/border-[var(--ag-border-solid)]/g' "$f"
  sed -i '' "s/1px solid #1E293B/1px solid var(--ag-border-solid)/g" "$f"
  sed -i '' "s/h-px bg-\[#1E293B\]/h-px bg-[var(--ag-border-solid)]/g" "$f"

  # ─── #22C55E (green variant) ───────────────────────────
  sed -i '' 's/bg-\[#22C55E\]\/10/bg-[var(--ag-green-dim)]/g' "$f"
  sed -i '' 's/bg-\[#22C55E\]\/30/bg-[var(--ag-accent-border)]/g' "$f"
  sed -i '' 's/border-\[#22C55E\]\/30/border-[var(--ag-accent-border)]/g' "$f"
  sed -i '' 's/bg-\[#22C55E\]/bg-[var(--ag-accent)]/g' "$f"
  sed -i '' 's/text-\[#22C55E\]/text-[var(--ag-green)]/g' "$f"
  sed -i '' 's/hover:bg-\[#16A34A\]/hover:bg-[var(--ag-accent-hover)]/g' "$f"
  sed -i '' 's/text-\[#0B1120\]/text-[var(--ag-accent-text)]/g' "$f"
  sed -i '' 's/hover:bg-\[#334155\]/hover:bg-[var(--ag-bg-active)]/g' "$f"

  # ─── Focus ring ────────────────────────────────────────
  sed -i '' 's/focus:ring-\[#34D399\]/focus:ring-[var(--ag-accent)]/g' "$f"
  sed -i '' 's/focus:ring-2 focus:ring-\[var(--ag-green)\]/focus:ring-2 focus:ring-[var(--ag-accent)]/g' "$f"
  sed -i '' 's/focus:border-\[#EF4444\]\/40/focus:border-[var(--ag-red)]\/40/g' "$f"
  sed -i '' 's/focus:border-\[var(--ag-red)\]\/40/focus:border-[var(--ag-red)]\/40/g' "$f"

  # ─── Border with opacity on red ────────────────────────
  sed -i '' 's/border-\[#EF4444\]\/10/border-[var(--ag-red)]\/10/g' "$f"
  sed -i '' 's/border-\[#EF4444\]\/30/border-[var(--ag-red)]\/30/g' "$f"
  sed -i '' 's/border-\[#EF4444\]\/40/border-[var(--ag-red)]\/40/g' "$f"
  sed -i '' 's/hover:border-\[#EF4444\]\/40/hover:border-[var(--ag-red)]\/40/g' "$f"
  sed -i '' 's/hover:border-\[var(--ag-red)\]\/40/hover:border-[var(--ag-red)]\/40/g' "$f"

  # ─── #F87171 with opacity ──────────────────────────────
  sed -i '' 's/bg-\[#F87171\]\/\[0\.06\]/bg-[var(--ag-red-dim)]/g' "$f"
  sed -i '' 's/border-\[#F87171\]\/\[0\.15\]/border-[var(--ag-red)]\/15/g' "$f"
  sed -i '' "s/background: isOverdue ? '#F87171'/background: isOverdue ? 'var(--ag-red)'/g" "$f"

  # ─── Weather gradient Tailwind classes ─────────────────
  sed -i '' 's/from-\[#34D399\]\/20/from-[var(--ag-green)]\/20/g' "$f"
  sed -i '' 's/to-\[#34D399\]\/5/to-[var(--ag-green)]\/5/g' "$f"
  sed -i '' 's/from-\[var(--ag-green)\]\/20/from-[var(--ag-green)]\/20/g' "$f"

  # ─── Weather page background gradient ──────────────────
  sed -i '' "s/linear-gradient(135deg, #111827 0%, #0F172A 50%, #111827 100%)/linear-gradient(135deg, var(--ag-bg-card) 0%, var(--ag-bg-primary) 50%, var(--ag-bg-card) 100%)/g" "$f"

  # ─── Overview page remaining ───────────────────────────
  sed -i '' "s/background: isOverdue ? 'var(--ag-red)' : '#F59E0B'/background: isOverdue ? 'var(--ag-red)' : 'var(--ag-yellow)'/g" "$f"

  # ─── LandingPage gradients ────────────────────────────
  sed -i '' "s/linear-gradient(145deg, #0C1220 0%, #111827 100%)/linear-gradient(145deg, var(--ag-bg-base) 0%, var(--ag-bg-card) 100%)/g" "$f"
  sed -i '' "s/linear-gradient(135deg, #34D399, #10B981)/linear-gradient(135deg, var(--ag-accent), var(--ag-accent-hover))/g" "$f"
  sed -i '' "s/linear-gradient(135deg, #34D399, #6EE7B7)/linear-gradient(135deg, var(--ag-accent), var(--ag-green))/g" "$f"
  sed -i '' "s/linear-gradient(to bottom, transparent, #34D399)/linear-gradient(to bottom, transparent, var(--ag-accent))/g" "$f"
  sed -i '' "s/linear-gradient(90deg, transparent, #34D399, transparent)/linear-gradient(90deg, transparent, var(--ag-accent), transparent)/g" "$f"
  sed -i '' "s/color: #080C15/color: var(--ag-accent-text)/g" "$f"

  # ─── LandingPage CSS string (inside template literal) ──
  sed -i '' "s/background: linear-gradient(135deg, #34D399, #10B981)/background: linear-gradient(135deg, var(--ag-accent), var(--ag-accent-hover))/g" "$f"

done

echo ""
REMAINING=$(grep -rn '#111827\|#0F1629\|#0F1729\|#080C15\|#0B1120\|#34D399\|#EF4444\|#F87171\|#1E293B' app/ components/ --include="*.tsx" 2>/dev/null | wc -l | xargs)
echo "Remaining hardcoded hex: $REMAINING"
echo "Done. Run: git diff --stat"
