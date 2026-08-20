# 06 — Weekly shopping list with bought checkboxes

**What to build:** In Guía de comida, show a shopping list for the current week, auto-computed from the active plan's ingredients (using the aggregation function from ticket 01), with "bought" checkboxes that persist until the user manually clears them.

See `.scratch/nutrition-plan/spec.md`, "Shopping list" and "UI" (Guía de comida bullet) sections, and stories 11-14.

**Blocked by:** 02 — Paste and save a new Plan version

**Status:** ready-for-agent

- [ ] Guía de comida shows a shopping list for the current week, computed via the aggregation function from ticket 01 (summed grams per ingredient across the week's day-type occurrences; ingredients without grams listed separately with original quantity text)
- [ ] Each item has a "bought" checkbox, backed by `shoppingListState`
- [ ] Checked state persists across reloads and does not reset automatically (no weekly auto-reset)
- [ ] An explicit manual action clears/resets the checked state (e.g. a "start new list" or "clear checks" control)
- [ ] When no plan is active for today, no shopping list is shown (consistent with the fallback behavior in ticket 03)
