# 05 — Per-supplement daily checkboxes

**What to build:** Replace the app's current single-supplement setting (`supplementName`/`supplementDose`/`supplementLogs`, one combined daily checkbox) with a checkbox per supplement, sourced from the active plan's `supplements` list — e.g. Bioleven, Omega 3, and Vitamina E each tracked independently, all with daily cadence.

See `.scratch/nutrition-plan/spec.md`, "Supplements" section, and story 9.

**Blocked by:** 02 — Paste and save a new Plan version

**Status:** ready-for-agent

- [ ] For each supplement in the active plan, a separate daily checkbox is shown (in Registro or wherever the current single supplement checkbox lives today) and logged into `planSupplementLogs` (date + supplement name)
- [ ] All supplements in the active plan get daily checkboxes — no cadence-based exclusion (Vitamina E is tracked the same as Bioleven and Omega 3)
- [ ] The existing `omega` XP quest is repointed to read from the new per-supplement logs (either "any plan supplement taken today" or reworked into one quest per supplement — implementer's call, documented in the PR)
- [ ] The old `supplementName`/`supplementDose` settings fields and `supplementLogs` are removed once no longer referenced, with `loadState` handling the migration for existing localStorage data gracefully (no crash on old saved state)
- [ ] On a day with no active plan, supplement tracking falls back sensibly (e.g. no checkboxes shown, or continues showing the last-known plan's supplements — implementer's call, should not crash or show stale unlabeled checkboxes)
