Status: ready-for-agent

# Nutrition Plan

## Problem Statement

The user built this app to motivate themselves to follow their doctor's health recommendations. Their nutritionist just gave them a printed diet: two alternating day-type menus (one for Lun/Mié/Vie/Dom, one for Mar/Jue/Sáb), each with several timed meal slots, specific dishes and quantities, plus three daily supplements. They'll see her again in 2-3 weeks and get an updated menu.

Today the app only supports freeform meal logging (a typed description + tags picked from a fixed list) and a single generic supplement checkbox. There's no way to bring the nutritionist's actual prescribed plan into the app, no way to check daily adherence against it, and no way to track the weekly shopping list her plan implies. The user currently has to keep the printed menu on paper.

## Solution

Add a versioned **Plan** concept: the user pastes the raw menu text she gives them, an AI-parsing step converts it into structured day-types/slots/dishes/ingredients/supplements, and the user reviews and saves it. From then on:

- The **Registro** tab shows today's prescribed slots as one-tap checkboxes (in addition to the existing freeform entry); checking a slot auto-creates a `Meal` with derived tags, so existing scoring/XP/achievements keep working unchanged. Deviating from the plan still uses the existing freeform entry.
- Each of the plan's supplements gets its own daily checkbox, replacing the current single-supplement setting.
- The **Guía de comida** tab becomes the plan's home: it shows the active plan's full menu (all day-types), a weekly shopping list auto-aggregated from ingredient quantities (with manually-resettable "bought" checkboxes), and the entry point for pasting a new plan version. When no plan is active, it falls back to today's existing generic prioritize/limit guidance.

All new data extends the existing localStorage `AppState` (see [ADR-0001](../../docs/adr/0001-plan-data-stays-in-localstorage.md)) — single device, no Supabase involvement.

## User Stories

1. As a user who just got a new menu from their nutritionist, I want to paste the raw menu text into the app, so that I don't have to manually re-type every dish and quantity into a form.
2. As a user pasting a new menu, I want the app to parse it into structured day-types, slots, dishes, ingredients, and supplements using AI, so that entry is fast.
3. As a user reviewing an AI-parsed plan, I want to see and correct the parsed structure before saving it, so that parsing mistakes don't silently corrupt my plan.
4. As a user with an active plan, I want to view all of its day-types and slots in the Guía de comida tab, so that I can check what I'm supposed to eat without digging out the printed paper.
5. As a user, I want the plan I see to always reflect which day-type applies to today's actual weekday, so that I don't have to remember which day-type I'm on.
6. As a user in the Registro tab, I want to see today's prescribed slots as checkboxes, so that logging what I ate takes one tap instead of typing a description.
7. As a user who checks a prescribed slot, I want a `Meal` entry to be created automatically with tags derived from that slot's dishes, so that my existing XP/scoring/achievements keep working without extra effort.
8. As a user who ate something different from what was prescribed, I want to still log a freeform meal entry for that slot, so that deviations are captured accurately rather than forced into an inaccurate checkbox.
9. As a user, I want to check off Bioleven, Omega 3, and Vitamina E as three separate daily items, so that I can tell whether I took each one specifically, not just "some supplement."
10. As a user, I want plain water reminders in the menu (e.g. "Agua 300ml al despertar") to be shown as reference text only, so that they don't create a second, disconnected water-tracking mechanism alongside the one I already use.
11. As a user, I want to see a shopping list for the current week, auto-computed from the active plan's ingredient quantities, so that I don't have to manually copy her separate shopping list into the app.
12. As a user, I want ingredient quantities that repeat across dishes (e.g. pepino appearing in multiple slots with different units) to be summed by their gram/ml equivalent into one weekly total per ingredient, so that the shopping list tells me how much to actually buy.
13. As a user, I want to check off shopping list items as I buy them, so that I can use the list while actually at the store.
14. As a user, I want the shopping list's checked state to persist until I manually clear it, so that it doesn't reset itself while I'm still mid-shop or before I've gone yet.
15. As a user whose nutritionist gives them a new menu in a few weeks, I want to enter the new plan as a new version (with its own start date) rather than overwrite the old one, so that past adherence history stays attributable to the plan that was actually active at the time.
16. As a user without any active plan (e.g. before their first visit, or after all entered plans have ended), I want the Guía de comida tab to fall back to the existing generic prioritize/limit guidance, so that the tab is never empty of useful content.
17. As a developer, I want the day-type structure to support any number of variants (not just exactly two), so that a future plan with one day-type (same every day) or three+ doesn't require a schema change.

