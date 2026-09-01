# Meal prep: research and product proposal

**Date:** 2026-08-25  
**Status:** Proposal for product review; no implementation decision has been made  
**Scope:** Turn an existing nutritionist-authored `Plan` into a safe, practical week of shopping, advance preparation, storage, day-of finishing, and adherence actions.

## Executive recommendation

LevelUp should **not** use AI to generate another diet or replace the user's nutritionist-authored `Plan`. It should use AI to convert that Plan into a reviewed weekly execution draft:

> **Plan says what to eat. Meal Prep Plan says what to prepare, when to prepare it, how much to batch, how to store it, and what remains to finish on the day.**

The experience should have five connected stages:

1. **Choose coverage:** select which upcoming `Slot`s the user wants to prepare ahead.
2. **Set real constraints:** preparation days, available time, equipment, freezer access, and desired prep style.
3. **Generate and review:** AI proposes one or two `Prep Session`s, `Batch`es, ordered `Prep Task`s, storage actions, and short day-of `Finish Step`s.
4. **Execute in kitchen mode:** a large, sequential checklist with timers, quantities, parallel-work hints, labels, and progress recovery.
5. **Follow through:** today's prepared `Slot` shows where its portion is stored and how to finish it; completing the `Slot` continues to create the existing `Meal` and XP.

The recommended MVP is deliberately narrower than a generic recipe generator. It supports one Plan owner, one week, existing Plan ingredients, one or two prep sessions, reviewed AI instructions, conservative storage rules, local persistence, and offline execution after generation. It excludes nutrition substitutions, calorie/macro optimization, family members with different prescriptions, grocery delivery, pantry image recognition, and a fully parallel cooking scheduler.

The most important technical principle is to split responsibilities:

- **Deterministic code owns truth:** week/date resolution, Plan quantities, occurrence counts, source references, totals, safety ceilings, state transitions, and validation.
- **AI owns synthesis:** grouping compatible work, proposing techniques, ordering tasks, estimating time, identifying ambiguity, and writing clear Spanish instructions.
- **The user owns commitment:** answers clarifying questions, reviews anything inferred, edits the draft, and explicitly saves it.

This is the closest fit with the current product promise that “the AI proposes; the user decides.”

## 1. What meal prep actually is

“Meal planning” and “meal prep” are related but different jobs:

- **Meal planning:** deciding what will be eaten on future days.
- **Shopping:** acquiring the ingredients required by that decision.
- **Meal prep:** moving work from busy future moments into one or more earlier sessions without making food unsafe or unpleasant.
- **Day-of execution:** reheating, assembling, blending, dressing, or cooking the parts that should remain fresh.
- **Adherence:** recording what the user actually ate, including deviations.

Meal prep is therefore not a list of recipes. It is a scheduling and dependency problem. A useful result must answer:

- Which repeated ingredients or components can be handled together?
- Which dishes can be fully cooked ahead, which can only be partially prepared, and which should be made fresh?
- How many Plan occurrences does each batch cover?
- Which portion belongs to which date and `Slot`?
- What goes in the refrigerator versus freezer, and when must a frozen portion move to the refrigerator?
- What equipment is occupied, in what order, and for approximately how long?
- What happens when a session is missed, a meal is eaten out, or the week changes?

