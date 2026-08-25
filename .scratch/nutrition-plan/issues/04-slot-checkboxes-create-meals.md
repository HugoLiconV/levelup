# 04 — Slot checkboxes in Registro auto-create Meals

**What to build:** In the Registro tab, today's prescribed slots (from the active plan's active day-type) appear as one-tap checkboxes alongside the existing freeform "add meal" entry point. Checking a slot creates a tagged `Meal` automatically; unchecking removes it. Deviating from the plan still works exactly as today, via freeform entry.

See `.scratch/nutrition-plan/spec.md`, "Slot checkbox → Meal creation" and "UI" (Registro bullet) sections, and stories 6-8.

**Blocked by:** 02 — Paste and save a new Plan version

**Status:** ready-for-agent

**Design verdict (2026-08-24):** Keep Option 1, the explicit plan checklist. It
makes every prescribed slot and its completion state visible at once, while a
quiet “Registrar algo diferente” action inside the same card preserves the
freeform path without competing with the plan.

- [x] Registro shows one checkbox per slot in today's active day-type (using the resolution functions from ticket 01), alongside the existing freeform meal entry — freeform entry is not removed or hidden
- [x] Checking a slot creates a `Meal` using the slot→Meal derivation function from ticket 01 (type inferred from slot name, description from dish names, tags = union of the slot's dishes' tags) and records a `PlanSlotCompletion` linking date/plan/slot to the created `Meal.id`
- [x] Unchecking a slot removes both the `PlanSlotCompletion` and its linked `Meal`
- [x] Existing scoring/XP/achievements (`getDayScore`, `getDailyXp`, `getUnlockedAchievementIds`, etc.) require no changes and correctly react to plan-created `Meal`s exactly as they would to freeform ones
- [x] On a day with no active plan, Registro behaves exactly as it does today (freeform entry only, no checkboxes)
