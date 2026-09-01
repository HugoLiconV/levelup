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

**Meal Prep Plan**:
A versioned, editable weekly execution plan derived from the Plan or Plans active across that week. It preserves what was prescribed and describes only how advance work, storage, and day-of finishing will happen.
_Avoid_: Plan (alone), diet, replacement Plan.

**Prep Session**:
A scheduled block of advance kitchen work, such as a main Sunday session or a shorter midweek session.

**Batch**:
A quantity of one Dish prepared once and allocated to one or more future Slot occurrences.

**Component Batch**:
One or more Ingredients washed, cut, portioned, or otherwise staged ahead for one or more future Dishes while final cooking or assembly remains a Finish Step.
_Avoid_: Partial Dish, mise en place.

**Portion**:
The allocation of a Batch to one date and Slot. A Portion identifies where it is stored and when it should be consumed or moved for thawing.

**Prep Task**:
One checkable action within a Prep Session, such as washing, cutting, cooking, cooling, portioning, labeling, storing, or cleaning.

**Finish Step**:
A short action intentionally left for the day of a Slot, such as blending, assembling, reheating, dressing, or cooking fresh.

**Safety Rule**:
An authoritative constraint that can reject or change a proposed preparation, storage, or consumption schedule. It takes precedence over generated suggestions.
