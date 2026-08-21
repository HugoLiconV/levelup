# 01 — Plan data model, pure logic, and test infrastructure

**What to build:** The foundation the rest of the Nutrition Plan feature builds on. No user-facing UI in this ticket — it's verified by its own test suite. Add Vitest as the repo's first test runner, extend `AppState` with the Plan data model, and implement the pure functions that resolve which plan/day-type applies to a date, derive a `Meal` from a checked-off slot, and aggregate a weekly shopping list from ingredient quantities.

See `.scratch/nutrition-plan/spec.md` for full context — this ticket covers the "Data model", "Plan resolution", "Slot checkbox → Meal creation" (the derivation function only, not the UI), and "Shopping list" (the aggregation function only) sections of "Implementation Decisions", plus all of "Testing Decisions".

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [x] Vitest is added as a dev dependency with a minimal config and a `test` script in `package.json`
- [x] `AppState` (in `app/lib/levelup.ts`) gains: `plans: Plan[]`, `planSlotCompletions: PlanSlotCompletion[]`, `planSupplementLogs: PlanSupplementLog[]`, `shoppingListState`; legacy supplement state remains until issue 05 migrates it
- [x] Types added: `Plan { id, startDate, endDate: string | null, dayTypes: DayType[], supplements: PlanSupplement[] }`, stable `DayType`/`PlanSlot` identifiers, `DayType.references` for reference-only text, `PlanDish { name, tags: MealTag[], ingredients: PlanIngredient[] }`, `PlanIngredient { name, quantityText, grams: number | null, unit: "g" | "ml" | null }`, and `PlanSupplement { name, doseText }`
- [x] Pure function `getActivePlanForDate` resolves the active `Plan` for a given date (matching `[startDate, endDate)`, most recent match wins on overlap)
- [x] Pure function `getDayTypeForDate` resolves the active `DayType` for a given date from the active plan (matches the date's weekday against `dayTypes[].weekdays`)
- [x] Pure function `deriveMealFromPlanSlot` derives a `Meal` shape (type, description, union of tags) from a `PlanSlot`
- [x] Pure function `getWeeklyShoppingList` sums quantified ingredient amounts per normalized ingredient and unit across active days in the week; reference-only text and dishes with no ingredients do not enter the list; ingredients without numeric equivalents are listed separately with their original `quantityText`
- [x] Unit tests for all three functions, using the real menu text supplied in the conversation as fixture data — including concrete regression cases for `Pepino: 2,236 g` and `Aguacate: 796 g` per week
- [x] `CONTEXT.md` and `docs/adr/0001-plan-data-stays-in-localstorage.md` vocabulary/decisions are respected (no Supabase calls, terms match the glossary)
