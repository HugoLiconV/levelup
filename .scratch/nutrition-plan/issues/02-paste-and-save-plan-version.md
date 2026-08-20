# 02 — Paste and save a new Plan version

**What to build:** The end-to-end flow for entering a new nutritionist menu: paste the raw text, have it AI-parsed into a structured draft, review/correct it, and save it as a new versioned `Plan`. This is the entry point every other ticket in this feature depends on — nothing downstream works without a saved `Plan`.

See `.scratch/nutrition-plan/spec.md`, "Plan entry (paste + AI parse)" section, and story 1-3 and 15-17.

**Blocked by:** 01 — Plan data model, pure logic, and test infrastructure

**Status:** ready-for-agent

- [ ] A new server-only API route accepts raw pasted menu text and returns a structured `Plan` draft (day-types, slots, dishes with derived `MealTag`s, ingredients with grams where derivable, supplements), following the same pattern as `app/api/meal-tags/route.ts` (`app/lib/meal-tags-server.ts`: server-only OpenAI call, structured JSON-schema output, config-missing error class)
- [ ] A UI flow to paste menu text, trigger parsing, and see the resulting draft
- [ ] The user can review and edit the parsed draft (day-types, slots, dishes, ingredients, supplements) before saving — parsing mistakes are correctable, never silently trusted
- [ ] Saving assigns a `startDate` (defaulting to today) and appends the new `Plan` to `AppState.plans` — existing plans are never overwritten or deleted
- [ ] Entering a new plan works standalone even before tickets 03-06 exist (e.g. verify via a temporary/minimal read-out of the saved plan, or by inspecting exported app data) — full viewing UI is ticket 03
- [ ] Reload the app after saving: the plan persists (localStorage-backed, per ADR-0001)
