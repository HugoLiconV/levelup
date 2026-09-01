import {
  createDeterministicMealPrepDraft,
  validateMealPrepDraft,
  type MealPrepDraftContent,
  type MealPrepWeek,
} from './meal-prep';
import type { MealPrepPreferences, PrepProvenance } from './levelup';

export class MealPrepConfigurationError extends Error {}
export class MealPrepGenerationError extends Error {}

const TASK_KINDS = ['wash', 'cut', 'cook', 'cool', 'portion', 'label', 'store', 'clean'];
const PROVENANCE = ['plan', 'ai_suggestion', 'safety_rule'];

const MEAL_PREP_SCHEMA = {
  name: 'meal_prep_draft',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      sessions: { type: 'array', items: strictObject({ id: { type: 'string' }, scheduledFor: { type: 'string' }, estimatedMinutes: { type: 'integer' }, taskIds: { type: 'array', items: { type: 'string' } } }) },
      tasks: { type: 'array', items: strictObject({
        id: { type: 'string' }, kind: { type: 'string', enum: TASK_KINDS }, instruction: { type: 'string' }, estimatedMinutes: { type: 'integer' },
        dependencyIds: { type: 'array', items: { type: 'string' } }, sourceDishRefs: { type: 'array', items: { type: 'string' } },
        sourceIngredientRefs: { type: 'array', items: { type: 'string' } }, equipment: { type: 'array', items: { type: 'string' } }, provenance: { type: 'string', enum: PROVENANCE },
      }) },
      batches: { type: 'array', items: strictObject({ id: { type: 'string' }, kind: { type: 'string', enum: ['dish', 'component'] }, label: { type: 'string' }, sourceDishRefs: { type: 'array', items: { type: 'string' } }, sourceIngredientRefs: { type: 'array', items: { type: 'string' } }, portionIds: { type: 'array', items: { type: 'string' } }, quantityDisplay: { type: 'string' } }) },
      portions: { type: 'array', items: strictObject({
        id: { type: 'string' }, occurrenceId: { type: 'string' }, batchId: nullableString(), date: { type: 'string' }, planId: { type: 'string' }, dayTypeId: { type: 'string' }, slotId: { type: 'string' },
        storage: { type: 'string', enum: ['refrigerator', 'freezer', 'fresh'] }, preparedAt: nullableString(), consumeBy: nullableString(), thawAt: nullableString(), finishInstruction: nullableString(),
      }) },
      finishSteps: { type: 'array', items: strictObject({ id: { type: 'string' }, occurrenceId: { type: 'string' }, date: { type: 'string' }, slotId: { type: 'string' }, instruction: { type: 'string' }, provenance: { type: 'string', enum: PROVENANCE } }) },
      assumptions: { type: 'array', items: strictObject({ id: { type: 'string' }, text: { type: 'string' }, provenance: { type: 'string', enum: PROVENANCE } }) },
    },
    required: ['sessions', 'tasks', 'batches', 'portions', 'finishSteps', 'assumptions'],
    additionalProperties: false,
  },
};

function strictObject(properties: Record<string, unknown>) {
  return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false };
}

function nullableString() {
  return { anyOf: [{ type: 'string' }, { type: 'null' }] };
}

const SYSTEM_PROMPT = `Eres un asistente de ejecución de meal prep. El Plan del nutriólogo es inmutable: no agregues, quites, sustituyas ni cambies cantidades de alimentos.

Recibirás ocurrencias de Slots con IDs estables, restricciones del usuario y un borrador determinista seguro. Mejora el agrupamiento, el orden y la claridad de las tareas en español, conservando referencias y resultados. Reglas:
- Cada Slot seleccionado debe conservar una porción o un Finish Step.
- Conserva los Component Batches del borrador: representan ingredientes lavados, cortados o porcionados para terminar un platillo fresco ese día.
- No conviertas automáticamente huevos, pescado, jugos, guacamole ni sándwiches en platillos cocinados con anticipación cuando el borrador los deja frescos.
- No escribas alimentos nuevos. Toda tarea de alimento debe usar únicamente sourceDishRefs/sourceIngredientRefs recibidos.
- Conserva sin cambios las instrucciones provenance=safety_rule.
- Una técnica inferida debe llevar provenance=ai_suggestion.
- Prefiere trabajo secuencial y duraciones realistas dentro de cada máximo.
- No conviertas texto libre de cantidades en totales.
- No hagas afirmaciones médicas, nutricionales ni de alérgenos.
- Devuelve solamente el JSON del esquema.`;

function assertDraftShape(value: unknown): MealPrepDraftContent {
  if (!value || typeof value !== 'object') throw new MealPrepGenerationError('La IA no devolvió un borrador válido');
  const draft = value as Partial<MealPrepDraftContent>;
  if (!Array.isArray(draft.sessions) || !Array.isArray(draft.tasks) || !Array.isArray(draft.batches) || !Array.isArray(draft.portions) || !Array.isArray(draft.finishSteps) || !Array.isArray(draft.assumptions)) {
    throw new MealPrepGenerationError('La IA devolvió un borrador incompleto');
  }
  return draft as MealPrepDraftContent;
}

function protectSafetyRules(baseline: MealPrepDraftContent, candidate: MealPrepDraftContent): MealPrepDraftContent {
  const candidateTasks = new Map(candidate.tasks.map(task => [task.id, task]));
  const candidateFinishSteps = new Map(candidate.finishSteps.map(step => [step.id, step]));
  return {
    ...baseline,
    tasks: baseline.tasks.map(task => {
      const suggestion = candidateTasks.get(task.id);
      if (!suggestion || task.provenance === 'safety_rule') return task;
      return { ...task, instruction: suggestion.instruction, equipment: suggestion.equipment };
    }),
    finishSteps: baseline.finishSteps.map(step => {
      const suggestion = candidateFinishSteps.get(step.id);
      if (!suggestion || step.provenance === 'safety_rule') return step;
      return { ...step, instruction: suggestion.instruction };
    }),
    assumptions: candidate.assumptions.map(assumption => ({ ...assumption, provenance: PROVENANCE.includes(assumption.provenance) ? assumption.provenance : 'ai_suggestion' as PrepProvenance })),
  };
}

export async function generateMealPrepDraft(
  week: MealPrepWeek,
  selectedOccurrenceIds: string[],
  preferences: MealPrepPreferences,
): Promise<{ draft: MealPrepDraftContent; mode: 'ai' | 'safe_baseline' }> {
  const baseline = createDeterministicMealPrepDraft(week, selectedOccurrenceIds, preferences);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { draft: baseline, mode: 'safe_baseline' };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MEAL_PREP_MODEL ?? 'gpt-5.6-luna',
      messages: [
        { role: 'developer', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify({ week, selectedOccurrenceIds, preferences, baseline }) },
      ],
      response_format: { type: 'json_schema', json_schema: MEAL_PREP_SCHEMA },
      reasoning_effort: 'low',
      max_completion_tokens: 16000,
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw new MealPrepGenerationError(`OpenAI request failed (${response.status})`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string }; finish_reason?: string }> };
  if (payload.choices?.[0]?.finish_reason === 'length') throw new MealPrepGenerationError('La generación quedó incompleta');
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new MealPrepGenerationError('La IA no devolvió un borrador');
  const draft = protectSafetyRules(baseline, assertDraftShape(JSON.parse(content)));
  const errors = validateMealPrepDraft(week, selectedOccurrenceIds, preferences, draft);
  if (errors.length) throw new MealPrepGenerationError(errors.slice(0, 3).join(' '));
  return { draft, mode: 'ai' };
}
