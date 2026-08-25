# 03 — View the active plan in Guía de comida

**What to build:** The Guía de comida tab becomes the plan's home. When a plan is active for today, replace its current generic-guidance content with a viewer showing the full plan: every day-type, every slot, every dish, ingredients. When no plan is active (before any plan is entered, or after all entered plans have ended), keep showing the existing generic prioritize/limit guidance exactly as it works today.

See `.scratch/nutrition-plan/spec.md`, "UI" section (Guía de comida bullet) and stories 4, 5, 16.

**Blocked by:** 02 — Paste and save a new Plan version

**Status:** ready-for-agent

**Design verdict (2026-08-24):** Keep Option 1, the weekly agenda. The seven-day
tab strip is the stable navigation model (including when every day eventually
has its own menu), while each selected day shows every meal, dish, ingredient,
and authored measurement in one readable sheet. The exploratory variants and
research are preserved on `codex/active-plan-menu-prototype` at `a36e01b`.

- [ ] When a `Plan` is active for today (per the resolution function from ticket 01), Guía de comida renders that plan: all of its `dayTypes`, each with its `slots`, `dishes`, and ingredients
- [ ] The active day-type (matching today's actual weekday) is visually distinguished from other day-types in the same plan, so the user can tell at a glance which one applies today
- [ ] Water-only reference entries (e.g. "Al despertar: Agua 300ml") are shown as plain text, not as interactive/trackable elements
- [ ] Supplement list from the active plan is shown for reference in this view
- [ ] The entry point for pasting a new plan (from ticket 02) is reachable from this tab
- [ ] When no plan is active for today, this tab shows the existing generic `NutritionPlan` guidance unchanged — no regression to current behavior