This matters because a single Sunday “cook everything for seven days” promise is often the wrong product promise. USDA guidance says cooked leftovers generally keep **three to four days** refrigerated and recommends rapid cooling in shallow containers; FDA guidance says perishable food should not remain at room temperature for more than two hours, or one hour above 90°F/32°C ([USDA leftovers guidance](https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety), [FDA storage guidance](https://www.fda.gov/consumers/consumer-updates/are-you-storing-food-safely)). Mexican consumer guidance likewise says not to leave prepared foods at room temperature for more than two hours, and SENASICA recommends refrigeration below 5°C ([Secretaría de Salud](https://www.gob.mx/salud/documentos/manejo-y-consumo-de-alimentos-temporada-de-calor), [SENASICA](https://www.gob.mx/senasica/articulos/como-contribuimos-a-la-inocuidad-desde-casa?idiom=es)). In Chihuahua's hot climate, the one-hour hot-weather rule is an especially important conservative default.

The product should therefore prefer one of three honest outcomes:

- **Split prep:** for example, a larger Sunday session plus a shorter Wednesday session.
- **Prepare and freeze:** where the food is appropriate for freezing.
- **Prep components, finish fresh:** wash, portion, marinate, chop, or stage safe components while clearly retaining day-of cooking work.

Meal planning is associated with more frequent home preparation, higher food variety, and somewhat better diet-quality measures in a large cross-sectional cohort, but that study cannot establish causality. This supports reducing planning friction without making health-outcome promises ([Ducrot et al., 2017](https://doi.org/10.1186/s12966-017-0461-7)).

USDA's practical planning guidance also recommends checking what is already available, planning around available time, deliberately using leftovers, organizing the shopping list by store section, and consuming more perishable foods before frozen or shelf-stable options ([USDA MyPlate — Make a Plan](https://www.myplate.gov/eathealthy/budget/budget-weekly-meals)). Its meal-prep materials explicitly describe individual portions, batch cooking, component preparation, and freezing larger batches rather than prescribing one universal approach ([USDA MyPlate — Cook Once, Eat Multiple Times](https://www.myplate.gov/sites/default/files/2024-09/MyPlate-Resource-Efficient-Eats-Cook-Once-Eat-Multiple-Times.pdf)).

## 2. Existing LevelUp context

### What already works in our favor

The repository already has most of the upstream and downstream surfaces this feature needs:

- `Plan` is explicitly a versioned, nutritionist-prescribed set of `Day-type`s, `Slot`s, `Dish`es, `Ingredient`s, and supplements (`CONTEXT.md`).
- AI already turns pasted source text into a strict, editable `PlanDraft` while preserving the original language and refusing to invent quantities (`app/lib/nutrition-plan-server.ts`).
- The Food surface already connects **Registro**, **Guía de comida**, and **Compras** (`app/home/screens.tsx`).
- A weekly guide resolves the active Plan to a weekday and its `Slot`s.
- Checking a prescribed `Slot` creates the existing freeform `Meal`, which feeds adherence, XP, and achievements.
- The Shopping List aggregates explicit gram/milliliter equivalents and keeps ambiguous quantities visible instead of guessing.
- Timers, reminders, web push, service-worker behavior, offline state, and data export/import already exist.

This means the feature can complete an existing chain instead of creating a parallel product:

```text
Nutritionist source
  → reviewed Plan
  → week/date Slot occurrences
  → Meal Prep Plan
  → Shopping List
  → Prep Sessions and stored Portions
  → today's Finish Steps
  → existing Slot completion / Meal / XP
```

### Current gaps that matter

1. **The Plan describes food, not recipes.** A `Dish` has a name and ingredients but no method, yield, equipment, cook time, storage suitability, or reheating instructions. “Pechuga a la plancha” contains a strong technique cue; “guacamole” is plausible; many real nutritionist menu items will be ambiguous. The generator must be allowed to ask questions or flag inferred preparation methods.

2. **Quantities are only partially structured.** `PlanIngredient` stores original `quantityText` and an optional numeric gram/ml equivalent. Units such as pieces, cups, tablespoons, packages, and cans are not structurally represented. The MVP can safely display “4 portions × 2 pieces (100 g) each” and “400 g total” when an explicit equivalent exists, but it must not pretend it can always convert every original quantity.

3. **The current Shopping List resolves one Plan for a whole week.** `FoodView` selects the Plan active today and passes it to `getWeeklyShoppingList`. A week that crosses a Plan version boundary needs per-date resolution across `state.plans`; Meal Prep must not prepare Monday's old Plan using Thursday's new Plan.

4. **Shopping completion is global, not week-scoped.** `ShoppingListState` is one `bought` map that resets manually. A derived weekly workflow needs a stable week/source key so old checks cannot leak into a new week.

5. **Plan data is intentionally local-first.** ADR-0001 keeps Plan and Shopping List data in `localStorage` for single-device use. Meal prep state should follow that decision in MVP. Moving it to Supabase now would contradict the ADR and expand the feature into sync/conflict resolution. Supabase can remain responsible for authentication and existing notifications; cross-device or household collaboration is a later, explicit ADR revisit.

6. **Four Food tabs will be tight on mobile.** Simply appending a fourth long label to the current segmented control will degrade scanability. The information architecture should be adjusted intentionally.

## 3. Competitive research

### Established meal-planning products

| Product | Documented approach | What to learn | What LevelUp should avoid copying |
|---|---|---|---|
| [Mealime](https://support.mealime.com/article/151-getting-started-guide) | Personalization, auto-build or manual selection, coordinated recipes, consolidated aisle-based list, food-waste indicator, guided cooking | Optimize the **whole week**, connect plan → shop → cook, show why the set works | Its recipe catalog decides what to eat; LevelUp must preserve the nutritionist Plan |
| [Samsung Food](https://support.samsungfood.com/hc/en-us/articles/35369657798548-Getting-Started-with-Meal-Planner) | Active Plan, personalized suggestions, Queue, history, notes such as leftovers, shared lists, pantry/food list, guided cooking | Queue/history are useful repair tools; shopping and cooking are first-class continuations | A broad recipe/pantry/social platform would dilute the first release |
| [Eat This Much](https://www.eatthismuch.com/how-to/) | Constraint-based generation, weekday templates, explicit producer/leftover links, pantry subtraction, family scaling | Model “cook here, consume there” explicitly; local repair is better than full rerolls | Calorie/macro generation and automatic diet creation conflict with LevelUp's trust boundary |
| [MyFitnessPal Meal Planner](https://support.myfitnesspal.com/hc/en-us/articles/34603055097869-How-do-I-use-the-Meal-Planner) | Goals/preferences → weekly plan → prep mode → groceries → one-tap logging | Closing planned-versus-actual behavior is valuable; LevelUp already has the logging side | Do not make meal prep contingent on calorie tracking or a new subscription-shaped workflow |
| [SideChef](https://www.sidechef.com/meal-planner/) | Time/budget/health goals, shoppable recipes, serving adjustment, step photos/video, voice, timers | Cooking mode needs large, stepwise, timer-friendly execution | Retailer/SKU integration and rich recipe media are not MVP prerequisites |
| [AnyList](https://www.anylist.com/meal-planning) | Shared calendar, recipes plus free-text events like leftovers/date night, selective grocery transfer | Real life includes skipped cooking, leftovers, eating out, and collaboration | A manual calendar alone does not create an actionable prep session |
| [Paprika](https://www.paprikaapp.com/) | Trusted personal recipes, reusable menus, scaling, smart grocery lists, interactive steps, multiple pinned recipes | Preserve user ownership; let successful weeks be reused; make multi-dish cooking easy to resume | A recipe manager is a different core job from following a prescribed Plan |

### Meal-prep-specific products

Newer meal-prep products make the missing layer more explicit:

- [Harvo](https://getharvo.com/) describes a batch guide that decides which components to cook together, in what order, and how much goes into each container.
- [MODU](https://www.modumeal.com/) uses modular components, two batch sessions, and short day-of assembly to avoid a week of identical containers.
- [OnlyPans](https://onlypans.app/) promises three cooking sessions for seven dinners with ingredient overlap.
- [BatchPrep](https://batchprep.app/) emphasizes weekly planning, household scaling, leftovers, offline/local data, and a shopping list.

These first-party claims are marketing, not independent evidence of usability. They are still useful as product-pattern evidence: meal-prep users need a **batch graph and an execution schedule**, not only a recipe calendar.

### Repeating patterns

The strongest recurring patterns are:

1. Progressive constraints rather than a long profile form.
2. “Make it for me,” manual control, and a hybrid where the user locks choices.
3. Week-level optimization for ingredient overlap, freshness, waste, time, and variety.
4. Local repair: move, skip, swap, or regenerate one part without destroying accepted work.
5. Separate preparation events from consumption events.
6. Shopping-list provenance: every item can explain which future meals require it.
7. Pantry reconciliation before buying.
8. Cooking mode with steps, timers, large targets, and resumable progress.
9. A feedback loop for “made it / skipped it / too much / took longer / would repeat.”
10. Collaboration for households, even though most products handle heterogeneous household nutrition poorly.

### LevelUp's differentiated opportunity

The whitespace is not “another AI meal planner.” It is:

> **The most trustworthy way to turn the exact Plan a user already received from a health professional into a week they can realistically execute.**

LevelUp can be better because it already knows the Plan version, each day's `Slot`s, the exact source quantities, the user's actual completions, and the Shopping List. Competitors typically start from a recipe catalog and infer what the person should eat. LevelUp starts from an accepted clinical constraint and can optimize only the work around it.

## 4. Proposed domain language

These terms are intentionally provisional until product review. If accepted, they should be added to `CONTEXT.md` before implementation.

**Meal Prep Plan**  
A versioned, editable weekly execution plan derived from one or more nutritionist `Plan` versions. It does not change what the user is prescribed to eat.

**Prep Session**  
A scheduled block of advance kitchen work, such as Sunday 17:00 or Wednesday 19:00.

**Batch**  
A prepared quantity of one Dish or reusable component made once and allocated across one or more future `Slot` occurrences.

**Portion**  
The allocation of a Batch to one date and `Slot`. It carries storage location and consume-by information.

**Prep Task**  
One checkable action in a Prep Session: wash, chop, cook, cool, portion, label, store, or clean.

**Finish Step**  
A short action intentionally deferred until the day of a `Slot`: blend, toast, dress, reheat, assemble, or cook fresh.

**Safety Rule**  
An authoritative, deterministic constraint that can reject or change a proposed storage/consumption schedule. It is not model-authored prose.

The word `Plan` alone must continue to mean the nutritionist-authored Plan. UI should normally say “Preparación de esta semana” rather than repeatedly showing the longer technical term.

## 5. Product principles and non-negotiables

1. **Preserve the Plan.** Do not add, remove, replace, or resize prescribed ingredients inside this flow.
2. **Never hide inference.** Cooking method, time, equipment, freezer suitability, and storage advice that did not come from the Plan must be labeled as a suggestion or authoritative safety rule.
3. **Ask only questions that change the result.** Avoid a lifestyle questionnaire. Ask about a Dish only when ambiguity blocks a usable or safe draft.
4. **Be honest about freshness.** “Finish fresh Wednesday” is better than pretending everything can be safely refrigerated from Sunday.
5. **Optimize the user's work, not an abstract ideal.** A 90-minute draft for a 45-minute window is a failed draft, even if it is theoretically efficient.
6. **Keep the week repairable.** Missing one session must not invalidate the whole experience.
7. **Show provenance.** Every Batch and Portion links back to dates, Slots, Dishes, and source quantities.
8. **Work offline after generation.** Kitchens and grocery stores are poor places to require a network round trip.
9. **Reward follow-through, not dangerous speed.** XP should not encourage skipping cooling, storage, or hygiene steps.
10. **Safety beats completion.** If constraints cannot produce a safe draft, the app should say what must remain fresh or require a second session/freezer.

## 6. Recommended end-to-end experience

### Entry points

1. **Plan-save success:** keep “Ver mi plan de hoy” primary on the very first use, and add “Preparar mi semana” as the clear next action once the Plan has been reviewed.
2. **Food workspace:** evolve the current three choices into four short destinations: **Hoy · Plan · Preparar · Compras**. Use a horizontally scrollable tab bar or compact navigation designed for four items; do not squeeze “Guía de comida” plus a fourth label into the current control.
3. **Today:** when a Prep Session is due, show one “Preparación de hoy” card. On normal days, a prepared Slot shows “Listo en refrigerador” or “Pasa al refrigerador esta noche” with its Finish Steps.
4. **Shopping:** once all required items are checked, offer “Empezar preparación” if a session is scheduled.

### State-aware Preparing landing

- **No active Plan:** explain that preparation is derived from the user's Plan and route to Plan creation.
- **No plan for this week:** show a compact value proposition and “Planear mi preparación.”
- **Draft/incomplete setup:** “Continuar borrador.”
- **Upcoming session:** show start time, estimated duration, batches, containers, missing groceries, and “Empezar.”
- **Session in progress:** resume at the next unchecked task; never restart.
- **Session complete:** show portions by storage location, day-of Finish Steps, labels, and the next session.
- **Week over:** show a three-question reflection and “Repetir / ajustar para la próxima semana.”

### Creation flow

#### Step 1 — “¿Qué quieres adelantar?”

Show the actual seven-day calendar resolved from the Plan. Each date expands to its `Slot`s. Select all eligible food Slots by default, but let the user deselect dates/Slots they will eat out, want fresh, or do not want to prep.

This selection controls preparation only. Deselecting a Slot must **not** alter the nutritionist Plan or mark it skipped.

#### Step 2 — “¿Cuándo puedes preparar?”

Offer three presets, with the recommended safe option first:

- Sunday + Wednesday
- One main session with freezer
- Choose my own times

For each session ask only date/time and maximum duration. Also ask whether there is usable freezer space. Save the preference for next week, but make it easy to override.

#### Step 3 — “Tu cocina”

Use compact toggles for equipment that materially changes the schedule: oven, stove/burner count, microwave, blender, air fryer, slow/pressure cooker. Ask approximate container availability only if the result will allocate full portions. Keep advanced controls collapsed.

Offer prep style:

- **Balanced (recommended):** batch what holds well; finish freshness-sensitive items on the day.
- **Maximum ready:** more finished containers, using freezer or a midweek session.
- **Minimum session time:** stage ingredients/components and leave more day-of work.

#### Step 4 — Clarifications only when needed

The server may return a small set of blocker questions instead of a draft. Examples:

- “For ‘jugo verde,’ do you blend the listed ingredients with water or use another method?”
- “Do you want the avocado portioned whole and cut on the day?”
- “The Plan does not state how to prepare this Dish. Choose: use my usual method / propose a method / leave it fresh.”

Cap this step. If too many Dishes are ambiguous, generate a partial plan and clearly list what remains day-of instead of interrogating the user.

#### Step 5 — Review the draft

Lead with outcomes:

- `2 sesiones · 1 h 25 min + 35 min`
- `11 porciones preparadas`
- `6 pasos para terminar al momento`
- `8 recipientes de refrigerador · 3 de congelador`

Then show:

1. **Week map:** each Slot is `ready`, `finish fresh`, `cook that day`, or `not included`.
2. **Session cards:** grouped batches and estimated time.
3. **Storage plan:** refrigerator/freezer allocation, made-on and consume-by labels, and thaw reminders.
4. **Needs review:** only actionable uncertainties.

Editing must support moving a Batch to another session, choosing “finish fresh,” excluding a Slot, changing estimated time, editing proposed instructions, and regenerating only the affected session. Plan quantities are read-only here; link to Plan editing when they are wrong.

Save explicitly as a new Meal Prep Plan version.

### Kitchen mode

Kitchen mode should be sequential and forgiving:

- Keep the screen awake where supported.
- Show one main task, its quantities, affected portions, and the next task.
- Provide large **Done**, **Start timer**, **Skip for now**, and **Back** controls.
- Show a small “while this cooks” hint only when the dependency is safe and obvious.
- Group hygiene transitions explicitly: raw poultry handling, surface/utensil cleanup, then ready-to-eat produce.
- End each cooked Batch with cooling, portioning, labeling, and storage tasks; “cooked” is not “done.”
- Save every check locally immediately.
- Allow session pause and resume.

The MVP should use a **validated sequential order**, not promise a perfect parallel kitchen schedule. Parallel resource scheduling across burners, oven temperatures, hands-on work, timers, cooling, and cleanup is a deeper optimization problem and should follow observed user behavior.

### Daily bridge

Today's Plan checklist remains the center of adherence. A prepared Slot adds operational context:

- storage: `Refrigerador · recipiente Mié Comida`
- action: `Recalienta`, `agrega aguacate`, `licúa al momento`, etc.
- provenance: “Prepared Sunday”
- safety state: ready, thaw tonight, use today, or no longer recommended

Tapping the existing Slot completion still creates the existing `Meal` and awards existing XP. Prep completion may receive a small one-time weekly/session reward, but it must not double-count meals or reward unsafe shortcuts.

### Recovery flows

- **Missed session:** “Replan remaining work” uses only uncompleted tasks and future Slots.
- **Eating out:** mark the Slot “not preparing” and recalculate future allocation/shopping; do not edit the underlying Plan.
- **Dish did not work:** record “didn't make / too much / took longer / don't prep this ahead.”
- **Plan changed:** preserve the saved historical draft, flag it as based on an older Plan, and offer a new draft for affected future dates.
- **Offline before generation:** explain that generation needs internet; keep all existing Plan and Shopping views available.
- **Offline during execution:** continue completely and sync nothing in MVP.
- **Unsafe/stale portion:** do not present it as ready. Explain the reason and route to a fresh preparation alternative, without automatically changing ingredients.

## 7. Food-safety design

Food safety cannot be a disclaimer at the bottom of AI prose. It must constrain generation and appear at the moment of action.

### Authoritative baseline

- Cooked leftovers: generally 3–4 refrigerated days; freeze for longer storage ([USDA](https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety)).
- Rapid cooling: divide large amounts into shallow containers; refrigerate promptly ([USDA](https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety)).
- Cold holding: refrigerator at or below 4°C/40°F is the conservative household target ([FDA](https://www.fda.gov/consumers/consumer-updates/are-you-storing-food-safely)).
- Room temperature: no more than two hours; one hour above 32°C/90°F ([FDA](https://www.fda.gov/food/buy-store-serve-safe-food/refrigerator-thermometers-cold-facts-about-food-safety)).
- Mexican hygiene rules identify minimum internal temperatures including 63°C for fish and whole beef, 68°C for ground meats/pork, and 74°C for poultry and reheating prepared food in covered commercial contexts ([NOM-251-SSA1-2009](https://dof.gob.mx/normasOficiales/3980/salud/salud.htm)). Consumer UI should present a clear conservative subset reviewed by a qualified food-safety professional before launch.
- Avoid cross-contamination between raw and finished food; clean hands, surfaces, and equipment, and wash produce ([SENASICA](https://www.gob.mx/senasica/articulos/como-contribuimos-a-la-inocuidad-desde-casa?idiom=es)).

### Required implementation behavior

1. Safety rules live in versioned deterministic data/code with source metadata and review date.
2. The model may classify a proposed step for safety evaluation, but cannot override a rule.
3. Every Portion has `preparedAt`, `storage`, and `consumeBy` or an explicit “finish fresh” state.
4. A validator rejects refrigerator allocations beyond the allowed window.
5. The system prefers freezer/midweek/fresh alternatives and explains the change.
6. The UI generates human-readable labels: Dish, target date/Slot, made-on, storage, consume-by, and thaw/reheat instruction.
7. Raw-protein tasks and ready-to-eat tasks are sequenced to minimize cross-contamination.
8. Pregnant, older, immunocompromised, or otherwise high-risk users are outside MVP personalization; the product uses conservative defaults and does not imply medical suitability.
9. Storage guidance should be professionally reviewed and localized before production. USDA/FDA/NOM rules are a baseline, not a substitute for that review.

## 8. AI architecture and trust model

### Input

Send the server only:

- resolved Slot occurrences for the selected dates;
- Dish/Ingredient names and source quantities;
- references that materially affect preparation;
- user-confirmed constraints and clarification answers;
- deterministic safety-policy identifiers, not raw mutable safety prose;
- optional prior feedback such as “do not cut avocado ahead.”

Do not resend the original pasted nutritionist source when the structured Plan is sufficient. Do not send account identity, email, labs, weight, or unrelated health history.

### Two-stage generation

1. **Deterministic expansion:** resolve the correct Plan for each date, expand selected Slot occurrences, count repetitions, compute only supported totals, and create stable source IDs.
2. **Structured model synthesis:** return a discriminated result:
   - `needs_clarification` with a short list of blocking questions; or
   - `draft` with Sessions, Batches, Tasks, Portions, Finish Steps, estimates, and declared assumptions.

Use strict JSON Schema Structured Outputs. OpenAI's current API documentation states that JSON Schema Structured Outputs constrain the response to the supplied schema; schema compliance still does not replace semantic validation ([OpenAI Responses API](https://developers.openai.com/api/reference/java/resources/beta/subresources/responses)).

### Model output constraints

Every generated object must reference source IDs. The model must not emit a new ingredient as an unreferenced string. Proposed cooking aids or seasonings are not allowed in MVP. Tasks may use water, heat, and equipment, but any food addition must already exist in the Plan.

Times must be labeled estimates. Techniques and storage suitability inferred from Dish names must be tagged with `source: "ai_suggestion"`. Deterministic storage ceilings are tagged `source: "safety_rule"`. Plan facts are tagged `source: "plan"`.

General-purpose language models must not become the nutrition or allergy engine. Published evaluations have found systematic nutrient/energy shortcomings and dietary-compliance errors in generated meal plans, including problematic outputs for vegan and food-allergy scenarios ([Hieronimus et al., 2024](https://www.sciencedirect.com/science/article/pii/S0271531724000915), [Niszczota and Rybicka, 2023](https://pubmed.ncbi.nlm.nih.gov/37269717/)). WHO likewise warns that health-oriented LLM responses can sound authoritative while being wrong and calls for autonomy, validation, transparency, accountability, and ongoing monitoring ([WHO — Safe and ethical AI for health](https://www.who.int/news/item/16-05-2023-who-calls-for-safe-and-ethical-ai-for-health)). LevelUp's narrower design materially reduces this risk: the accepted Plan remains the food/quantity source of truth, and every model-created operational suggestion is reviewed and revalidated.

Allergen claims need the same discipline. “No listed allergen appears in the Plan” is different from “safe from cross-contact”; FDA notes that cross-contact can unintentionally introduce major allergens ([FDA — Food Allergies](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/food-allergies)). MVP should make neither restaurant-style cross-contact guarantees nor ingredient substitutions.

### Semantic validator

Reject or repair a draft when:

- a selected Slot is neither mapped to a Portion/Batch nor explicitly left fresh;
- a source Slot is duplicated unintentionally;
- a Dish or Ingredient reference does not exist;
- a quantity differs from deterministic source math;
- task dependencies are cyclic or missing;
- a Portion is consumed after its safety window;
- a frozen Portion lacks a viable thaw/finish action;
- a session exceeds the user's maximum by more than a small visible tolerance;
- the model adds an ingredient, supplement, or nutrition claim;
- a task is too vague to execute (“prepare vegetables”).

One server-side repair pass may receive only validation errors and the prior structured draft. If it still fails, return a safe partial draft or a clear failure; never silently show malformed output.

### Privacy and API handling

Use `store: false` for generation unless a later product requirement justifies API-side storage. If a stable safety identifier is used, hash an internal local/user identifier rather than sending an email; the current Responses API documents `safety_identifier` for a stable, non-identifying application user key ([OpenAI create response](https://developers.openai.com/api/reference/cli/resources/responses/methods/create)). Persist accepted output in LevelUp's own local state.

## 9. Proposed data model

This is illustrative TypeScript, not an implementation-ready final schema:

```ts
interface MealPrepPlan {
  id: string;
  weekStart: string;
  version: number;
  status: 'draft' | 'ready' | 'in_progress' | 'complete' | 'superseded';
  planRefs: Array<{ planId: string; dates: string[] }>;
  sourceFingerprint: string;
  preferences: MealPrepPreferencesSnapshot;
  sessions: PrepSession[];
  batches: PrepBatch[];
  finishSteps: FinishStep[];
  assumptions: PrepAssumption[];
  generatedAt: string;
  acceptedAt: string | null;
  generatorVersion: string;
  safetyPolicyVersion: string;
}

interface PrepSession {
  id: string;
  scheduledFor: string;
  estimatedMinutes: number;
  taskIds: string[];
}

interface PrepTask {
  id: string;
  kind: 'wash' | 'cut' | 'cook' | 'cool' | 'portion' | 'label' | 'store' | 'clean';
  instruction: string;
  estimatedMinutes: number;
  dependencyIds: string[];
  sourceDishRefs: string[];
  sourceIngredientRefs: string[];
  equipment: string[];
  provenance: 'plan' | 'ai_suggestion' | 'safety_rule';
}

interface PrepBatch {
  id: string;
  label: string;
  sourceDishRefs: string[];
  portionIds: string[];
  quantityDisplay: string;
}

interface PrepPortion {
  id: string;
  batchId: string;
  date: string;
  planId: string;
  dayTypeId: string;
  slotId: string;
  storage: 'refrigerator' | 'freezer' | 'fresh';
  preparedAt: string;
  refrigerateUntil: string | null;
  freezeBy: string | null;
  thawAt: string | null;
  consumeBy: string | null;
  reheatMethod: string | null;
  reheatTemperatureC: number | null;
}
```

Execution facts should remain separate from the generated draft, following the existing completion-log pattern:

```ts
interface PrepTaskCompletion {
  mealPrepPlanId: string;
  prepTaskId: string;
  completedAt: string;
}
```

This keeps generation/versioning understandable and avoids mutating historical instructions when a task is checked.

### Quantity prerequisite

Do not block the first vertical slice on a universal cooking-unit parser. Use a safe display strategy:

- if an explicit gram/ml equivalent exists: `4 porciones · 400 g total · 100 g por porción`;
- otherwise: `4 porciones · “2 piezas” cada una`;
- never multiply free-form quantity text into a fake total.

After validating demand, evolve Ingredient quantity into a structured rational amount/unit plus optional gram/ml equivalent. Preserve `quantityText` for source fidelity and migrate local state carefully.

## 10. Persistence and derived-state decisions

For MVP:

- Add Meal Prep Plan drafts, accepted versions, and task completions to versioned local `AppState`.
- Include them in existing export/import.
- Derive the Shopping List from the selected week/date occurrences, not from a saved AI list.
- Scope bought state by `weekStart + sourceFingerprint`.
- Resolve `Plan` **per date** for all weekly derivations.
- Store a source fingerprint and generation/safety versions so stale drafts are detectable.
- Keep generation online, execution offline.

Do not introduce Supabase database tables only for this feature. That contradicts ADR-0001. If cross-device sync or household collaboration becomes a committed requirement, reopen the ADR and design ownership, RLS, conflict resolution, offline merges, and deletion/export as one project. Current Supabase changelog items reviewed on 2026-08-25 do not change this product decision.

## 11. Scope and delivery sequence

### Phase 0 — Validate the hard part before building the surface

Create a non-production generator using the existing demo Plan plus 8–12 adversarial fixtures. Have a nutrition professional or food-safety reviewer and 5–8 target users assess printed/JSON drafts.

Validate:

- Can users understand Batch-to-day allocation?
- Are proposed methods acceptable without hidden ingredients?
- Are durations credible?
- Is one versus two sessions the right control?
- Which Dishes consistently require clarifying questions?
- Do users prefer components or fully portioned meals?

Exit only when a draft can achieve high source fidelity and users can execute it without researcher explanation.

### Phase 1 — High-quality vertical slice

- One active week, one Plan owner.
- Selected Slot coverage.
- One or two Prep Sessions.
- Basic equipment and freezer constraint.
- Structured AI draft with clarifications.
- Review, edit, partial regeneration, accept.
- Sequential kitchen checklist with timers and resume.
- Portion/storage labels.
- Today's Finish Steps.
- Week-scoped Shopping checks.
- Local persistence, export/import, offline execution.
- Demo Plan golden test and production telemetry.

### Phase 1.1 — Repair and learning

- Missed-session replanning.
- Mark eating out/not preparing.
- Actual duration and “too much / poor quality / do fresh” feedback.
- Repeat a successful week while resolving the current Plan version.
- Better structured quantities for common Spanish/Mexican units.

### Phase 2 — Advanced optimization

- Pantry inventory/subtraction.
- Container inventory and printable/shareable labels.
- More explicit resource scheduling and safe parallel work.
- Collaborative shopping/prep ownership after persistence ADR review.
- Trusted personal preparation-method library.
- Package-size and cost-aware shopping.

### Explicitly not MVP

- Generating or modifying the nutritionist Plan.
- Macro/calorie targeting.
- Ingredient substitutions.
- Multiple people with different nutrition requirements.
- Recipe discovery/social feed.
- Store checkout or live inventory.
- Camera-based pantry recognition.
- Voice assistant.
- Autonomous safety decisions based only on model knowledge.
- A claim that the plan is medically approved because its source Plan was prescribed.

## 12. Quality strategy

### Deterministic tests

For every accepted draft:

1. Every included Slot occurrence has exactly one preparation outcome.
2. Every Portion references the correct Plan/Day-type/Slot/Dish.
3. Plan quantities are unchanged.
4. No unreferenced food ingredient exists.
5. Dependencies form an acyclic graph.
6. Sessions and tasks have valid dates and positive, bounded estimates.
7. Refrigerated consumption fits the active safety rule.
8. Frozen portions include storage and thaw/finish instructions.
9. Week-crossing Plan versions resolve correctly.
10. Regenerating one session preserves locked/accepted sessions.
11. Completing/undoing a Prep Task is idempotent.
12. Old week shopping checks cannot affect a new week.

### AI evaluation set

Include at least:

- the current demo Plan;
- a single Day-type repeated seven days;
- a Plan change on Wednesday;
- all quantities explicit;
- mostly unquantified pieces/cups;
- ambiguous Dish names;
- no cooking equipment beyond one burner;
- no freezer and only one Sunday session;
- 45-minute maximum sessions;
- several raw and ready-to-eat items;
- a Slot the user excludes;
- duplicate ingredients with different preparation states;
- adversarial source text embedded in names/notes;
- empty ingredients and malformed historical local state.

Human rubric (1–5 each): source fidelity, completeness, feasibility, clarity, safety, realistic timing, amount of editing required, and confidence to execute. Track hard-failure rates separately; a high average cannot hide one invented ingredient or unsafe storage allocation.

### Product validation metrics

**North-star candidate:** percentage of selected weekly Slot occurrences that were made ready (or intentionally left with a Finish Step) and later completed.

Supporting metrics:

- active-Plan users who start and accept a Meal Prep Plan;
- time from start to accepted draft;
- clarification count and abandonment point;
- draft acceptance without full regeneration;
- session start/completion and resume rate;
- estimated versus actual session duration;
- proportion ready / frozen / finish-fresh / excluded;
- planned Portion later tied to Slot completion;
- shopping completion before session;
- “too much,” discarded, missed, and stale Portion reports;
- repeat-week rate;
- semantic-validation and safety-rule rejection rate;
- support incidents involving quantities or storage.

Do not claim the feature improves weight, labs, or health outcomes without an appropriate study. Measure reduced friction and follow-through first.

## 13. Risks and mitigations

| Risk | Consequence | Mitigation |
|---|---|---|
| AI invents a seasoning/ingredient | Violates prescribed Plan; possible allergy/medical impact | Source IDs, no free ingredient strings, semantic validator, user review |
| AI suggests unsafe storage | Foodborne illness | Deterministic versioned rules; validator; professional review; safe fallback |
| Seven-day batch promise | Unsafe or poor-quality food | Default split session/freezer/fresh strategy |
| Missing recipe methods | Vague or wrong tasks | Clarification union, visible AI provenance, personal methods later |
| Free-form quantities do not scale | Wrong batch or shopping amount | Per-portion display; use totals only with explicit equivalents; structured quantities later |
| Plan changes midweek | Wrong food prepared | Resolve per date; store Plan refs/fingerprint; stale warning |
| Setup becomes exhausting | Abandonment before value | Progressive defaults; ask only result-changing questions; partial draft |
| Kitchen timeline is unrealistic | User loses trust mid-session | Sequential MVP, buffers, actual-time feedback, local repair |
| Prep gamification rewards speed | Unsafe shortcuts | Reward completion once; never time-based XP; cooling/storage are required tasks |
| Local-only device is lost | Lost plan/progress | Existing export/import; revisit sync as separate decision |
| Health/AI privacy concerns | Loss of trust | Send minimal structured Plan only, no identity/labs, local accepted state |
| Four Food tabs are cramped | Feature hidden or hard to navigate | Redesign Food subnavigation with short labels |

## 14. Decisions to make before implementation

1. **Primary prep style:** default to balanced components + fresh finishing (recommended) or finished containers?
2. **Plan method source:** may AI propose a preparation method when the nutritionist did not provide one (recommended, visibly labeled), or must the user supply it?
3. **Safety review:** who will approve the consumer-facing Spanish storage/cooking rules before release?
4. **Prep reward:** no new XP (simplest) or a small session-level reward that cannot double-count meals?
5. **Navigation:** accept the proposed Food workspace labels **Hoy · Plan · Preparar · Compras**?
6. **MVP quantity display:** accept safe per-portion text for unstructured units, or make structured quantity parsing a prerequisite?
7. **User research target:** is the initial user a single person following their own Plan, as ADR-0001 implies? This proposal assumes yes.

## 15. Recommended next action

Before building the full UI, implement a **throwaway generator/evaluation harness** against the existing demo Plan and adversarial fixtures. Produce the exact draft schema, deterministic invariants, safety-rule adapter, and a plain rendered session plan. Review those outputs with target users and a qualified nutrition/food-safety professional.

The feature's biggest uncertainty is not whether a four-tab screen can be built. It is whether the app can transform sparse nutritionist Dish descriptions into an operational draft that is faithful, safe, and genuinely easier than the user's own Sunday routine. Resolve that uncertainty first; then build the polished end-to-end flow around a trusted contract.

## Sources

Sources were accessed 2026-08-25. Competitor capabilities are based on first-party product/help pages and should be treated as documented claims, not independent effectiveness evidence.

- [AnyList — Meal Planning](https://www.anylist.com/meal-planning)
- [BatchPrep — Meal Prep Made Simple](https://batchprep.app/)
- [Ducrot et al. — Meal planning and diet quality (2017)](https://doi.org/10.1186/s12966-017-0461-7)
- [Eat This Much — How To](https://www.eatthismuch.com/how-to/)
- [Eat This Much — grocery list behavior](https://help.eatthismuch.com/help/how-does-the-grocery-list-work)
- [FDA — Are You Storing Food Safely?](https://www.fda.gov/consumers/consumer-updates/are-you-storing-food-safely)
- [FDA — Refrigerator Thermometers: Cold Facts](https://www.fda.gov/food/buy-store-serve-safe-food/refrigerator-thermometers-cold-facts-about-food-safety)
- [FDA — Food Allergies](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/food-allergies)
- [FoodSafety.gov — Cold Food Storage Chart](https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts)
- [Harvo — Cook once, eat all week](https://getharvo.com/)
- [Hieronimus et al. — Nutrient adequacy of AI-generated meal plans (2024)](https://www.sciencedirect.com/science/article/pii/S0271531724000915)
- [Mealime — Getting Started](https://support.mealime.com/article/151-getting-started-guide)
- [MODU — Modular Meal Prep](https://www.modumeal.com/)
- [MyFitnessPal — How do I use the Meal Planner?](https://support.myfitnesspal.com/hc/en-us/articles/34603055097869-How-do-I-use-the-Meal-Planner)
- [NOM-251-SSA1-2009 — Prácticas de higiene](https://dof.gob.mx/normasOficiales/3980/salud/salud.htm)
- [Niszczota and Rybicka — Robo-diets for people with food allergies (2023)](https://pubmed.ncbi.nlm.nih.gov/37269717/)
- [OnlyPans — Cook 3 times, eat 7 days](https://onlypans.app/)
- [OpenAI — Responses API and Structured Outputs](https://developers.openai.com/api/reference/java/resources/beta/subresources/responses)
- [Paprika — Features](https://www.paprikaapp.com/)
- [Samsung Food — Getting Started with Meal Planner](https://support.samsungfood.com/hc/en-us/articles/35369657798548-Getting-Started-with-Meal-Planner)
- [Secretaría de Salud — Manejo de alimentos en temporada de calor](https://www.gob.mx/salud/documentos/manejo-y-consumo-de-alimentos-temporada-de-calor)
- [SENASICA — Inocuidad desde casa](https://www.gob.mx/senasica/articulos/como-contribuimos-a-la-inocuidad-desde-casa?idiom=es)
- [SideChef — Meal Planner](https://www.sidechef.com/meal-planner/)
- [USDA FSIS — Leftovers and Food Safety](https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety)
- [USDA MyPlate — Cook Once, Eat Multiple Times](https://www.myplate.gov/sites/default/files/2024-09/MyPlate-Resource-Efficient-Eats-Cook-Once-Eat-Multiple-Times.pdf)
- [USDA MyPlate — Make a Plan](https://www.myplate.gov/eathealthy/budget/budget-weekly-meals)
- [WHO — Safe and ethical AI for health](https://www.who.int/news/item/16-05-2023-who-calls-for-safe-and-ethical-ai-for-health)
