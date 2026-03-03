#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# AG360 Theme Migration Script
# Run from project root: bash theme-migrate.sh
# Converts hardcoded hex colors to CSS variables in all TSX files
# ═══════════════════════════════════════════════════════════════

# Target all .tsx files in app/ and components/
FILES=$(find app components -name "*.tsx" -type f)

echo "🎨 AG360 Theme Migration"
echo "========================"
echo "Files found: $(echo "$FILES" | wc -l | xargs)"
echo ""

for f in $FILES; do
  BEFORE=$(md5sum "$f")

  # ─── BACKGROUNDS ──────────────────────────────────────────
  # Card backgrounds
  sed -i '' 's/bg-\[#111827\]/bg-[var(--ag-bg-card)]/g' "$f"
  sed -i '' 's/bg-\[#0F1629\]/bg-[var(--ag-bg-card)]/g' "$f"
  sed -i '' 's/bg-\[#0F1729\]/bg-[var(--ag-bg-card)]/g' "$f"
  # Base backgrounds
  sed -i '' 's/bg-\[#080C15\]/bg-[var(--ag-bg-base)]/g' "$f"
  sed -i '' 's/bg-\[#0B1120\]/bg-[var(--ag-bg-primary)]/g' "$f"
  # Hover/subtle backgrounds
  sed -i '' 's/bg-white\/\[0\.03\]/bg-[var(--ag-bg-hover)]/g' "$f"
  sed -i '' 's/bg-white\/\[0\.04\]/bg-[var(--ag-bg-hover)]/g' "$f"
  sed -i '' 's/bg-white\/\[0\.06\]/bg-[var(--ag-bg-active)]/g' "$f"

  # ─── BORDERS ──────────────────────────────────────────────
  sed -i '' 's/border-white\/\[0\.06\]/border-[var(--ag-border)]/g' "$f"
  sed -i '' 's/border-white\/\[0\.08\]/border-[var(--ag-border)]/g' "$f"
  sed -i '' 's/border-white\/\[0\.10\]/border-[var(--ag-border-solid)]/g' "$f"
  sed -i '' 's/border-\[#1E293B\]/border-[var(--ag-border-solid)]/g' "$f"
  sed -i '' 's/divide-white\/\[0\.04\]/divide-[var(--ag-border)]/g' "$f"
  sed -i '' 's/divide-white\/\[0\.06\]/divide-[var(--ag-border)]/g' "$f"

  # ─── GREEN / ACCENT ──────────────────────────────────────
  # Solid green text
  sed -i '' 's/text-\[#34D399\]/text-[var(--ag-green)]/g' "$f"
  sed -i '' 's/text-\[#6EE7B7\]/text-[var(--ag-green)]/g' "$f"
  # Solid green backgrounds
  sed -i '' 's/bg-\[#34D399\]/bg-[var(--ag-accent)]/g' "$f"
  # Green with opacity → use dim variable
  sed -i '' 's/bg-\[#34D399\]\/\[0\.06\]/bg-[var(--ag-green-dim)]/g' "$f"
  sed -i '' 's/bg-\[#34D399\]\/\[0\.08\]/bg-[var(--ag-green-dim)]/g' "$f"
  sed -i '' 's/bg-\[#34D399\]\/\[0\.12\]/bg-[var(--ag-green-dim)]/g' "$f"
  # Green border
  sed -i '' 's/border-\[#34D399\]\/20/border-[var(--ag-accent-border)]/g' "$f"
  sed -i '' 's/border-\[#34D399\]/border-[var(--ag-accent)]/g' "$f"
  # Green fill (for icons)
  sed -i '' 's/fill-\[#34D399\]/fill-[var(--ag-green)]/g' "$f"

  # ─── RED ──────────────────────────────────────────────────
  sed -i '' 's/text-\[#EF4444\]/text-[var(--ag-red)]/g' "$f"
  sed -i '' 's/text-\[#F87171\]/text-[var(--ag-red)]/g' "$f"
  sed -i '' 's/bg-\[#EF4444\]\/\[0\.08\]/bg-[var(--ag-red-dim)]/g' "$f"
  sed -i '' 's/bg-\[#F87171\]\/\[0\.08\]/bg-[var(--ag-red-dim)]/g' "$f"
  sed -i '' 's/bg-\[#EF4444\]/bg-[var(--ag-red)]/g' "$f"

  # ─── YELLOW / AMBER ──────────────────────────────────────
  sed -i '' 's/text-\[#F59E0B\]/text-[var(--ag-yellow)]/g' "$f"
  sed -i '' 's/text-\[#FBBF24\]/text-[var(--ag-yellow)]/g' "$f"
  sed -i '' 's/bg-\[#F59E0B\]\/\[0\.06\]/bg-[var(--ag-yellow)\/0.06]/g' "$f"
  sed -i '' 's/border-\[#F59E0B\]\/20/border-[var(--ag-yellow)\/0.2]/g' "$f"
  sed -i '' 's/fill-\[#F59E0B\]/fill-[var(--ag-yellow)]/g' "$f"

  # ─── BLUE ────────────────────────────────────────────────
  sed -i '' 's/text-\[#60A5FA\]/text-[var(--ag-blue)]/g' "$f"
  sed -i '' 's/text-\[#38BDF8\]/text-[var(--ag-blue)]/g' "$f"
  sed -i '' 's/bg-\[#60A5FA\]/bg-[var(--ag-blue)]/g' "$f"

  # ─── TEXT ON DARK BG (button text) ───────────────────────
  sed -i '' 's/text-\[#080C15\]/text-[var(--ag-accent-text)]/g' "$f"

  # ─── INLINE STYLE HEX → CSS VARS ────────────────────────
  # backgroundColor
  sed -i '' 's/backgroundColor: "#111827"/backgroundColor: "var(--ag-bg-card)"/g' "$f"
  sed -i '' 's/backgroundColor: "#0F1629"/backgroundColor: "var(--ag-bg-card)"/g' "$f"
  sed -i '' 's/backgroundColor: "#0F1729"/backgroundColor: "var(--ag-bg-card)"/g' "$f"
  sed -i '' 's/backgroundColor: "#080C15"/backgroundColor: "var(--ag-bg-base)"/g' "$f"
  sed -i '' 's/backgroundColor: "#0B1120"/backgroundColor: "var(--ag-bg-primary)"/g' "$f"
  sed -i '' 's/backgroundColor: "#1E293B"/backgroundColor: "var(--ag-border-solid)"/g' "$f"
  sed -i '' 's/backgroundColor: "#34D399"/backgroundColor: "var(--ag-accent)"/g' "$f"
  sed -i '' 's/backgroundColor: "#EF4444"/backgroundColor: "var(--ag-red)"/g' "$f"

  # color
  sed -i '' 's/color: "#F1F5F9"/color: "var(--ag-text-primary)"/g' "$f"
  sed -i '' 's/color: "#94A3B8"/color: "var(--ag-text-secondary)"/g' "$f"
  sed -i '' 's/color: "#64748B"/color: "var(--ag-text-muted)"/g' "$f"
  sed -i '' 's/color: "#475569"/color: "var(--ag-text-dim)"/g' "$f"
  sed -i '' 's/color: "#34D399"/color: "var(--ag-green)"/g' "$f"
  sed -i '' 's/color: "#EF4444"/color: "var(--ag-red)"/g' "$f"
  sed -i '' 's/color: "#F59E0B"/color: "var(--ag-yellow)"/g' "$f"
  sed -i '' 's/color: "#60A5FA"/color: "var(--ag-blue)"/g' "$f"
  sed -i '' 's/color: "#F87171"/color: "var(--ag-red)"/g' "$f"
  sed -i '' 's/color: "#FBBF24"/color: "var(--ag-yellow)"/g' "$f"

  # borderColor
  sed -i '' 's/borderColor: "#1E293B"/borderColor: "var(--ag-border-solid)"/g' "$f"

  # stroke (for SVGs/charts)
  sed -i '' 's/stroke: "#34D399"/stroke: "var(--ag-green)"/g' "$f"
  sed -i '' 's/stroke="#34D399"/stroke="var(--ag-green)"/g' "$f"
  sed -i '' 's/stroke="#F87171"/stroke="var(--ag-red)"/g' "$f"

  # fill (inline)
  sed -i '' 's/fill: "#34D399"/fill: "var(--ag-green)"/g' "$f"
  sed -i '' 's/fill="#34D399"/fill="var(--ag-green)"/g' "$f"
  sed -i '' 's/fill="#EF4444"/fill="var(--ag-red)"/g' "$f"

  # ─── FOCUS BORDER ────────────────────────────────────────
  sed -i '' 's/focus:border-\[#34D399\]\/50/focus:border-[var(--ag-accent-border)]/g' "$f"

  # ─── HOVER STATES ────────────────────────────────────────
  sed -i '' 's/hover:bg-\[#34D399\]/hover:bg-[var(--ag-accent-hover)]/g' "$f"
  sed -i '' 's/hover:bg-\[#6EE7B7\]/hover:bg-[var(--ag-accent-hover)]/g' "$f"
  sed -i '' 's/hover:text-\[#6EE7B7\]/hover:text-[var(--ag-green)]/g' "$f"
  sed -i '' 's/hover:text-\[#34D399\]/hover:text-[var(--ag-green)]/g' "$f"
  sed -i '' 's/hover:bg-white\/\[0\.08\]/hover:bg-[var(--ag-bg-active)]/g' "$f"
  sed -i '' 's/hover:text-ag-secondary/hover:text-[var(--ag-text-secondary)]/g' "$f"

  AFTER=$(md5sum "$f")
  if [ "$BEFORE" != "$AFTER" ]; then
    CHANGES=$(diff <(echo "$BEFORE") <(echo "$AFTER") | wc -l)
    echo "  ✅ $f (modified)"
  fi
done

echo ""
echo "─────────────────────────────────────"
echo "Migration complete!"
echo ""
echo "⚠️  MANUAL REVIEW NEEDED:"
echo "  1. Search for remaining hex: grep -rn '#[0-9A-Fa-f]\{6\}' app/ components/"
echo "  2. Check inline styles: grep -rn 'backgroundColor:.*#' app/ components/"
echo "  3. Check Recharts fill/stroke props still using hex"
echo "  4. Test all 4 themes visually"
echo ""
echo "Run: git diff --stat  to see what changed"
