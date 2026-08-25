import { MEAL_TAGS, type MealTag } from "@/app/lib/levelup";

export class MealTagsConfigurationError extends Error {}

const SYSTEM_PROMPT = `Eres un clasificador de comidas para una app de salud en español. Dada la descripción de una comida, elige solo las etiquetas de la siguiente lista que claramente apliquen. Puedes elegir varias o ninguna.

- Proteína: carne, pollo, pescado, huevo, tofu u otra fuente principal de proteína.
- Verduras: incluye verduras o vegetales.
- Fruta: incluye fruta entera o en trozos; no incluye jugos.
- Grano integral: arroz integral, avena, pan integral u otro grano sin refinar.
- Grano refinado: pan blanco, arroz blanco, pasta refinada u otro carbohidrato refinado (opuesto a Grano integral).
- Legumbres: frijoles, lentejas, garbanzos u otras legumbres.
- Pescado: incluye pescado o mariscos.
- Nueces y semillas: incluye nueces, almendras, semillas, cacahuates, etc.
- Grasa insaturada: incluye aguacate, aceite de oliva u otra fuente claramente identificable de grasa insaturada.
- Lácteos: incluye leche, queso, yogur u otro lácteo.
- Huevo: incluye huevo.
- Frito: el platillo está frito o capeado.
- Bebida azucarada: refresco, jugo endulzado, bebida energética u otra bebida con azúcar añadida.
- Postre / azúcar añadida: postre, dulce o azúcar añadida clara (distinto de una bebida azucarada).
- Muy procesado: comida chatarra o ultraprocesada en general (snacks empaquetados, comida rápida) que no encaje mejor en Frito o Carne procesada.
- Carne procesada: embutidos, tocino, salchicha, jamón u otra carne procesada.
- Alcohol: incluye alguna bebida alcohólica.

Responde solo con las etiquetas claramente implicadas por el texto. Si no estás seguro de una etiqueta, no la incluyas — es preferible sugerir de menos que de más.`;

const MEAL_TAGS_JSON_SCHEMA = {
  name: "meal_tags",
  strict: true,
  schema: {
    type: "object",
    properties: {
      tags: {
        type: "array",
        items: { type: "string", enum: MEAL_TAGS },
      },
    },
    required: ["tags"],
    additionalProperties: false,
  },
};

function getOpenAiConfig(): { apiKey: string; model: string } {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new MealTagsConfigurationError("Las sugerencias de IA todavía no están configuradas en el servidor");
  }
  const model = process.env.OPENAI_MEAL_TAGS_MODEL ?? "gpt-4.1-nano";
  return { apiKey, model };
}

export async function suggestMealTags(description: string): Promise<MealTag[]> {
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
        { role: "user", content: description },
      ],
      response_format: { type: "json_schema", json_schema: MEAL_TAGS_JSON_SCHEMA },
      temperature: 0,
      max_tokens: 200,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("La respuesta de OpenAI no incluyó etiquetas");
  const parsed = JSON.parse(content) as { tags?: unknown };
  const tags = Array.isArray(parsed.tags) ? parsed.tags : [];
  const valid = tags.filter((tag): tag is MealTag => MEAL_TAGS.includes(tag as MealTag));
  return Array.from(new Set(valid));
}
