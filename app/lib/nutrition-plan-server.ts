import {
  MEAL_TAGS,
  type DayType,
  type MealTag,
  type PlanDish,
  type PlanIngredient,
  type PlanSlot,
  type PlanSupplement,
  type PlanReference,
  type PlanDraft
} from "./levelup";

export class NutritionPlanConfigurationError extends Error {}

const SYSTEM_PROMPT = `Eres un asistente que convierte el menú de un nutriólogo en un borrador estructurado para una app de seguimiento. El texto puede estar en español, tener abreviaturas, tablas copiadas o instrucciones incompletas.

Extrae todos los day-types (variantes de días), sus weekdays usando la convención de JavaScript (domingo 0, lunes 1 ... sábado 6), referencias no rastreables, slots rastreables, platillos, ingredientes y suplementos.

Reglas importantes:
- Conserva los nombres y cantidades originales en español. quantityText debe ser el texto de cantidad tal como aparece en el menú.
- Convierte a grams solo cuando el menú da un equivalente numérico claro en gramos o mililitros. Para mililitros usa unit "ml"; para gramos usa "g". Si no se puede derivar, usa grams null y unit null.
- Incluye la preparación o variedad en el nombre del ingrediente cuando aparezca, por ejemplo "Pepino, pelado".
- Usa references para instrucciones como agua al despertar, agua a medio día u otras notas que no deben crear una comida rastreable. No las conviertas en slots.
- Un slot debe representar una comida que la persona pueda marcar, como Desayuno, Comida, Cena o Media tarde.
- Agrupa todos los platillos que pertenecen a la misma comida bajo un solo slot. No repitas un slot con el mismo nombre para cada platillo.
- Deriva solo las etiquetas claramente implicadas por el nombre, la descripción o los ingredientes del platillo. Usa exclusivamente esta lista: ${MEAL_TAGS.join(", ")}. Usa "Grasa insaturada" para aguacate, aceite de oliva, nueces o semillas; usa "Fruta" solo para fruta entera o en trozos, no para jugos.
- Si el menú contiene una sola variante para todos los días, crea un solo day-type con weekdays [0,1,2,3,4,5,6]. Si menciona dos o más variantes, asígnales los weekdays indicados.
- No inventes ingredientes, cantidades, suplementos ni días que no estén en el texto. Si algo no está claro, consérvalo en el texto visible y deja el dato derivado en null.
- Responde los nombres y textos en el idioma predominante del menú; si mezcla idiomas, conserva cada elemento en su idioma original.

Devuelve únicamente el objeto JSON solicitado por el esquema.`;

const NUTRITION_PLAN_JSON_SCHEMA = {
  name: "nutrition_plan",
  strict: true,
  schema: {
    type: "object",
    properties: {
      dayTypes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            weekdays: {
              type: "array",
              items: { type: "integer", enum: [0, 1, 2, 3, 4, 5, 6] },
            },
            references: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  text: { type: "string" },
                },
                required: ["label", "text"],
                additionalProperties: false,
              },
            },
            slots: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  dishes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        tags: { type: "array", items: { type: "string", enum: MEAL_TAGS } },
                        ingredients: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string" },
                              quantityText: { type: "string" },
                              grams: { anyOf: [{ type: "number" }, { type: "null" }] },
                              unit: { anyOf: [{ type: "string", enum: ["g", "ml"] }, { type: "null" }] },
                            },
                            required: ["name", "quantityText", "grams", "unit"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["name", "tags", "ingredients"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["name", "dishes"],
                additionalProperties: false,
              },
            },
          },
          required: ["name", "weekdays", "references", "slots"],
          additionalProperties: false,
        },
      },
      supplements: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            doseText: { type: "string" },
          },
          required: ["name", "doseText"],
          additionalProperties: false,
        },
      },
    },
    required: ["dayTypes", "supplements"],
    additionalProperties: false,
  },
};

function getOpenAiConfig(): { apiKey: string; model: string } {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new NutritionPlanConfigurationError("Las sugerencias de IA todavía no están configuradas en el servidor");
  }
  const model = process.env.OPENAI_NUTRITION_PLAN_MODEL ?? "gpt-4.1-nano";
  return { apiKey, model };
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeReference(value: unknown): PlanReference {
  if (!value || typeof value !== "object") return { label: "", text: "" };
  const reference = value as { label?: unknown; text?: unknown };
  const label = asText(reference.label);
  const text = asText(reference.text);
  return { label, text };
}

