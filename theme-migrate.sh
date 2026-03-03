#!/bin/bash
set -e
echo "🎨 AG360 Theme Migration"

# Step 1: Add utility classes before @layer base
if grep -q "AG360 Theme Utilities" app/globals.css; then
  echo "⏭ Utilities already present"
else
  sed -i '' '/@layer base {/i\
/* AG360 Theme Utilities */\
@layer utilities {\
  .bg-ag-base { background-color: var(--ag-bg-base); }\
  .bg-ag-primary { background-color: var(--ag-bg-primary); }\
  .bg-ag-secondary { background-color: var(--ag-bg-secondary); }\
  .bg-ag-card { background-color: var(--ag-bg-card); }\
  .bg-ag-hover { background-color: var(--ag-bg-hover); }\
  .bg-ag-active { background-color: var(--ag-bg-active); }\
  .border-ag { border-color: var(--ag-border); }\
  .border-ag-subtle { border-color: var(--ag-border-subtle); }\
  .border-ag-hover { border-color: var(--ag-border-hover); }\
  .text-ag-primary { color: var(--ag-text-primary); }\
  .text-ag-secondary { color: var(--ag-text-secondary); }\
  .text-ag-muted { color: var(--ag-text-muted); }\
  .text-ag-dim { color: var(--ag-text-dim); }\
  .text-ag-accent { color: var(--ag-accent); }\
  .text-ag-blue { color: var(--ag-blue); }\
  .text-ag-yellow { color: var(--ag-yellow); }\
  .text-ag-red { color: var(--ag-red); }\
  .text-ag-green { color: var(--ag-green); }\
  .shadow-ag { box-shadow: var(--ag-shadow); }\
}\
' app/globals.css
  echo "✅ Added utility classes"
fi

# Step 2: Bulk replace
echo "Replacing hardcoded colors..."
DIRS="app/(app) components"
for dir in $DIRS; do
  [ -d "$dir" ] || continue
  find "$dir" -name "*.tsx" -exec sed -i '' \
    -e 's/bg-\[#0B1120\]/bg-ag-primary/g' \
    -e 's/bg-\[#080C15\]/bg-ag-base/g' \
    -e 's/bg-\[#0F1629\]/bg-ag-card/g' \
    -e 's/border-\[#1E293B\]/border-ag/g' \
    -e 's/border-\[#334155\]/border-ag-hover/g' \
    -e 's/text-\[#F1F5F9\]/text-ag-primary/g' \
    -e 's/text-\[#E2E8F0\]/text-ag-primary/g' \
    -e 's/text-\[#94A3B8\]/text-ag-secondary/g' \
    -e 's/text-\[#64748B\]/text-ag-muted/g' \
    -e 's/text-\[#475569\]/text-ag-dim/g' \
    {} +
done

echo "✅ Replacements done"

# Step 3: Count remaining
remaining=$(grep -rn 'bg-\[#0B1120\]\|bg-\[#0F1629\]\|border-\[#1E293B\]\|text-\[#F1F5F9\]\|text-\[#E2E8F0\]\|text-\[#94A3B8\]\|text-\[#64748B\]\|text-\[#475569\]' "app/(app)/" components/ --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')
echo "Remaining hardcoded: $remaining"
echo "🧪 Test: npm run dev → Settings → Appearance → toggle themes"
