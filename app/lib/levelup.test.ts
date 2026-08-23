import { describe, expect, it } from 'vitest';
import {
  deriveMealFromPlanSlot,
  getActivePlanForDate,
  getDayTypeForDate,
  getWeeklyShoppingList,
  type Plan,
  type PlanDish,
  type PlanIngredient,
  type PlanSlot,
  type PlanSupplement,
  type Weekday
} from './levelup';

function ingredient(
  name: string,
  quantityText: string,
  grams: number | null,
  unit: PlanIngredient['unit'] = grams === null ? null : 'g'
): PlanIngredient {
  return { name, quantityText, grams, unit };
}

function dish(
  name: string,
  tags: PlanDish['tags'],
  ingredients: PlanIngredient[]
): PlanDish {
  return { name, tags, ingredients };
}

const supplements: PlanSupplement[] = [
  { name: 'Bioleven', doseText: '1 cápsula por día hasta nuevo aviso' },
  { name: 'Omega', doseText: '1 cucharada sopera en la noche hasta nuevo aviso' },
  { name: 'Vit E 800 mg', doseText: 'Hasta nuevo aviso' }
];

const mondayWednesdayFridaySunday: Plan['dayTypes'][number] = {
  id: 'mon-wed-fri-sun',
  name: 'Lunes, Miércoles, Viernes, Domingo',
  weekdays: [1, 3, 5, 0] satisfies Weekday[],
  references: [
    { label: 'Al despertar', text: 'Agua: 300 ml' },
    { label: 'Medio día', text: 'Agua: 300 ml' }
  ],
  slots: [
    {
      id: 'a-breakfast',
      name: 'Desayuno',
      dishes: [
        dish('Jugo verde pepino', ['Verduras'], [
          ingredient('Pepino, pelado', '1 taza (180 g)', 180),
          ingredient('Espinaca, cruda', '1 taza (60 g)', 60)
        ]),
        dish('Huevo a la mexicana', ['Proteína', 'Huevo'], [
          ingredient('Huevo entero fresco', '2 piezas (100 g)', 100),
          ingredient('Clara de huevo', '2 piezas (66 g)', 66),
          ingredient('Tomate rojo', '10 ⅓ rebanadas (103 g)', 103),
          ingredient('Chile jalapeño crudo', '1 pieza (15 g)', 15),
          ingredient('Cebolla picada', '2 cucharadas (10 g)', 10),
          ingredient('Aceite de oliva', '1 cucharadita (5 ml)', 5, 'ml')
        ]),
        dish('Aguacate', [], [ingredient('Aguacate', '⅔ pieza (62 g)', 62)])
      ]
    },
    {
      id: 'a-lunch',
      name: 'Comida',
      dishes: [
        dish('Pechuga a la plancha con verduras', ['Proteína', 'Verduras'], [
          ingredient('Pollo, pechuga asada', '180 g', 180),
          ingredient('Pepino', '1 taza (104 g)', 104),
          ingredient('Tomate rojo', '10 ⅓ rebanadas (103 g)', 103)
        ]),
        dish('Guacamole', ['Verduras'], [
          ingredient('Aguacate', '⅓ pieza (34 g)', 34),
          ingredient('Tomate', '1 rebanada (10 g)', 10),
          ingredient('Cebolla', '2 cucharadas (10 g)', 10)
        ]),
        dish('Galletas salmas', ['Grano refinado'], [ingredient('Galletas salmas', '1 paquete pequeño (18 g)', 18)]),
        dish('Agua de jamaica', ['Bebida azucarada'], [])
      ]
    },
    {
      id: 'a-afternoon',
      name: 'Media tarde',
      dishes: [
        dish('Jícama con pepino', ['Verduras'], [
          ingredient('Pepino pelado', '½ taza (50 g)', 50),
          ingredient('Jícama', '½ taza (40 g)', 40)
        ])
      ]
    },
    {
      id: 'a-dinner',
      name: 'Cena',
      dishes: [
        dish('Sándwich de atún', ['Proteína', 'Verduras', 'Grano refinado'], [
          ingredient('Jitomate guaje', '30 g', 30),
          ingredient('Pepino, con cáscara', '⅓ taza (30 g)', 30),
          ingredient('Cebolla blanca', '20 g', 20),
          ingredient('Mostaza', '0.1 taza (20 g)', 20),
          ingredient('PAN THINS', '2 rebanadas (42 g)', 42),
          ingredient('Atún en agua, drenado', '1 lata (90 ml)', 90, 'ml'),
          ingredient('Aguacate', '⅓ pieza (31 g)', 31)
        ]),
        dish('Té de manzanilla', [], [])
      ]
    }
  ]
};