function normalizeSourceText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getTokenPattern(value: string): RegExp | null {
  const tokens = normalizeSourceText(value).match(/[a-z0-9]+/g) ?? [];
  if (tokens.length === 0) return null;
  return new RegExp(`(?<![a-z0-9])${tokens.map(escapeRegExp).join("[^a-z0-9]+")}(?![a-z0-9])`, "i");
}

function getIngredientNamePattern(name: string): RegExp | null {
  return getTokenPattern(name);
}

function getEquivalentNumberPattern(grams: number): string {
  const plain = String(grams);
  const patterns = [Number.isInteger(grams)
    ? `${escapeRegExp(plain)}(?:[.,]0+)?`
    : plain.replace(".", "\\.")];
  if (Number.isInteger(grams) && grams >= 1000) {
    const grouped = plain.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    patterns.push(escapeRegExp(grouped).replace(/ /g, "[., ]+"));
  } else if (!Number.isInteger(grams)) {
    const [whole, fraction = ""] = plain.split(".");
    const trimmedFraction = fraction.replace(/0+$/, "");
    if (trimmedFraction) {
      patterns.push(`${escapeRegExp(whole)}[.,]${escapeRegExp(trimmedFraction)}0*`);
    }
  }
  return `(?:${patterns.join("|")})`;
}

function hasSourceEquivalent(sourceText: string, name: string, quantityText: string, grams: number, unit: "g" | "ml"): boolean {
  const namePattern = getIngredientNamePattern(name);
  const quantityPattern = getTokenPattern(quantityText);
  if (!namePattern || !quantityPattern) return false;

  const unitPattern = unit === "g" ? "(?:g|gr|gramos?)" : "(?:ml|mililitros?)";
  const equivalentPattern = new RegExp(
    `(?:^|[^\\d.,])${getEquivalentNumberPattern(grams)}(?![\\d.,])\\s*${unitPattern}(?![a-z])`,
    "i"
  );

  const sourceSegments = sourceText
    .split(/\r?\n|[;•●]+/)
    .map(normalizeSourceText)
    .filter(Boolean);
  for (const segment of sourceSegments) {
    let searchFrom = 0;
    while (searchFrom < segment.length) {
      const match = namePattern.exec(segment.slice(searchFrom));
      if (!match || match.index === undefined) break;
      const nameStart = searchFrom + match.index;
      const nameEnd = nameStart + match[0].length;
      const windowStart = Math.max(0, nameStart - 50);
      const windowEnd = Math.min(segment.length, nameEnd + 80);
      const evidenceWindow = segment.slice(windowStart, windowEnd);
      const quantityMatch = quantityPattern.exec(evidenceWindow);
      if (quantityMatch && quantityMatch.index !== undefined) {
        const quantityEvidence = evidenceWindow.slice(
          quantityMatch.index,
          quantityMatch.index + quantityMatch[0].length
        );
        if (equivalentPattern.test(quantityEvidence)) return true;
      }
      searchFrom = nameEnd;
    }
  }
  return false;
}

function normalizeIngredient(value: unknown, sourceText: string): PlanIngredient {
  if (!value || typeof value !== "object") return { name: "", quantityText: "", grams: null, unit: null };
  const ingredient = value as {
    name?: unknown;
    quantityText?: unknown;
    grams?: unknown;
    unit?: unknown;
  };
  const name = asText(ingredient.name);
  const quantityText = asText(ingredient.quantityText);
  if (!name || !quantityText) return { name, quantityText, grams: null, unit: null };
  const grams = typeof ingredient.grams === "number" && Number.isFinite(ingredient.grams)
    ? ingredient.grams
    : null;
  const unit = ingredient.unit === "g" || ingredient.unit === "ml" ? ingredient.unit : null;
  const hasValidEquivalent = grams !== null
    && grams >= 0
    && unit !== null
    && hasSourceEquivalent(sourceText, name, quantityText, grams, unit);
  return {
    name,
    quantityText,
    grams: hasValidEquivalent ? grams : null,
    unit: hasValidEquivalent ? unit : null,
  };
}

