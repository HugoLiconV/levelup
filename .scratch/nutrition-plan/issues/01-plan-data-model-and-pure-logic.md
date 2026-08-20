# 01 — Plan data model, pure logic, and test infrastructure

**What to build:** The foundation the rest of the Nutrition Plan feature builds on. No user-facing UI in this ticket — it's verified by its own test suite. Add Vitest as the repo's first test runner, extend `AppState` with the Plan data model, and implement the pure functions that resolve which plan/day-type applies to a date, derive a `Meal` from a checked-off slot, and aggregate a weekly shopping list from ingredient quantities.

See `.scratch/nutrition-plan/spec.md` for full context — this ticket covers the "Data model", "Plan resolution", "Slot checkbox → Meal creation" (the derivation function only, not the UI), and "Shopping list" (the aggregation function only) sections of "Implementation Decisions", plus all of "Testing Decisions".

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] Vitest is added as a dev dependency with a minimal config and a `test` script in `package.json`
- [ ] `AppState` (in `app/lib/levelup.ts`) gains: `plans: Plan[]`, `planSlotCompletions: PlanSlotCompletion[]`, `planSupplementLogs: PlanSupplementLog[]`, `shoppingListState`
- [ ] Types added: `Plan { id, startDate, endDate: string | null, dayTypes: DayType[], supplements: PlanSupplement[] }`, `DayType { weekdays: Weekday[], slots: PlanSlot[] }` (generic list — not fixed `dayTypeA`/`dayTypeB`), `PlanSlot { name, dishes: PlanDish[] }`, `PlanDish { name, tags: MealTag[], ingredients: PlanIngredient[] }`, `PlanIngredient { name, quantityText, grams: number | null }`, `PlanSupplement { name, doseText }`
- [ ] Pure function resolves the active `Plan` for a given date (matching `[startDate, endDate)`, most recent match wins on overlap)
- [ ] Pure function resolves the active `DayType` for a given date from the active plan (matches the date's weekday against `dayTypes[].weekdays`)
- [ ] Pure function derives a `Meal` shape (type, description, union of tags) from a `PlanSlot`
- [ ] Pure function aggregates a weekly shopping list: sums `grams` per ingredient across all occurrences in the week (weighted by how many times each day-type occurs that week); ingredients without `grams` are listed separately with their original `quantityText`
- [ ] Unit tests for all three functions, using the real menu text from `.scratch/nutrition-plan/spec.md` (or the conversation it came from) as fixture data — including a concrete regression case for the pepino/aguacate gram totals
- [ ] `CONTEXT.md` and `docs/adr/0001-plan-data-stays-in-localstorage.md` vocabulary/decisions are respected (no Supabase calls, terms match the glossary)
