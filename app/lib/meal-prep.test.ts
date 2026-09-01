import { describe, expect, it } from 'vitest';
import {
  createDeterministicMealPrepDraft,
  getShoppingScopeKey,
  getNextOpenSelectionDates,
  resolveMealPrepWeek,
  validateMealPrepDraft,
} from './meal-prep';
import type { MealPrepPreferences, Plan } from './levelup';

function plan(id: string, startDate: string, endDate: string | null, dishName: string): Plan {
  return {
    id,
    startDate,
    endDate,
    supplements: [],
    dayTypes: [{
      id: `${id}-every-day`,
      name: 'Todos los días',
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      references: [],
      slots: [{
        id: `${id}-lunch`,
        name: 'Comida',
        dishes: [{
          name: dishName,
          tags: ['Proteína'],
          ingredients: [{ name: dishName, quantityText: '100 g', grams: 100, unit: 'g' }],
        }],
      }],
    }],
  };
}

function preferences(freezerAvailable = true): MealPrepPreferences {
  return {
    style: 'balanced',
    freezerAvailable,
    equipment: ['estufa'],
    sessions: [{ scheduledFor: '2026-08-23T17:00:00', maxMinutes: 180 }],
  };
}

describe('Meal Prep weekly expansion', () => {
  it('updates open day selections from a captured details state', () => {
    expect(getNextOpenSelectionDates([], '2026-08-24', true)).toEqual(['2026-08-24']);
    expect(getNextOpenSelectionDates(['2026-08-24'], '2026-08-24', false)).toEqual([]);
  });

  it('resolves the Plan independently for every date across a version boundary', () => {
    const week = resolveMealPrepWeek([
      plan('old', '2026-01-01', '2026-08-27', 'Pollo a la plancha'),
      plan('new', '2026-08-27', null, 'Pescado a la plancha'),
    ], '2026-08-24');

    expect(week.occurrences.filter(item => item.planId === 'old')).toHaveLength(3);
    expect(week.occurrences.filter(item => item.planId === 'new')).toHaveLength(4);
    expect(week.planRefs).toEqual([
      { planId: 'old', dates: ['2026-08-24', '2026-08-25', '2026-08-26'] },
      { planId: 'new', dates: ['2026-08-27', '2026-08-28', '2026-08-29', '2026-08-30'] },
    ]);
  });

  it('produces a stable week/source key for scoped shopping completion', () => {
    const first = resolveMealPrepWeek([plan('one', '2026-01-01', null, 'Pollo a la plancha')], '2026-08-24');
    const same = resolveMealPrepWeek([plan('one', '2026-01-01', null, 'Pollo a la plancha')], '2026-08-24');
    const changed = resolveMealPrepWeek([plan('one', '2026-01-01', null, 'Pescado a la plancha')], '2026-08-24');

    expect(getShoppingScopeKey(first.weekStart, first.sourceFingerprint)).toBe(getShoppingScopeKey(same.weekStart, same.sourceFingerprint));
    expect(changed.sourceFingerprint).not.toBe(first.sourceFingerprint);
  });
});