function normalizeDish(value: unknown, sourceText: string): PlanDish {
  if (!value || typeof value !== "object") return { name: "", tags: [], ingredients: [] };
  const dish = value as { name?: unknown; tags?: unknown; ingredients?: unknown };
  const name = asText(dish.name);
  const tags = Array.isArray(dish.tags)
    ? Array.from(new Set(dish.tags.filter((tag): tag is MealTag => MEAL_TAGS.includes(tag as MealTag))))
    : [];
  const ingredients = Array.isArray(dish.ingredients)
    ? dish.ingredients.map(ingredient => normalizeIngredient(ingredient, sourceText))
    : [];
  return { name, tags, ingredients };
}

function normalizeSlot(value: unknown, dayTypeIndex: number, slotIndex: number, sourceText: string): PlanSlot {
  if (!value || typeof value !== "object") return { id: `draft-slot-${dayTypeIndex + 1}-${slotIndex + 1}`, name: "", dishes: [] };
  const slot = value as { name?: unknown; dishes?: unknown };
  const name = asText(slot.name);
  const dishes = Array.isArray(slot.dishes)
    ? slot.dishes
        .map(dish => normalizeDish(dish, sourceText))
    : [];
  return { id: `draft-slot-${dayTypeIndex + 1}-${slotIndex + 1}`, name, dishes };
}

function mergeDuplicateSlots(slots: PlanSlot[]): PlanSlot[] {
  const merged: PlanSlot[] = [];
  const slotIndexes = new Map<string, number>();

  for (const slot of slots) {
    const key = normalizeSourceText(slot.name);
    if (!key || !slotIndexes.has(key)) {
      slotIndexes.set(key, merged.length);
      merged.push(slot);
      continue;
    }

    const existingIndex = slotIndexes.get(key);
    if (existingIndex === undefined) continue;
    const existing = merged[existingIndex];
    merged[existingIndex] = {
      ...existing,
      dishes: [...existing.dishes, ...slot.dishes],
    };
  }

  return merged;
}

function normalizeDayType(value: unknown, dayTypeIndex: number, sourceText: string): DayType {
  if (!value || typeof value !== "object") return { id: `draft-day-type-${dayTypeIndex + 1}`, name: "", weekdays: [], references: [], slots: [] };
  const dayType = value as {
    name?: unknown;
    weekdays?: unknown;
    references?: unknown;
    slots?: unknown;
  };
  const name = asText(dayType.name);
  const weekdays = Array.isArray(dayType.weekdays)
    ? Array.from(new Set(dayType.weekdays.filter((weekday): weekday is DayType["weekdays"][number] =>
        typeof weekday === "number" && weekday >= 0 && weekday <= 6 && Number.isInteger(weekday))))
    : [];
  const references = Array.isArray(dayType.references)
    ? dayType.references.map(normalizeReference)
    : [];
  const slots = Array.isArray(dayType.slots)
    ? dayType.slots
        .map((slot, slotIndex) => normalizeSlot(slot, dayTypeIndex, slotIndex, sourceText))
    : [];
  return {
    id: `draft-day-type-${dayTypeIndex + 1}`,
    name,
    weekdays,
    references,
    slots: mergeDuplicateSlots(slots),
  };
}

function normalizeSupplement(value: unknown): PlanSupplement {
  if (!value || typeof value !== "object") return { name: "", doseText: "" };
  const supplement = value as { name?: unknown; doseText?: unknown };
  const name = asText(supplement.name);
  const doseText = asText(supplement.doseText);
  return { name, doseText };
}

function normalizeDraft(value: unknown, sourceText: string): PlanDraft {
  if (!value || typeof value !== "object") throw new Error("La respuesta de OpenAI no incluyó un plan");
  const draft = value as { dayTypes?: unknown; supplements?: unknown };
  const dayTypes = Array.isArray(draft.dayTypes)
    ? draft.dayTypes.map((dayType, index) => normalizeDayType(dayType, index, sourceText))
    : [];
  const supplements = Array.isArray(draft.supplements)
    ? draft.supplements.map(normalizeSupplement)
    : [];
  if (dayTypes.length === 0) throw new Error("La respuesta de OpenAI no incluyó días de menú");
  return { dayTypes, supplements };
}

export async function parseNutritionPlan(rawText: string): Promise<PlanDraft> {
  const { apiKey, model } = getOpenAiConfig();
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: rawText },
      ],
      response_format: { type: "json_schema", json_schema: NUTRITION_PLAN_JSON_SCHEMA },
      temperature: 0,
      max_tokens: 8000,
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("La respuesta de OpenAI no incluyó un plan");
  return normalizeDraft(JSON.parse(content), rawText);
}