## Implementation Decisions

**Data model** (extends the existing localStorage `AppState` in `app/lib/levelup.ts`):

- `Plan { id, startDate, endDate: string | null, dayTypes: DayType[], supplements: PlanSupplement[] }`
  - `DayType { weekdays: Weekday[], slots: PlanSlot[] }` — a generic list, not fixed `dayTypeA`/`dayTypeB` fields. `Weekday` is one of the 7 day names/indices consistent with existing date helpers (`toDateInput`, `getWeekStart`, etc.).
  - `PlanSlot { name: string, dishes: PlanDish[] }` — `name` corresponds to the menu's own slot labels (Desayuno, Comida, Cena, Media tarde, etc.); "Al despertar"/"Medio día" water-only entries are represented as reference text, not as trackable slots (see story 10).
  - `PlanDish { name: string, tags: MealTag[], ingredients: PlanIngredient[] }` — `tags` are derived once at parse/review time (reusing the existing `MealTag` vocabulary and the classification approach already used in `meal-tags-server.ts`), stored on the dish so slot-checkbox → `Meal` creation doesn't need to re-derive tags at log time.
  - `PlanIngredient { name: string, quantityText: string, grams: number | null }` — `quantityText` preserves the original text (e.g. "⅓ taza"); `grams` is the parsed gram/ml equivalent used for shopping-list aggregation, null when the source menu doesn't state one.
  - `PlanSupplement { name: string, doseText: string }` — e.g. Bioleven / "1 cápsula por día", Omega 3 / "1 cucharada en la noche", Vitamina E / "800 mg". All three get daily checkboxes (no cadence-based exclusion).
- `AppState` gains: `plans: Plan[]`, `planSlotCompletions: PlanSlotCompletion[]` (date + planId + dayType/slot identifier + linked `Meal.id`, mirroring the shape of existing per-date logs like `supplementLogs`), `planSupplementLogs: PlanSupplementLog[]` (date + supplement name, replacing the single `supplementName`/`supplementDose`/`supplementLogs` settings fields), and `shoppingListState` (per-ingredient bought/not-bought flags, manually cleared — not scoped per plan version, since it tracks a physical shopping trip in progress).
- `NutritionPlan` (the existing loose prioritize/limit/notes type) is unchanged and continues to serve as the no-active-plan fallback content shown in Guía de comida.

