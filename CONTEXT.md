# Level Up

A gamified habit-tracking app for following a doctor/nutritionist-prescribed health routine (meals, movement, water, supplements), turning daily adherence into XP, levels, and achievements.

## Language

**Plan**:
A nutritionist-prescribed set of meals and supplements, valid over a date range (`startDate`, optional `endDate`). A new visit produces a new Plan version rather than overwriting the previous one, so past adherence stays traceable to the Plan that was active at the time.
_Avoid_: Diet, menu (menu refers to the printed/pasted source text a Plan is parsed from, not the Plan itself), regimen.

**Day-type**:
A named variant of a Plan's meals, claimed by a subset of the week's weekdays (e.g. one day-type covers Lun/Mié/Vie/Dom, another covers Mar/Jue/Sáb). A Plan holds a list of day-types, not a fixed pair — a future Plan may have just one (same every day) or more than two.
_Avoid_: Day type A/B, schedule.

**Slot**:
A named time-of-day grouping within a day-type (e.g. Desayuno, Comida, Cena, Media tarde) containing one or more Dishes. Daily adherence is tracked at this granularity — checking a Slot as done, not each Dish or Ingredient within it (may become dish-level tracking later).
_Avoid_: Meal time, period.

**Dish**:
A named food item within a Slot (e.g. "Huevo a la mexicana"), composed of Ingredients. Distinct from `Meal`, which is the app's existing freeform logged entry (description + tags).

**Ingredient**:
A component of a Dish with a quantity, unit, and — where the source menu states it — a gram/ml equivalent used to aggregate the Shopping List.

**Supplement**:
A recurring item in a Plan (e.g. Bioleven, Omega 3, Vitamina E) with its own daily adherence checkbox, distinct from the app's prior single-supplement setting.

**Shopping List**:
A weekly, auto-derived aggregation of a Plan's Ingredients (summed by gram/ml equivalent across the week's day-type occurrences), with "bought" checkboxes that reset manually, not on a fixed schedule.

**Meal**:
The app's existing freeform logged entry (`date`, `type`, `description`, `tags`) that daily scoring/XP/achievements read from. Checking off a prescribed Slot auto-creates a Meal (tags derived from its Dishes); deviating from the Plan still logs a Meal the freeform way.
_Avoid_: Log entry, food entry.
