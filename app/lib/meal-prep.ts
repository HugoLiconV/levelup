import {
  addDays,
  getActivePlanForDate,
  getDateRange,
  getDayTypeForDate,
  type MealPrepPlan,
  type MealPrepPreferences,
  type Plan,
  type PlanDish,
  type PlanIngredient,
  type PlanSlot,
  type PrepBatch,
  type PrepPortion,
  type PrepSession,
  type PrepTask,
} from './levelup';

export const MEAL_PREP_GENERATOR_VERSION = 'meal-prep-v2-components';
export const SAFETY_POLICY_VERSION = 'household-baseline-2026-08';
export const MAX_REFRIGERATED_DAYS = 4;

export interface MealPrepOccurrence {
  id: string;
  date: string;
  planId: string;
  dayTypeId: string;
  slot: PlanSlot;
  dishRefs: Array<{ id: string; dish: PlanDish }>;
  ingredientRefs: Array<{ id: string; dishId: string; ingredient: PlanIngredient }>;
}

export interface MealPrepWeek {
  weekStart: string;
  occurrences: MealPrepOccurrence[];
  planRefs: Array<{ planId: string; dates: string[] }>;
  sourceFingerprint: string;
}

export interface MealPrepDraftContent {
  sessions: PrepSession[];
  tasks: PrepTask[];
  batches: PrepBatch[];
  portions: PrepPortion[];
  finishSteps: MealPrepPlan['finishSteps'];
  assumptions: MealPrepPlan['assumptions'];
}

function safeRefPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '');
}

export function getOccurrenceId(date: string, planId: string, dayTypeId: string, slotId: string): string {
  return [date, planId, dayTypeId, slotId].map(safeRefPart).join('__');
}

