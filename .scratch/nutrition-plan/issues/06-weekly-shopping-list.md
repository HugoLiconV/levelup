# 06 — Weekly shopping list with bought checkboxes

**What to build:** In Guía de comida, show a shopping list for the current week, auto-computed from the active plan's ingredients (using the aggregation function from ticket 01), with "bought" checkboxes that persist until the user manually clears them.

See `.scratch/nutrition-plan/spec.md`, "Shopping list" and "UI" (Guía de comida bullet) sections, and stories 11-14.

**Blocked by:** 02 — Paste and save a new Plan version

**Status:** done

- [x] Compras shows a shopping list for the current week, computed via the aggregation function from ticket 01 (summed grams per ingredient across the week's day-type occurrences; ingredients without grams listed separately with original quantity text)
- [x] Each item has a "bought" checkbox, backed by `shoppingListState`
- [x] Checked state persists across reloads and does not reset automatically (no weekly auto-reset)
- [x] An explicit manual action clears/resets the checked state ("Empezar una lista nueva")
- [x] When no plan is active for today, Compras shows an empty state with a quick link to add a Plan
