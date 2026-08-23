import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseNutritionPlan } from './nutrition-plan-server';

function modelResponse(ingredient: { name: string; quantityText: string; grams: number; unit: 'g' | 'ml' }) {
  return {
    dayTypes: [{
      name: 'Todos los días',
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      references: [],
      slots: [{
        name: 'Desayuno',
        dishes: [{ name: 'Plato', tags: [], ingredients: [ingredient] }]
      }]
    }],
    supplements: []
  };
}

function mockOpenAiResponse(value: unknown) {
  vi.stubEnv('OPENAI_API_KEY', 'test-key');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
    new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(value) } }]
    }), { status: 200 })
  ));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('nutrition plan equivalent validation', () => {
  it('removes a model-invented equivalent absent from the source menu', async () => {
    mockOpenAiResponse(modelResponse({
      name: 'Pepino',
      quantityText: '1 pieza',
      grams: 100,
      unit: 'g'
    }));

    const draft = await parseNutritionPlan('Lunes\nPepino: 1 pieza');

    expect(draft.dayTypes[0].slots[0].dishes[0].ingredients[0]).toMatchObject({
      name: 'Pepino',
      quantityText: '1 pieza',
      grams: null,
      unit: null
    });
  });

  it('keeps an equivalent when the same ingredient and value appear together in the source', async () => {
    mockOpenAiResponse(modelResponse({
      name: 'Pepino',
      quantityText: '1 taza (180 g)',
      grams: 180,
      unit: 'g'
    }));

    const draft = await parseNutritionPlan('Lunes\nPepino: 1 taza (180 g)');

    expect(draft.dayTypes[0].slots[0].dishes[0].ingredients[0]).toMatchObject({
      grams: 180,
      unit: 'g'
    });
  });

  it('does not borrow an equivalent from a different ingredient line', async () => {
    mockOpenAiResponse(modelResponse({
      name: 'Pepino',
      quantityText: '1 pieza',
      grams: 100,
      unit: 'g'
    }));

    const draft = await parseNutritionPlan('Lunes\nPepino: 1 pieza\nJitomate: 100 g');

    expect(draft.dayTypes[0].slots[0].dishes[0].ingredients[0].grams).toBeNull();
  });

  it('does not borrow a neighboring equivalent when the source quantity omits it', async () => {
    mockOpenAiResponse(modelResponse({
      name: 'Pepino',
      quantityText: '1 pieza',
      grams: 100,
      unit: 'g'
    }));

    const draft = await parseNutritionPlan('Lunes\nPepino: 1 pieza, Jitomate: 100 g');

    expect(draft.dayTypes[0].slots[0].dishes[0].ingredients[0].grams).toBeNull();
  });

  it('groups repeated meal headings into one slot while preserving dish order', async () => {
    const response = modelResponse({
      name: 'Pepino',
      quantityText: '1 taza (180 g)',
      grams: 180,
      unit: 'g'
    });
    response.dayTypes[0].slots = [
      {
        name: 'Desayuno',
        dishes: [{ name: 'Jugo verde', tags: [], ingredients: [] }]
      },
      {
        name: 'desayuno',
        dishes: [{ name: 'Huevo', tags: [], ingredients: [] }]
      },
      {
        name: 'Comida',
        dishes: [{ name: 'Pollo', tags: [], ingredients: [] }]
      }
    ];
    mockOpenAiResponse(response);

    const draft = await parseNutritionPlan('Desayuno\nJugo verde\nHuevo\nComida\nPollo');

    expect(draft.dayTypes[0].slots).toHaveLength(2);
    expect(draft.dayTypes[0].slots[0].name).toBe('Desayuno');
    expect(draft.dayTypes[0].slots[0].dishes.map(dish => dish.name)).toEqual(['Jugo verde', 'Huevo']);
    expect(draft.dayTypes[0].slots[1].name).toBe('Comida');
  });
});
