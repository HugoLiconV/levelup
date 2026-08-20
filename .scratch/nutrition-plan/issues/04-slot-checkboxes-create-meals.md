# 04 — Slot checkboxes in Registro auto-create Meals

**What to build:** In the Registro tab, today's prescribed slots (from the active plan's active day-type) appear as one-tap checkboxes alongside the existing freeform "add meal" entry point. Checking a slot creates a tagged `Meal` automatically; unchecking removes it. Deviating from the plan still works exactly as today, via freeform entry.

See `.scratch/nutrition-plan/spec.md`, "Slot checkbox → Meal creation" and "UI" (Registro bullet) sections, and stories 6-8.

**Blocked by:** 02 — Paste and save a new Plan version

**Status:** ready-for-agent

- [ ] Registro shows one checkbox per slot in today's active day-type (using the resolution functions from ticket 01), alongside the existing freeform meal entry — freeform entry is not removed or hidden
- [ ] Checking a slot creates a `Meal` using the slot→Meal derivation function from ticket 01 (type inferred from slot name, description from dish names, tags = union of the slot's dishes' tags) and records a `PlanSlotCompletion` linking date/plan/slot to the created `Meal.id`
- [ ] Unchecking a slot removes both the `PlanSlotCompletion` and its linked `Meal`
- [ ] Existing scoring/XP/achievements (`getDayScore`, `getDailyXp`, `getUnlockedAchievementIds`, etc.) require no changes and correctly react to plan-created `Meal`s exactly as they would to freeform ones
- [ ] On a day with no active plan, Registro behaves exactly as it does today (freeform entry only, no checkboxes)