**Plan resolution:**
- A pure function resolves "the plan active for a given date" by finding the `Plan` whose `[startDate, endDate)` range contains it (most recent match wins if ranges ever overlap, though normal entry shouldn't produce overlaps).
- A pure function resolves "today's day-type" by finding the entry in the active plan's `dayTypes` whose `weekdays` includes the given date's weekday.

**Slot checkbox → Meal creation:**
- Checking a `PlanSlot` for today creates a `Meal` (`type` inferred from the slot name mapped to the existing `MealType` enum, `description` = the slot's dish names joined, `tags` = the union of all dishes' tags in that slot) and records a `PlanSlotCompletion` linking date/plan/slot to the created `Meal.id`. Unchecking removes both.
- This reuses the existing `Meal` list end-to-end — `getDayScore`, `getDailyXp`, `getUnlockedAchievementIds`, etc. require no changes.

**Supplements:**
- Replaces the single `supplementName`/`supplementDose` settings fields and `supplementLogs` with per-supplement daily logs (`planSupplementLogs`) sourced from the active plan's `supplements` list. The existing `omega` `QuestId`/XP slot is repointed to "any of today's plan supplements taken" (or reworked into one quest per supplement — left to the implementing agent to decide against the existing quest UI, since it's a settings/XP-tuning detail, not a data-model decision).

**Shopping list:**
- Computed (not stored precomputed) by a pure function: for the active plan and a given week, sum each ingredient's `grams` across every slot/dish occurrence, multiplied by how many times that ingredient's day-type occurs in the week. Ingredients without a `grams` value are listed with their original `quantityText`, ungrouped.
- `shoppingListState` (bought/not-bought per ingredient name) persists independently of the computed list and is only cleared by an explicit user action (no automatic weekly reset).

**Plan entry (paste + AI parse):**
- New API route (sibling to `app/api/meal-tags/route.ts`, same pattern: server-only OpenAI call, structured JSON-schema output, `MealTagsConfigurationError`-style config-missing handling) takes raw pasted menu text and returns a structured `Plan` draft (day-types, slots, dishes, ingredients with grams where derivable, supplements).
- The user reviews/edits the draft in the UI before it's saved into `plans` — parsing errors or omissions are correctable, never silently trusted.

**UI:**
- **Registro tab**: for each of today's active day-type slots, render a checkbox alongside (not replacing) the existing freeform "add meal" entry point.
- **Guía de comida tab**: when a plan is active, replace the current generic-guidance content with the plan viewer (all day-types/slots/dishes), the weekly shopping list, supplement reference, and a "enter new plan" action (opens the paste/parse/review flow). When no plan is active for today, render the existing generic `NutritionPlan` guidance as-is.

## Testing Decisions

No test runner currently exists in this repo — this feature introduces the first automated tests via **Vitest**, added as a new dev dependency with a minimal config, plus a `test` script in `package.json`.

Tests should cover only the pure functions added to the `lib` layer — no React component tests, no localStorage/browser mocking, matching the "data in → data out" shape already used by every existing function in `levelup.ts` (`getDayScore`, `getWeeklyStats`, etc., none of which take DOM/browser state as input):

- **Plan/day-type resolution**: given a set of `Plan`s and a date, resolves the correct active plan and day-type; correctly picks the day-type matching the date's weekday; returns "no active plan" outside any range.
- **Slot → Meal derivation**: given a `PlanSlot`, produces the expected `Meal` shape (type, description, union of tags).
- **Shopping list aggregation**: given a `Plan` and a week, sums `grams` correctly across repeated ingredient occurrences and day-type weekly frequency; ingredients without `grams` fall back to listing `quantityText` ungrouped; verify against the actual pepino/aguacate figures from the source menu as a concrete regression case.

The AI-parse API route itself is not unit-tested (matches existing practice for `meal-tags/route.ts`, which has no tests) — its output is always user-reviewed before being saved, so correctness there is a UX/review concern, not a place to assert exact AI output.

## Out of Scope

- Dish-level or ingredient-level daily adherence tracking (only slot-level, for now — may be revisited later per the user).
- Multi-device sync / Supabase-backed storage for plan data (see ADR-0001).
- Automatic weekly reset of the shopping list's bought/not-bought state.
- Wiring plan water reminders into the existing water-tracking system.
- Nutritional/calorie computation of any kind — this is adherence tracking, not a nutrition-analysis feature.
- Editing/removing individual past plan versions once entered (only adding new versions).

## Further Notes

- The user confirmed the goal of the existing "Guía de comida" tab was always meant to hold exactly this kind of prescribed-plan content, so replacing its default view (while keeping the current generic guidance as a fallback) is intentional, not a regression.
- Both source menus (Lun/Mié/Vie/Dom and Mar/Jue/Sáb) and the supplement list from the user's most recent nutritionist visit are available in this conversation's history and can be used as the concrete parsing/test fixture for the first `Plan` entered.