function fingerprint(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `mp-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function resolveMealPrepWeek(plans: Plan[], weekStart: string): MealPrepWeek {
  const occurrences: MealPrepOccurrence[] = [];
  const refs = new Map<string, string[]>();

  for (const date of getDateRange(weekStart, 7)) {
    const plan = getActivePlanForDate(plans, date);
    if (!plan) continue;
    const dayType = getDayTypeForDate(plan, date);
    if (!dayType) continue;
    refs.set(plan.id, [...(refs.get(plan.id) ?? []), date]);

    for (const slot of dayType.slots) {
      const occurrenceId = getOccurrenceId(date, plan.id, dayType.id, slot.id);
      const dishRefs = slot.dishes.map((dish, dishIndex) => ({
        id: `${occurrenceId}__dish-${dishIndex}`,
        dish,
      }));
      const ingredientRefs = dishRefs.flatMap(({ id: dishId, dish }) =>
        dish.ingredients.map((ingredient, ingredientIndex) => ({
          id: `${dishId}__ingredient-${ingredientIndex}`,
          dishId,
          ingredient,
        }))
      );
      occurrences.push({
        id: occurrenceId,
        date,
        planId: plan.id,
        dayTypeId: dayType.id,
        slot,
        dishRefs,
        ingredientRefs,
      });
    }
  }

  const planRefs = Array.from(refs, ([planId, dates]) => ({ planId, dates }));
  const source = occurrences.map(occurrence => ({
    id: occurrence.id,
    dishes: occurrence.dishRefs.map(({ id, dish }) => ({
      id,
      name: dish.name,
      ingredients: dish.ingredients,
    })),
  }));
  return { weekStart, occurrences, planRefs, sourceFingerprint: fingerprint(JSON.stringify(source)) };
}

export function getShoppingScopeKey(weekStart: string, sourceFingerprint: string): string {
  return `${weekStart}|${sourceFingerprint}`;
}

export function getNextOpenSelectionDates(current: string[], date: string, isOpen: boolean): string[] {
  if (!isOpen) return current.filter(item => item !== date);
  return current.includes(date) ? current : [...current, date];
}

function normalized(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX');
}

function isAlwaysFreshDish(name: string): boolean {
  return /aguacate|guacamole|jugo|sandwich|sandwich|ensalada|te |agua de|galleta|fruta/.test(normalized(name));
}

function needsCooking(name: string): boolean {
  return /pollo|pechuga|pescado|huevo|carne|cerdo|hornead|plancha|cocid/.test(normalized(name));
}

function prefersFreshCooking(name: string): boolean {
  return /huevo|pescado/.test(normalized(name));
}

function isPrepFriendlyProduce(name: string): boolean {
  return /pepino|espinaca|champinon|tomate|jitomate|cebolla|jalapeno|chile|brocoli|coliflor|jicama|zanahoria|apio|lechuga|calabac|pimiento|cilantro|perejil/.test(normalized(name));
}

function componentIngredients(dish: PlanDish): PlanIngredient[] {
  const dishName = normalized(dish.name);
  return dish.ingredients.filter(ingredient => {
    const name = normalized(ingredient.name);
    if (!isPrepFriendlyProduce(name)) return false;
    if (/aguacate/.test(name)) return false;
    if (/huevo|clara|pollo|pechuga|pescado|atun|carne|cerdo/.test(name)) return false;
    if (/jugo/.test(dishName)) return true;
    if (/guacamole|aguacate|huevo|pescado|sandwich|ensalada|jicama/.test(dishName)) return true;
    return false;
  });
}

function componentFinishInstruction(dishName: string, ingredientNames: string[], hasPreparedKit: boolean): string {
  const name = normalized(dishName);
  if (ingredientNames.length === 0) return `Prepara ${dishName} al momento con las cantidades de tu Plan.`;
  const kit = hasPreparedKit ? ` Usa la porción preparada de ${ingredientNames.join(', ')}.` : '';
  if (/jugo/.test(name)) return `Pon la porción de ${ingredientNames.join(', ')} en la licuadora y licúa al momento.`;
  if (/huevo/.test(name)) return `Cocina ${dishName} fresco.${kit}`;
  if (/pescado/.test(name)) return `Cocina ${dishName} fresco.${kit}`;
  if (/guacamole|aguacate/.test(name)) return `Corta o machaca el aguacate al momento.${kit}`;
  if (/sandwich/.test(name)) return `Arma ${dishName} al momento.${kit}`;
  return `Termina ${dishName} al momento.${kit}`;
}

function measuredIngredientTotals(ingredients: PlanIngredient[]): string[] {
  const totals = new Map<string, number>();
  for (const ingredient of ingredients) {
    if (ingredient.grams === null || ingredient.unit === null) continue;
    const key = `${ingredient.name}|${ingredient.unit}`;
    totals.set(key, (totals.get(key) ?? 0) + ingredient.grams);
  }
  return Array.from(totals, ([key, amount]) => {
    const [name, unit] = key.split('|');
    return `${name}: ${amount.toLocaleString('es-MX')} ${unit}`;
  });
}

function quantityDisplay(occurrences: MealPrepOccurrence[], dishName: string): string {
  const matching = occurrences.flatMap(occurrence =>
    occurrence.dishRefs.filter(({ dish }) => dish.name === dishName).map(({ dish }) => dish)
  );
  const measured = new Map<string, number>();
  for (const dish of matching) {
    for (const ingredient of dish.ingredients) {
      if (ingredient.grams !== null && ingredient.unit !== null) {
        const key = `${ingredient.name}|${ingredient.unit}`;
        measured.set(key, (measured.get(key) ?? 0) + ingredient.grams);
      }
    }
  }
  const totals = Array.from(measured, ([key, amount]) => {
    const [name, unit] = key.split('|');
    return `${name}: ${amount.toLocaleString('es-MX')} ${unit}`;
  });
  return totals.length
    ? `${matching.length} porciones · ${totals.join(' · ')}`
    : `${matching.length} porciones · conserva las cantidades indicadas por porción`;
}

function sessionIndexForDate(sessions: PrepSession[], date: string): number {
  let selected = 0;
  sessions.forEach((session, index) => {
    if (session.scheduledFor.slice(0, 10) <= date && session.scheduledFor > sessions[selected].scheduledFor) selected = index;
  });
  return selected;
}

/** Safe, deterministic draft used as the server-side baseline and degraded-mode generator. */
export function createDeterministicMealPrepDraft(
  week: MealPrepWeek,
  selectedOccurrenceIds: string[],
  preferences: MealPrepPreferences,
): MealPrepDraftContent {
  const selected = week.occurrences.filter(item => selectedOccurrenceIds.includes(item.id));
  const sessions: PrepSession[] = preferences.sessions.map((session, index) => ({
    id: `session-${index + 1}`,
    scheduledFor: session.scheduledFor,
    estimatedMinutes: 0,
    taskIds: [],
  }));
  const tasks: PrepTask[] = [];
  const batches: PrepBatch[] = [];
  const portions: PrepPortion[] = [];
  const finishSteps: MealPrepPlan['finishSteps'] = [];
  const assumptions: MealPrepPlan['assumptions'] = [{
    id: 'assumption-methods',
    text: 'Las técnicas son sugerencias operativas; usa el método habitual indicado por tu nutriólogo cuando difiera.',
    provenance: 'ai_suggestion',
  }];

  const dishGroups = new Map<string, Array<{ occurrence: MealPrepOccurrence; dishId: string; dish: PlanDish }>>();
  for (const occurrence of selected) {
    for (const { id: dishId, dish } of occurrence.dishRefs) {
      const key = normalized(dish.name);
      dishGroups.set(key, [...(dishGroups.get(key) ?? []), { occurrence, dishId, dish }]);
    }
  }

  let batchIndex = 0;
  for (const entries of dishGroups.values()) {
    const bySession = new Map<number, typeof entries>();
    for (const entry of entries) {
      const index = sessionIndexForDate(sessions, entry.occurrence.date);
      bySession.set(index, [...(bySession.get(index) ?? []), entry]);
    }

    for (const [sessionIndex, sessionEntries] of bySession) {
      const first = sessionEntries[0];
      const session = sessions[sessionIndex] ?? sessions[0];
      if (!first || !session) continue;
      const maximum = preferences.sessions[sessionIndex]?.maxMinutes ?? 180;
      const prepDate = session.scheduledFor.slice(0, 10);
      const shouldFinishFresh = isAlwaysFreshDish(first.dish.name)
        || !needsCooking(first.dish.name)
        || preferences.style === 'minimum_time'
        || (preferences.style === 'balanced' && prefersFreshCooking(first.dish.name));

      if (shouldFinishFresh) {
        const ingredients = componentIngredients(first.dish);
        const ingredientNames = ingredients.map(ingredient => ingredient.name);
        const freezeAsKit = /jugo/.test(normalized(first.dish.name)) && preferences.freezerAvailable;
        const canFitComponents = ingredients.length > 0 && session.estimatedMinutes + 20 <= maximum + 10;
        const storedEntries = canFitComponents ? sessionEntries.filter(entry => {
          const daysUntil = Math.max(0, Math.round((new Date(`${entry.occurrence.date}T12:00:00`).getTime() - new Date(`${prepDate}T12:00:00`).getTime()) / 86400000));
          return freezeAsKit || daysUntil <= MAX_REFRIGERATED_DAYS;
        }) : [];
        const preparedOccurrenceIds = new Set(storedEntries.map(entry => entry.occurrence.id));

        if (storedEntries.length > 0) {
          batchIndex += 1;
          const batchId = `batch-${batchIndex}`;
          const batchPortionIds: string[] = [];
          const sourceDishRefs = storedEntries.map(entry => entry.dishId);
          const sourceIngredientRefs = storedEntries.flatMap(entry => {
            const allowed = new Set(componentIngredients(entry.dish));
            return entry.occurrence.ingredientRefs.filter(ref => ref.dishId === entry.dishId && allowed.has(ref.ingredient)).map(ref => ref.id);
          });

          for (const { occurrence } of storedEntries) {
            const portionId = `portion-${portions.length + 1}`;
            batchPortionIds.push(portionId);
            portions.push({
              id: portionId,
              occurrenceId: occurrence.id,
              batchId,
              date: occurrence.date,
              planId: occurrence.planId,
              dayTypeId: occurrence.dayTypeId,
              slotId: occurrence.slot.id,
              storage: freezeAsKit ? 'freezer' : 'refrigerator',
              preparedAt: session.scheduledFor,
              consumeBy: freezeAsKit ? occurrence.date : addDays(prepDate, MAX_REFRIGERATED_DAYS),
              thawAt: null,
              finishInstruction: componentFinishInstruction(first.dish.name, ingredientNames, true),
            });
          }

          const washTask: PrepTask = {
            id: `task-${tasks.length + 1}`,
            kind: 'wash',
            instruction: `Lava ${ingredientNames.join(', ')} para ${first.dish.name}.`,
            estimatedMinutes: 6,
            dependencyIds: [],
            sourceDishRefs,
            sourceIngredientRefs,
            equipment: [],
            provenance: 'ai_suggestion',
          };
          const portionTask: PrepTask = {
            id: `task-${tasks.length + 2}`,
            kind: 'portion',
            instruction: `Corta cuando corresponda y divide ${ingredientNames.join(', ')} en ${batchPortionIds.length} porciones para ${first.dish.name}.`,
            estimatedMinutes: 10,
            dependencyIds: [washTask.id],
            sourceDishRefs,
            sourceIngredientRefs,
            equipment: [],
            provenance: 'ai_suggestion',
          };
          const storeTask: PrepTask = {
            id: `task-${tasks.length + 3}`,
            kind: 'store',
            instruction: `Etiqueta las porciones para ${first.dish.name} y guárdalas en ${freezeAsKit ? 'el congelador' : 'el refrigerador'}.`,
            estimatedMinutes: 4,
            dependencyIds: [portionTask.id],
            sourceDishRefs,
            sourceIngredientRefs: [],
            equipment: [],
            provenance: 'safety_rule',
          };
          tasks.push(washTask, portionTask, storeTask);
          session.taskIds.push(washTask.id, portionTask.id, storeTask.id);
          session.estimatedMinutes += 20;
          const totals = measuredIngredientTotals(storedEntries.flatMap(entry => componentIngredients(entry.dish)));
          batches.push({
            id: batchId,
            kind: 'component',
            label: `Porciones para ${first.dish.name}`,
            sourceDishRefs,
            sourceIngredientRefs,
            portionIds: batchPortionIds,
            quantityDisplay: totals.length ? `${batchPortionIds.length} porciones · ${totals.join(' · ')}` : `${batchPortionIds.length} porciones según tu Plan`,
          });
        }

        for (const { occurrence } of sessionEntries) {
          const hasPreparedKit = preparedOccurrenceIds.has(occurrence.id);
          finishSteps.push({
            id: `finish-${finishSteps.length + 1}`,
            occurrenceId: occurrence.id,
            date: occurrence.date,
            slotId: occurrence.slot.id,
            instruction: componentFinishInstruction(first.dish.name, ingredientNames, hasPreparedKit),
            provenance: hasPreparedKit ? 'ai_suggestion' : 'safety_rule',
          });
        }
        continue;
      }

      const sourceDishRefs = sessionEntries.map(entry => entry.dishId);
      if (session.estimatedMinutes + 38 > maximum + 10) {
        for (const { occurrence } of sessionEntries) {
          finishSteps.push({
            id: `finish-${finishSteps.length + 1}`,
            occurrenceId: occurrence.id,
            date: occurrence.date,
            slotId: occurrence.slot.id,
            instruction: `Cocina ${first.dish.name} ese día; no cabe de forma realista en el tiempo de preparación disponible.`,
            provenance: 'safety_rule',
          });
        }
        continue;
      }
      batchIndex += 1;
      const batchId = `batch-${batchIndex}`;
      const batchPortionIds: string[] = [];

      for (const { occurrence } of sessionEntries) {
        const daysUntil = Math.max(0, Math.round((new Date(`${occurrence.date}T12:00:00`).getTime() - new Date(`${prepDate}T12:00:00`).getTime()) / 86400000));
        const storage = daysUntil <= MAX_REFRIGERATED_DAYS ? 'refrigerator' : preferences.freezerAvailable ? 'freezer' : 'fresh';
        const portionId = `portion-${portions.length + 1}`;
        if (storage !== 'fresh') batchPortionIds.push(portionId);
        portions.push({
          id: portionId,
          occurrenceId: occurrence.id,
          batchId: storage === 'fresh' ? null : batchId,
          date: occurrence.date,
          planId: occurrence.planId,
          dayTypeId: occurrence.dayTypeId,
          slotId: occurrence.slot.id,
          storage,
          preparedAt: storage === 'fresh' ? null : session.scheduledFor,
          consumeBy: storage === 'refrigerator' ? addDays(prepDate, MAX_REFRIGERATED_DAYS) : occurrence.date,
          thawAt: storage === 'freezer' ? addDays(occurrence.date, -1) : null,
          finishInstruction: storage === 'fresh' ? `Cocina ${first.dish.name} ese día.` : storage === 'freezer' ? 'Descongela en refrigeración y recalienta completamente.' : 'Recalienta completamente antes de comer.',
        });
        if (storage === 'fresh') {
          finishSteps.push({
            id: `finish-${finishSteps.length + 1}`,
            occurrenceId: occurrence.id,
            date: occurrence.date,
            slotId: occurrence.slot.id,
            instruction: `Cocina ${first.dish.name} ese día; no se asignó almacenamiento inseguro.`,
            provenance: 'safety_rule',
          });
        }
      }

      const allIngredientRefs = sessionEntries.flatMap(entry => entry.occurrence.ingredientRefs.filter(ref => ref.dishId === entry.dishId).map(ref => ref.id));
      const cookTask: PrepTask = {
        id: `task-${tasks.length + 1}`,
        kind: 'cook',
        instruction: `Cocina ${first.dish.name} con tu método habitual, sin agregar ingredientes fuera del Plan.`,
        estimatedMinutes: 20,
        dependencyIds: [],
        sourceDishRefs,
        sourceIngredientRefs: allIngredientRefs,
        equipment: preferences.equipment.filter(item => item === 'estufa' || item === 'horno' || item === 'air-fryer').slice(0, 1),
        provenance: 'ai_suggestion',
      };
      const coolTask: PrepTask = {
        id: `task-${tasks.length + 2}`,
        kind: 'cool',
        instruction: `Divide ${first.dish.name} en recipientes poco profundos y refrigera pronto; no lo dejes fuera más de 2 horas (1 hora con calor mayor a 32 °C).`,
        estimatedMinutes: 10,
        dependencyIds: [cookTask.id],
        sourceDishRefs,
        sourceIngredientRefs: [],
        equipment: [],
        provenance: 'safety_rule',
      };
      const storeTask: PrepTask = {
        id: `task-${tasks.length + 3}`,
        kind: 'store',
        instruction: `Etiqueta y guarda ${batchPortionIds.length} porciones de ${first.dish.name} según el mapa de refrigerador/congelador.`,
        estimatedMinutes: 8,
        dependencyIds: [coolTask.id],
        sourceDishRefs,
        sourceIngredientRefs: [],
        equipment: [],
        provenance: 'safety_rule',
      };
      tasks.push(cookTask, coolTask, storeTask);
      session.taskIds.push(cookTask.id, coolTask.id, storeTask.id);
      session.estimatedMinutes += 38;
      batches.push({ id: batchId, kind: 'dish', label: first.dish.name, sourceDishRefs, sourceIngredientRefs: allIngredientRefs, portionIds: batchPortionIds, quantityDisplay: quantityDisplay(selected, first.dish.name) });
    }
  }

  for (const session of sessions) {
    if (session.taskIds.length === 0) {
      const task: PrepTask = {
        id: `task-${tasks.length + 1}`,
        kind: 'wash',
        instruction: 'Revisa, lava y organiza los ingredientes de los Slots incluidos. Mantén separados los alimentos crudos de los listos para comer.',
        estimatedMinutes: 12,
        dependencyIds: [],
        sourceDishRefs: [],
        sourceIngredientRefs: [],
        equipment: [],
        provenance: 'safety_rule',
      };
      tasks.push(task);
      session.taskIds.push(task.id);
      session.estimatedMinutes = 12;
    }
  }
  return { sessions, tasks, batches, portions, finishSteps, assumptions };
}

export function validateMealPrepDraft(
  week: MealPrepWeek,
  selectedOccurrenceIds: string[],
  preferences: MealPrepPreferences,
  draft: MealPrepDraftContent,
): string[] {
  const errors: string[] = [];
  const occurrenceIds = new Set(week.occurrences.map(item => item.id));
  const selected = new Set(selectedOccurrenceIds);
  const validDishRefs = new Set(week.occurrences.flatMap(item => item.dishRefs.map(ref => ref.id)));
  const validIngredientRefs = new Set(week.occurrences.flatMap(item => item.ingredientRefs.map(ref => ref.id)));
  const batchIds = new Set(draft.batches.map(batch => batch.id));
  const outcomes = new Map<string, number>();
  for (const portion of draft.portions) {
    outcomes.set(portion.occurrenceId, (outcomes.get(portion.occurrenceId) ?? 0) + 1);
    if (!occurrenceIds.has(portion.occurrenceId) || !selected.has(portion.occurrenceId)) errors.push(`Porción ${portion.id}: referencia un Slot no seleccionado.`);
    if (portion.storage === 'refrigerator' && portion.preparedAt && portion.date > addDays(portion.preparedAt.slice(0, 10), MAX_REFRIGERATED_DAYS)) errors.push(`Porción ${portion.id}: excede ${MAX_REFRIGERATED_DAYS} días en refrigeración.`);
    if (portion.batchId && !batchIds.has(portion.batchId)) errors.push(`Porción ${portion.id}: referencia un Batch desconocido.`);
    if (portion.storage === 'freezer' && !portion.thawAt && !portion.finishInstruction) errors.push(`Porción ${portion.id}: falta una acción de descongelado o uso desde congelado.`);
  }
  for (const step of draft.finishSteps) outcomes.set(step.occurrenceId, (outcomes.get(step.occurrenceId) ?? 0) + 1);
  for (const id of selected) if (!outcomes.has(id)) errors.push(`El Slot ${id} no tiene un resultado de preparación.`);
  for (const task of draft.tasks) {
    if (task.estimatedMinutes <= 0 || task.estimatedMinutes > 240) errors.push(`Tarea ${task.id}: duración inválida.`);
    if (task.sourceDishRefs.some(ref => !validDishRefs.has(ref))) errors.push(`Tarea ${task.id}: platillo desconocido.`);
    if (task.sourceIngredientRefs.some(ref => !validIngredientRefs.has(ref))) errors.push(`Tarea ${task.id}: ingrediente desconocido.`);
  }
  for (const batch of draft.batches) {
    if (batch.sourceDishRefs.some(ref => !validDishRefs.has(ref))) errors.push(`Batch ${batch.id}: platillo desconocido.`);
    if (batch.sourceIngredientRefs.some(ref => !validIngredientRefs.has(ref))) errors.push(`Batch ${batch.id}: ingrediente desconocido.`);
    if (batch.portionIds.some(id => !draft.portions.some(portion => portion.id === id && portion.batchId === batch.id))) errors.push(`Batch ${batch.id}: porción desconocida.`);
  }
  const taskIds = new Set(draft.tasks.map(task => task.id));
  for (const task of draft.tasks) if (task.dependencyIds.some(id => !taskIds.has(id))) errors.push(`Tarea ${task.id}: dependencia desconocida.`);
  for (const session of draft.sessions) {
    const maximum = preferences.sessions.find(item => item.scheduledFor === session.scheduledFor)?.maxMinutes;
    if (maximum && session.estimatedMinutes > maximum + 10) errors.push(`Sesión ${session.id}: excede el tiempo disponible.`);
  }
  return Array.from(new Set(errors));
}

export function materializeMealPrepPlan(
  week: MealPrepWeek,
  selectedOccurrenceIds: string[],
  preferences: MealPrepPreferences,
  draft: MealPrepDraftContent,
  now = new Date().toISOString(),
): MealPrepPlan {
  return {
    id: `meal-prep-${week.weekStart}-${Date.now()}`,
    weekStart: week.weekStart,
    version: 1,
    status: 'draft',
    planRefs: week.planRefs,
    sourceFingerprint: week.sourceFingerprint,
    selectedOccurrenceIds,
    preferences,
    ...draft,
    generatedAt: now,
    acceptedAt: null,
    generatorVersion: MEAL_PREP_GENERATOR_VERSION,
    safetyPolicyVersion: SAFETY_POLICY_VERSION,
  };
}

export function getCurrentMealPrepPlan(plans: MealPrepPlan[], weekStart: string): MealPrepPlan | null {
  return plans.filter(plan => plan.weekStart === weekStart && plan.status !== 'superseded')
    .sort((left, right) => right.version - left.version)[0] ?? null;
}