describe('Meal Prep safety validation', () => {
  it('does not refrigerate a Sunday batch through the following Saturday', () => {
    const week = resolveMealPrepWeek([plan('one', '2026-01-01', null, 'Pollo a la plancha')], '2026-08-24');
    const draft = createDeterministicMealPrepDraft(week, week.occurrences.map(item => item.id), preferences(false));
    const saturday = draft.portions.find(item => item.date === '2026-08-29');

    expect(saturday?.storage).toBe('fresh');
    expect(draft.finishSteps.some(item => item.occurrenceId === saturday?.occurrenceId)).toBe(true);
    expect(validateMealPrepDraft(week, week.occurrences.map(item => item.id), preferences(false), draft)).toEqual([]);
  });

  it('leaves overflow work for the day instead of exceeding a short session', () => {
    const multiDish = plan('one', '2026-01-01', null, 'Pollo a la plancha');
    multiDish.dayTypes[0].slots[0].dishes.push({
      name: 'Pescado a la plancha',
      tags: ['Proteína', 'Pescado'],
      ingredients: [{ name: 'Pescado', quantityText: '100 g', grams: 100, unit: 'g' }],
    });
    const week = resolveMealPrepWeek([multiDish], '2026-08-24');
    const prefs = { ...preferences(), style: 'maximum_ready' as const, sessions: [{ scheduledFor: '2026-08-23T17:00:00', maxMinutes: 45 }] };
    const draft = createDeterministicMealPrepDraft(week, week.occurrences.map(item => item.id), prefs);

    expect(draft.sessions[0].estimatedMinutes).toBeLessThanOrEqual(55);
    expect(draft.finishSteps.some(item => item.instruction.includes('no cabe'))).toBe(true);
    expect(validateMealPrepDraft(week, week.occurrences.map(item => item.id), prefs, draft)).toEqual([]);
  });

  it('rejects an AI allocation outside the four-day refrigerator ceiling', () => {
    const week = resolveMealPrepWeek([plan('one', '2026-01-01', null, 'Pollo a la plancha')], '2026-08-24');
    const prefs = preferences(true);
    const draft = createDeterministicMealPrepDraft(week, week.occurrences.map(item => item.id), prefs);
    const saturday = draft.portions.find(item => item.date === '2026-08-29');
    expect(saturday).toBeDefined();
    if (!saturday) return;
    saturday.storage = 'refrigerator';
    saturday.preparedAt = '2026-08-23T17:00:00';

    expect(validateMealPrepDraft(week, week.occurrences.map(item => item.id), prefs, draft).join(' ')).toContain('excede 4 días');
  });

  it('rejects task references to an ingredient outside the source Plan', () => {
    const week = resolveMealPrepWeek([plan('one', '2026-01-01', null, 'Pollo a la plancha')], '2026-08-24');
    const prefs = preferences();
    const draft = createDeterministicMealPrepDraft(week, week.occurrences.map(item => item.id), prefs);
    draft.tasks[0].sourceIngredientRefs.push('invented-salt');

    expect(validateMealPrepDraft(week, week.occurrences.map(item => item.id), prefs, draft).join(' ')).toContain('ingrediente desconocido');
  });

  it('creates frozen ingredient packs and a blend step for green juice', () => {
    const juicePlan = plan('juice', '2026-01-01', null, 'Jugo verde');
    juicePlan.dayTypes[0].slots[0].dishes[0].ingredients = [
      { name: 'Pepino', quantityText: '180 g', grams: 180, unit: 'g' },
      { name: 'Espinaca', quantityText: '60 g', grams: 60, unit: 'g' },
    ];
    const week = resolveMealPrepWeek([juicePlan], '2026-08-24');
    const draft = createDeterministicMealPrepDraft(week, week.occurrences.map(item => item.id), preferences(true));
    const component = draft.batches.find(batch => batch.kind === 'component');

    expect(component?.label).toContain('Jugo verde');
    expect(component?.quantityDisplay).toContain('Pepino');
    expect(draft.portions.every(portion => portion.storage === 'freezer')).toBe(true);
    expect(draft.finishSteps.every(step => step.instruction.includes('licuadora'))).toBe(true);
  });

  it('keeps eggs and fish fresh while preparing their vegetables ahead', () => {
    const componentPlan = plan('components', '2026-01-01', null, 'Huevo a la mexicana');
    componentPlan.dayTypes[0].slots[0].dishes = [
      {
        name: 'Huevo a la mexicana',
        tags: ['Proteína'],
        ingredients: [
          { name: 'Huevo entero', quantityText: '100 g', grams: 100, unit: 'g' },
          { name: 'Tomate', quantityText: '100 g', grams: 100, unit: 'g' },
          { name: 'Cebolla', quantityText: '10 g', grams: 10, unit: 'g' },
          { name: 'Chile jalapeño', quantityText: '15 g', grams: 15, unit: 'g' },
        ],
      },
      {
        name: 'Pescado a la plancha con verduras',
        tags: ['Proteína', 'Pescado'],
        ingredients: [
          { name: 'Filete de pescado', quantityText: '240 g', grams: 240, unit: 'g' },
          { name: 'Brócoli', quantityText: '140 g', grams: 140, unit: 'g' },
          { name: 'Coliflor', quantityText: '80 g', grams: 80, unit: 'g' },
        ],
      },
    ];
    const week = resolveMealPrepWeek([componentPlan], '2026-08-24');
    const draft = createDeterministicMealPrepDraft(week, week.occurrences.map(item => item.id), preferences(true));
    const componentText = draft.batches.filter(batch => batch.kind === 'component').map(batch => batch.quantityDisplay).join(' ');

    expect(componentText).toContain('Tomate');
    expect(componentText).toContain('Brócoli');
    expect(componentText).toContain('Coliflor');
    expect(componentText).not.toContain('Huevo entero');
    expect(componentText).not.toContain('Filete de pescado');
    expect(draft.batches.some(batch => batch.kind === 'dish')).toBe(false);
    expect(draft.finishSteps.some(step => step.instruction.includes('Huevo a la mexicana') && step.instruction.includes('fresco'))).toBe(true);
    expect(draft.finishSteps.some(step => step.instruction.includes('Pescado a la plancha') && step.instruction.includes('fresco'))).toBe(true);
  });

  it('prepares guacamole vegetables but leaves avocado for the day', () => {
    const guacamolePlan = plan('guacamole', '2026-01-01', null, 'Guacamole');
    guacamolePlan.dayTypes[0].slots[0].dishes[0].ingredients = [
      { name: 'Aguacate', quantityText: '34 g', grams: 34, unit: 'g' },
      { name: 'Tomate', quantityText: '10 g', grams: 10, unit: 'g' },
      { name: 'Cebolla', quantityText: '10 g', grams: 10, unit: 'g' },
    ];
    const week = resolveMealPrepWeek([guacamolePlan], '2026-08-24');
    const draft = createDeterministicMealPrepDraft(week, week.occurrences.map(item => item.id), preferences(true));
    const componentText = draft.batches.filter(batch => batch.kind === 'component').map(batch => batch.quantityDisplay).join(' ');

    expect(componentText).toContain('Tomate');
    expect(componentText).toContain('Cebolla');
    expect(componentText).not.toContain('Aguacate');
    expect(draft.finishSteps.every(step => step.instruction.includes('aguacate al momento'))).toBe(true);
  });
});