const tuesdayThursdaySaturday: Plan['dayTypes'][number] = {
  id: 'tue-thu-sat',
  name: 'Martes, Jueves, Sábado',
  weekdays: [2, 4, 6] satisfies Weekday[],
  references: [
    { label: 'Al despertar', text: 'Agua: 300 ml' },
    { label: 'Medio día', text: 'Agua: 300 ml' }
  ],
  slots: [
    {
      id: 'b-breakfast',
      name: 'Desayuno',
      dishes: [
        dish('Jugo verde pepino', ['Verduras'], [
          ingredient('Pepino, pelado', '1 taza (180 g)', 180),
          ingredient('Espinaca, cruda', '1 taza (60 g)', 60)
        ]),
        dish('Huevo con champiñones', ['Proteína', 'Huevo'], [
          ingredient('Huevo entero fresco', '2 piezas (100 g)', 100),
          ingredient('Clara de huevo', '2 piezas (66 g)', 66),
          ingredient('Champiñones', '1 taza (122 g)', 122),
          ingredient('Aceite de oliva', '1 cucharadita (5 ml)', 5, 'ml')
        ]),
        dish('Aguacate', [], [ingredient('Aguacate', '⅓ pieza (31 g)', 31)])
      ]
    },
    {
      id: 'b-lunch',
      name: 'Comida',
      dishes: [
        dish('Pescado a la plancha con verduras', ['Proteína', 'Verduras', 'Pescado'], [
          ingredient('Filete de pescado', '240 g', 240),
          ingredient('Brócoli', '2 tazas (140 g)', 140),
          ingredient('Coliflor', '½ taza (80 g)', 80)
        ]),
        dish('Guacamole', ['Verduras'], [
          ingredient('Aguacate', '⅓ pieza (34 g)', 34),
          ingredient('Tomate', '1 rebanada (10 g)', 10),
          ingredient('Cebolla', '2 cucharadas (10 g)', 10)
        ]),
        dish('Galletas salmas', ['Grano refinado'], [ingredient('Galletas salmas', '1 paquete pequeño (18 g)', 18)]),
        dish('Agua de jamaica', ['Bebida azucarada'], [])
      ]
    },
    {
      id: 'b-afternoon',
      name: 'Media tarde',
      dishes: [
        dish('Jícama con pepino', ['Verduras'], [
          ingredient('Pepino pelado', '½ taza (50 g)', 50),
          ingredient('Jícama', '½ taza (40 g)', 40)
        ])
      ]
    },
    {
      id: 'b-dinner',
      name: 'Cena',
      dishes: [
        dish('Sándwich de pechuga', ['Proteína', 'Verduras', 'Grano refinado'], [
          ingredient('Pepino, con cáscara', '⅓ taza (30 g)', 30),
          ingredient('Cebolla blanca', '20 g', 20),
          ingredient('Mostaza', '0.1 taza (20 g)', 20),
          ingredient('PAN THINS', '2 rebanadas (42 g)', 42),
          ingredient('Aguacate', '⅓ pieza (31 g)', 31),
          ingredient('Pechuga de pollo sin piel aplanada', '3 unidades (90 g)', 90)
        ]),
        dish('Té de manzanilla', [], [])
      ]
    }
  ]
};

const menuPlan: Plan = {
  id: 'nutritionist-visit-2026-08',
  startDate: '2026-08-10',
  endDate: null,
  dayTypes: [mondayWednesdayFridaySunday, tuesdayThursdaySaturday],
  supplements
};

describe('nutrition Plan resolution', () => {
  it('uses the most recent matching Plan and treats endDate as exclusive', () => {
    const plans: Plan[] = [
      { ...menuPlan, id: 'older', startDate: '2026-01-01', endDate: '2026-08-15' },
      { ...menuPlan, id: 'newer', startDate: '2026-08-01', endDate: null }
    ];

    expect(getActivePlanForDate(plans, '2026-08-14')?.id).toBe('newer');
    expect(getActivePlanForDate([{ ...menuPlan, endDate: '2026-08-15' }], '2026-08-15')).toBeNull();
    expect(getActivePlanForDate(plans, '2025-12-31')).toBeNull();
  });

  it('resolves the day-type by the date weekday', () => {
    expect(getDayTypeForDate(menuPlan, '2026-08-10')?.id).toBe('mon-wed-fri-sun');
    expect(getDayTypeForDate(menuPlan, '2026-08-11')?.id).toBe('tue-thu-sat');
    expect(getDayTypeForDate(menuPlan, '2026-08-16')?.id).toBe('mon-wed-fri-sun');
  });
});

describe('Plan Slot to Meal derivation', () => {
  it('maps a prescribed slot to the existing Meal shape and unions dish tags', () => {
    const slot: PlanSlot = {
      id: 'slot',
      name: 'Media tarde',
      dishes: [
        dish('Fruta con yogur', ['Fruta', 'Lácteos'], []),
        dish('Nueces', ['Nueces y semillas', 'Lácteos'], [])
      ]
    };

    expect(deriveMealFromPlanSlot(slot)).toEqual({
      type: 'Snack',
      description: 'Fruta con yogur, Nueces',
      tags: ['Fruta', 'Lácteos', 'Nueces y semillas']
    });
  });
});

describe('weekly Shopping List aggregation', () => {
  it('sums the real menu quantities by normalized ingredient and day-type frequency', () => {
    const shoppingList = getWeeklyShoppingList(menuPlan, '2026-08-10');

    expect(shoppingList.items.find(item => item.name === 'Pepino')).toEqual({
      name: 'Pepino',
      amount: 2236,
      unit: 'g'
    });
    expect(shoppingList.items.find(item => item.name === 'Aguacate')).toEqual({
      name: 'Aguacate',
      amount: 796,
      unit: 'g'
    });
    expect(shoppingList.items.some(item => item.name === 'Agua de jamaica')).toBe(false);
  });

  it('keeps grams and milliliters as separate units', () => {
    const shoppingList = getWeeklyShoppingList(menuPlan, '2026-08-10');

    expect(shoppingList.items.find(item => item.name === 'Aceite de oliva')).toEqual({
      name: 'Aceite de oliva',
      amount: 35,
      unit: 'ml'
    });
    expect(shoppingList.items.find(item => item.name === 'Atún en agua, drenado')).toEqual({
      name: 'Atún en agua, drenado',
      amount: 360,
      unit: 'ml'
    });
  });

  it('lists ingredients without a numeric equivalent separately with their source quantity', () => {
    const planWithUnquantifiedIngredient: Plan = {
      ...menuPlan,
      dayTypes: menuPlan.dayTypes.map(dayType => ({
        ...dayType,
        slots: dayType.slots.map(slot => ({
          ...slot,
          dishes: slot.dishes.map((currentDish, index) =>
            index === 0 && slot.id === 'b-breakfast'
              ? {
                  ...currentDish,
                  ingredients: [
                    ...currentDish.ingredients,
                    ingredient('Canela', 'al gusto', null)
                  ]
                }
              : currentDish
          )
        }))
      }))
    };

    const shoppingList = getWeeklyShoppingList(planWithUnquantifiedIngredient, '2026-08-10');

    expect(shoppingList.unquantified.filter(item => item.name === 'Canela')).toHaveLength(3);
    expect(shoppingList.unquantified[0]).toMatchObject({
      name: 'Canela',
      quantityText: 'al gusto',
      dayTypeId: 'tue-thu-sat'
    });
  });

  it('does not invent a unit when a numeric equivalent has no unit', () => {
    const planWithMissingUnit: Plan = {
      ...menuPlan,
      dayTypes: menuPlan.dayTypes.map(dayType => ({
        ...dayType,
        slots: dayType.slots.map(slot => ({
          ...slot,
          dishes: slot.dishes.map((currentDish, index) =>
            index === 0 && slot.id === 'a-breakfast'
              ? {
                  ...currentDish,
                  ingredients: [...currentDish.ingredients, ingredient('Ingrediente ambiguo', '1 porción', 100, null)]
                }
              : currentDish
          )
        }))
      }))
    };

    const shoppingList = getWeeklyShoppingList(planWithMissingUnit, '2026-08-10');

    expect(shoppingList.items.some(item => item.name === 'Ingrediente ambiguo')).toBe(false);
    expect(shoppingList.unquantified.filter(item => item.name === 'Ingrediente ambiguo')).toHaveLength(4);
  });

  it('counts only the days where a Plan is active when a week crosses its date range', () => {
    const partialPlan: Plan = {
      ...menuPlan,
      startDate: '2026-08-12',
      endDate: '2026-08-15'
    };

    const shoppingList = getWeeklyShoppingList(partialPlan, '2026-08-10');

    expect(shoppingList.items.find(item => item.name === 'Pepino')).toEqual({
      name: 'Pepino',
      amount: 988,
      unit: 'g'
    });
    expect(shoppingList.items.find(item => item.name === 'Aguacate')).toEqual({
      name: 'Aguacate',
      amount: 350,
      unit: 'g'
    });
  });
});
