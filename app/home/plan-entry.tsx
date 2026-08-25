'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Icon } from '../components/Icons';
import { DEMO_NUTRITION_MENU } from '../lib/demo-menu';
import {
  createId,
  getToday,
  getMealTagLabel,
  MEAL_TAG_GROUPS,
  type DayType,
  type Plan,
  type PlanDish,
  type PlanDraft,
  type PlanIngredient,
  type PlanReference,
  type PlanSlot,
  type PlanSupplement,
  type Weekday
} from '../lib/levelup';
import { classNames } from './shared';
import {
  ConfirmFlowExitDialog,
  FlowActionBar,
  FlowTopBar
} from './navigation';

type PlanToSave = Omit<Plan, 'id'>;
type ReviewStep = 'schedule' | 'meals' | 'supplements';
type DishSelection = {
  dayTypeIndex: number;
  slotIndex: number;
  dishIndex: number;
};

const MIN_MENU_TEXT_LENGTH = 20;

const weekdayOptions: Array<{ value: Weekday; label: string }> = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' }
];

const reviewSteps: Array<{ id: ReviewStep; label: string; title: string }> = [
  { id: 'schedule', label: 'Calendario', title: '¿Cuándo aplica este plan?' },
  { id: 'meals', label: 'Comidas', title: 'Revisa tus comidas' },
  { id: 'supplements', label: 'Suplementos', title: 'Revisa tus suplementos' }
];

function emptyIngredient(): PlanIngredient {
  return { name: '', quantityText: '', grams: null, unit: null };
}

function emptyDish(): PlanDish {
  return { name: '', tags: [], ingredients: [emptyIngredient()] };
}

function emptySlot(): PlanSlot {
  return { id: createId('draft-slot'), name: '', dishes: [emptyDish()] };
}

function emptyDayType(): DayType {
  return {
    id: createId('draft-day-type'),
    name: '',
    weekdays: [],
    references: [],
    slots: [emptySlot()]
  };
}

function emptySupplement(): PlanSupplement {
  return { name: '', doseText: '' };
}

function numberOrNull(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isPlanDraft(value: unknown): value is PlanDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as { dayTypes?: unknown; supplements?: unknown };
  return Array.isArray(draft.dayTypes) && Array.isArray(draft.supplements);
}

function weekdaysText(dayType: DayType): string {
  const labels = weekdayOptions
    .filter(option => dayType.weekdays.includes(option.value))
    .map(option => option.label);
  return labels.length > 0 ? labels.join(' · ') : 'Sin días seleccionados';
}

function countDishes(draft: PlanDraft): number {
  return draft.dayTypes.reduce(
    (total, dayType) => total + dayType.slots.reduce((slotTotal, slot) => slotTotal + slot.dishes.length, 0),
    0
  );
}

function countSlots(draft: PlanDraft): number {
  return draft.dayTypes.reduce((total, dayType) => total + dayType.slots.length, 0);
}

function countUnquantifiedIngredients(draft: PlanDraft): number {
  return draft.dayTypes.reduce(
    (total, dayType) => total + dayType.slots.reduce(
      (slotTotal, slot) => slotTotal + slot.dishes.reduce(
        (dishTotal, dish) => dishTotal + dish.ingredients.filter(ingredient => ingredient.grams === null).length,
        0
      ),
      0
    ),
    0
  );
}

function ingredientSummary(dish: PlanDish): string {
  if (dish.ingredients.length === 0) return 'Sin ingredientes detectados';
  const visible = dish.ingredients
    .slice(0, 2)
    .map(ingredient => `${ingredient.name || 'Ingrediente'} · ${ingredient.quantityText || 'sin cantidad'}`)
    .join(' · ');
  const remaining = dish.ingredients.length - 2;
  return remaining > 0 ? `${visible} · +${remaining} más` : visible;
}

function draftValidationError(
  draft: PlanDraft,
  startDate: string,
  endDate: string,
  step?: ReviewStep
): string | null {
  if (step === 'schedule' || !step) {
    if (!startDate) return 'Elige la fecha en que empieza este plan.';
    if (endDate && endDate <= startDate) {
      return 'La fecha de término debe ser posterior a la fecha de inicio.';
    }
    if (draft.dayTypes.length === 0) return 'Agrega al menos un tipo de día.';
    if (draft.dayTypes.some(dayType => !dayType.name.trim() || dayType.weekdays.length === 0)) {
      return 'Cada tipo de día necesita un nombre y al menos un día de la semana.';
    }
    if (draft.dayTypes.some(dayType => dayType.references.some(reference => !reference.label.trim() || !reference.text.trim()))) {
      return 'Completa la etiqueta y el texto de cada referencia o elimina la fila vacía.';
    }
  }

  if (step === 'meals' || !step) {
    if (draft.dayTypes.some(dayType => dayType.slots.length === 0)) {
      return 'Cada tipo de día necesita al menos una comida.';
    }
    if (draft.dayTypes.some(dayType => dayType.slots.some(slot => !slot.name.trim() || slot.dishes.length === 0))) {
      return 'Cada comida necesita un nombre y al menos un platillo.';
    }
    if (draft.dayTypes.some(dayType => dayType.slots.some(slot => slot.dishes.some(dish => !dish.name.trim())))) {
      return 'Cada platillo necesita un nombre antes de guardar.';
    }
    if (draft.dayTypes.some(dayType => dayType.slots.some(slot => slot.dishes.some(dish => dish.ingredients.some(ingredient => !ingredient.name.trim() || !ingredient.quantityText.trim()))))) {
      return 'Completa el nombre y la cantidad original de cada ingrediente o elimina la fila vacía.';
    }
    if (draft.dayTypes.some(dayType => dayType.slots.some(slot => slot.dishes.some(dish => dish.ingredients.some(ingredient => ingredient.grams !== null && ingredient.unit === null))))) {
      return 'Elige g o ml para cada equivalente numérico, o borra ese equivalente.';
    }
  }

  if (step === 'supplements' || !step) {
    if (draft.supplements.some(supplement => !supplement.name.trim() || !supplement.doseText.trim())) {
      return 'Completa el nombre y la dosis de cada suplemento o elimina la fila vacía.';
    }
  }

  return null;
}

function updateDayType(
  draft: PlanDraft,
  dayTypeIndex: number,
  update: (dayType: DayType) => DayType
): PlanDraft {
  return {
    ...draft,
    dayTypes: draft.dayTypes.map((dayType, index) =>
      index === dayTypeIndex ? update(dayType) : dayType
    )
  };
}

function updateSlot(
  draft: PlanDraft,
  dayTypeIndex: number,
  slotIndex: number,
  update: (slot: PlanSlot) => PlanSlot
): PlanDraft {
  return updateDayType(draft, dayTypeIndex, dayType => ({
    ...dayType,
    slots: dayType.slots.map((slot, index) => index === slotIndex ? update(slot) : slot)
  }));
}

function updateDish(
  draft: PlanDraft,
  dayTypeIndex: number,
  slotIndex: number,
  dishIndex: number,
  update: (dish: PlanDish) => PlanDish
): PlanDraft {
  return updateSlot(draft, dayTypeIndex, slotIndex, slot => ({
    ...slot,
    dishes: slot.dishes.map((dish, index) => index === dishIndex ? update(dish) : dish)
  }));
}

function updateIngredient(
  draft: PlanDraft,
  dayTypeIndex: number,
  slotIndex: number,
  dishIndex: number,
  ingredientIndex: number,
  update: (ingredient: PlanIngredient) => PlanIngredient
): PlanDraft {
  return updateDish(draft, dayTypeIndex, slotIndex, dishIndex, dish => ({
    ...dish,
    ingredients: dish.ingredients.map((ingredient, index) =>
      index === ingredientIndex ? update(ingredient) : ingredient
    )
  }));
}

export function PlanEntryScreen({
  onClose,
  onSave,
  onViewToday
}: {
  onClose: () => void;
  onSave: (plan: PlanToSave) => void;
  onViewToday: () => void;
}) {
  const [stage, setStage] = useState<'paste' | 'review' | 'success'>('paste');
  const [reviewStep, setReviewStep] = useState<ReviewStep>('schedule');
  const [rawText, setRawText] = useState('');
  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState('');
  const [draft, setDraft] = useState<PlanDraft | null>(null);
  const [selectedDayTypeId, setSelectedDayTypeId] = useState<string | null>(null);
  const [selectedDish, setSelectedDish] = useState<DishSelection | null>(null);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [furthestUnlockedStep, setFurthestUnlockedStep] = useState(0);
  const [confirmExit, setConfirmExit] = useState(false);
  const requestAbortRef = useRef<AbortController | null>(null);
  const browserBackRef = useRef<() => void>(() => {});
  const closingRef = useRef(false);
  const flowHistoryActiveRef = useRef(false);
  const stepIndex = reviewSteps.findIndex(item => item.id === reviewStep);
  const hasUnsavedWork =
    stage !== 'success' && (rawText.trim().length > 0 || draft !== null);

  const closeFlowHistory = () => {
    closingRef.current = true;
    requestAbortRef.current?.abort();
    if (
      flowHistoryActiveRef.current &&
      window.history.state?.levelUpFlow === 'plan-entry'
    ) {
      flowHistoryActiveRef.current = false;
      window.history.back();
    }
  };

  const exitFlow = () => {
    closeFlowHistory();
    onClose();
  };

  const requestExit = () => {
    if (hasUnsavedWork) setConfirmExit(true);
    else exitFlow();
  };

  useEffect(() => {
    const flowState = {
      ...(window.history.state ?? {}),
      levelUpFlow: 'plan-entry'
    };
    window.history.pushState(flowState, '');
    flowHistoryActiveRef.current = true;

    const onPopState = () => {
      if (closingRef.current) return;
      window.history.pushState(flowState, '');
      flowHistoryActiveRef.current = true;
      browserBackRef.current();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!hasUnsavedWork) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsavedWork]);

  useEffect(() => () => requestAbortRef.current?.abort(), []);

  const parse = async (event: FormEvent) => {
    event.preventDefault();
    if (rawText.trim().length < MIN_MENU_TEXT_LENGTH) {
      setError(`Pega al menos ${MIN_MENU_TEXT_LENGTH} caracteres para crear un borrador útil.`);
      return;
    }
    setBusy(true);
    setError(null);
    const controller = new AbortController();
    requestAbortRef.current = controller;
    try {
      const response = await fetch('/api/nutrition-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText.trim() }),
        signal: controller.signal
      });
      const payload = await response.json() as { draft?: unknown; error?: unknown };
      if (!response.ok) {
        throw new Error(typeof payload.error === 'string' ? payload.error : 'No pudimos interpretar el menú');
      }
      const parsed = payload.draft;
      if (!isPlanDraft(parsed)) throw new Error('La respuesta no tiene una estructura de plan válida');
      setDraft(parsed);
      setSelectedDayTypeId(parsed.dayTypes[0]?.id ?? null);
      setSelectedDish(null);
      setSourceOpen(false);
      setReviewStep('schedule');
      setFurthestUnlockedStep(0);
      setStage('review');
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return;
      setError(caught instanceof Error ? caught.message : 'No pudimos interpretar el menú');
    } finally {
      if (requestAbortRef.current === controller) {
        requestAbortRef.current = null;
        setBusy(false);
      }
    }
  };

  const changeSource = () => {
    setStage('paste');
    setError(null);
    setSelectedDish(null);
    setSourceOpen(false);
  };

  const goToNextStep = () => {
    if (!draft) return;
    const validationError = draftValidationError(draft, startDate, endDate, reviewStep);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    if (reviewStep === 'schedule') setReviewStep('meals');
    if (reviewStep === 'schedule') setFurthestUnlockedStep(current => Math.max(current, 1));
    if (reviewStep === 'meals') {
      setSelectedDish(null);
      setReviewStep('supplements');
      setFurthestUnlockedStep(2);
    }
  };

  const save = () => {
    if (!draft) return;
    const validationError = draftValidationError(draft, startDate, endDate);
    if (validationError) {
      setError(validationError);
      return;
    }
    const plan = {
      startDate,
      endDate: endDate || null,
      dayTypes: draft.dayTypes,
      supplements: draft.supplements
    };
    closeFlowHistory();
    onSave(plan);
    setError(null);
    setStage('success');
  };

  const invalidateLaterSteps = () => {
    setFurthestUnlockedStep(current => Math.min(current, stepIndex));
  };

  const updateDraftState = (
    update: (current: PlanDraft | null) => PlanDraft | null
  ) => {
    invalidateLaterSteps();
    setDraft(update);
  };

  const goBackOneStep = () => {
    if (busy) {
      requestAbortRef.current?.abort();
      requestAbortRef.current = null;
      setBusy(false);
      setError(null);
      return;
    }
    if (stage === 'paste') {
      requestExit();
      return;
    }
    if (reviewStep === 'schedule') {
      changeSource();
      return;
    }
    setError(null);
    setSelectedDish(null);
    setReviewStep(reviewSteps[stepIndex - 1]?.id ?? 'schedule');
  };

  useEffect(() => {
    browserBackRef.current = goBackOneStep;
  });

  const selectedDayTypeIndex = draft
    ? Math.max(0, draft.dayTypes.findIndex(dayType => dayType.id === selectedDayTypeId))
    : 0;
  const selectedDayType = draft?.dayTypes[selectedDayTypeIndex] ?? null;

  const addDayType = () => {
    const dayType = emptyDayType();
    updateDraftState(current => current ? { ...current, dayTypes: [...current.dayTypes, dayType] } : current);
    setSelectedDayTypeId(dayType.id);
  };

  const removeDayType = (dayTypeIndex: number) => {
    updateDraftState(current => current ? {
      ...current,
      dayTypes: current.dayTypes.filter((_, index) => index !== dayTypeIndex)
    } : current);
    setSelectedDish(null);
  };

  const updateSupplement = (index: number, update: (supplement: PlanSupplement) => PlanSupplement) => {
    updateDraftState(current => current ? {
      ...current,
      supplements: current.supplements.map((supplement, supplementIndex) =>
        supplementIndex === index ? update(supplement) : supplement
      )
    } : current);
  };

  const stepMeta = reviewSteps[stepIndex] ?? reviewSteps[0];
  const menuTextLength = rawText.trim().length;
  const menuTextIsTooShort = menuTextLength > 0 && menuTextLength < MIN_MENU_TEXT_LENGTH;
  const pasteSubmitDisabled = busy || menuTextLength < MIN_MENU_TEXT_LENGTH;
  const demoMenuLoaded = rawText === DEMO_NUTRITION_MENU;
  const screenTitle = busy
    ? 'Estamos creando tu borrador'
    : stage === 'success'
      ? 'Tu plan ya está listo'
    : stage === 'paste'
      ? 'Pega tu menú'
      : stepMeta.title;
  const screenEyebrow = busy
    ? 'UN MOMENTO'
    : stage === 'success'
      ? 'PLAN GUARDADO'
    : stage === 'paste'
      ? null
      : `REVISIÓN GUIADA · ${stepIndex + 1} DE ${reviewSteps.length}`;

  return (
    <main className="plan-entry-screen" aria-labelledby="plan-entry-title" aria-busy={busy}>
      <div className="plan-entry-screen-shell">
        <FlowTopBar title={stage === 'success' ? 'Plan listo' : 'Crear plan con IA'} onExit={requestExit} />
        <div className="plan-entry-screen-heading">
          {screenEyebrow && <p className="eyebrow">{screenEyebrow}</p>}
          <h1 id="plan-entry-title" tabIndex={-1}>{screenTitle}</h1>
          <p id={stage === 'paste' ? 'plan-paste-form-description' : undefined}>{busy ? 'Estamos identificando tus días, comidas, cantidades y suplementos.' : stage === 'success' ? 'La IA convirtió tu menú en acciones diarias y guardamos tu revisión como una nueva versión.' : stage === 'paste' ? 'La IA creará un borrador editable para que lo revises antes de guardarlo.' : 'Avanza con calma. Puedes volver a cualquier paso antes de guardar.'}</p>
        </div>

        {stage === 'success' && draft ? (
          <PlanSaveSuccess draft={draft} onViewToday={onViewToday} />
        ) : stage === 'paste' && busy ? (
          <InterpretationLoading />
        ) : stage === 'paste' ? (
          <form
            className="plan-paste-form"
            aria-labelledby="plan-entry-title"
            aria-describedby={error ? 'plan-paste-form-description plan-paste-error' : 'plan-paste-form-description'}
            aria-busy={busy}
            onSubmit={parse}>
            <div className="plan-entry-body plan-paste-body">
              <div className="demo-menu-callout">
                <span className="demo-menu-icon"><Icon name="sparkles" size={17} /></span>
                <div>
                  <strong>Prueba la experiencia completa</strong>
                  <p>Carga un menú de demostración con dos variantes, cantidades y suplementos.</p>
                </div>
                <button
                  type="button"
                  className="secondary-button demo-menu-button"
                  disabled={demoMenuLoaded}
                  onClick={() => {
                    setRawText(DEMO_NUTRITION_MENU);
                    setError(null);
                  }}>
                  {demoMenuLoaded ? <Icon name="check" size={14} /> : <Icon name="plus" size={14} />}
                  {demoMenuLoaded ? 'Menú cargado' : 'Usar menú de demostración'}
                </button>
              </div>
              <div className="field">
                <label htmlFor="nutrition-plan-source">Menú completo <small>(obligatorio)</small></label>
                <textarea
                  id="nutrition-plan-source"
                  value={rawText}
                  onChange={event => setRawText(event.target.value)}
                  placeholder="Ej. Lunes — Desayuno: 2 huevos y 1 taza de avena…"
                  rows={13}
                  autoFocus
                  required
                  minLength={MIN_MENU_TEXT_LENGTH}
                  aria-required="true"
                  aria-invalid={menuTextIsTooShort || undefined}
                  aria-errormessage={menuTextIsTooShort ? 'nutrition-plan-source-length' : undefined}
                  aria-describedby="nutrition-plan-source-help nutrition-plan-source-length"
                />
                <small id="nutrition-plan-source-help" className="field-hint">Incluye días, horarios, alimentos y porciones; no incluyas datos personales.</small>
                <small id="nutrition-plan-source-length" className="field-hint" aria-live="polite">
                  {menuTextLength === 0
                    ? `Pega al menos ${MIN_MENU_TEXT_LENGTH} caracteres para continuar.`
                    : menuTextIsTooShort
                      ? `Faltan ${MIN_MENU_TEXT_LENGTH - menuTextLength} caracteres para continuar.`
                      : `${menuTextLength} caracteres`}
                </small>
              </div>
              {error && <p id="plan-paste-error" className="form-error" role="alert" aria-live="assertive" aria-atomic="true">{error}</p>}
            </div>
            <FlowActionBar className="plan-entry-actions plan-paste-actions">
              <button
                type="submit"
                className="primary-button plan-paste-submit"
                disabled={pasteSubmitDisabled}
                aria-disabled={pasteSubmitDisabled}
                aria-busy={busy}
                aria-describedby="nutrition-plan-source-length"
                aria-label={busy ? 'Analizando menú con IA' : 'Analizar menú con IA'}>
                <Icon name="sparkles" size={15} /> {busy ? 'Analizando menú…' : 'Analizar menú con IA'}
              </button>
            </FlowActionBar>
          </form>
        ) : draft ? (
          <form
            className="plan-review-form"
            onSubmit={event => {
              event.preventDefault();
              if (reviewStep === 'supplements') save();
              else goToNextStep();
            }}>
            <div className="plan-entry-stepper" role="tablist" aria-label="Pasos para revisar el plan">
              {reviewSteps.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  role="tab"
                  aria-selected={reviewStep === item.id}
                  aria-current={reviewStep === item.id ? 'step' : undefined}
                  aria-disabled={index > furthestUnlockedStep || undefined}
                  disabled={index > furthestUnlockedStep}
                  className={classNames('plan-step-button', reviewStep === item.id && 'selected', index < furthestUnlockedStep && 'completed')}
                  onClick={() => {
                    if (index > furthestUnlockedStep) return;
                    setReviewStep(item.id);
                    setError(null);
                    setSelectedDish(null);
                  }}>
                  <span>{index + 1}</span>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="plan-entry-body">
              <div className="plan-review-note">
                <Icon name="info" size={17} />
                <p>Este borrador no se guarda hasta que tú lo confirmes.</p>
                <button type="button" className="text-button" onClick={() => setSourceOpen(current => !current)}>
                  {sourceOpen ? 'Ocultar texto' : 'Ver texto original'}
                </button>
              </div>
              {sourceOpen && (
                <div className="plan-source-panel" role="region" aria-label="Texto original del menú">
                  <div className="plan-source-panel-heading">
                    <strong>Texto original</strong>
                    <button type="button" className="icon-button" aria-label="Ocultar texto original" onClick={() => setSourceOpen(false)}>
                      <Icon name="close" size={15} />
                    </button>
                  </div>
                  <pre>{rawText}</pre>
                </div>
              )}

              {reviewStep === 'schedule' && (
                <ScheduleStep
                  draft={draft}
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={value => { invalidateLaterSteps(); setStartDate(value); }}
                  onEndDateChange={value => { invalidateLaterSteps(); setEndDate(value); }}
                  onDayTypeChange={(index, update) => updateDraftState(current => current ? updateDayType(current, index, update) : current)}
                  onAddDayType={addDayType}
                  onRemoveDayType={removeDayType}
                />
              )}
              {reviewStep === 'meals' && selectedDayType && (
                <MealsStep
                  draft={draft}
                  selectedDayType={selectedDayType}
                  selectedDayTypeIndex={selectedDayTypeIndex}
                  selectedDish={selectedDish}
                  onSelectDayType={setSelectedDayTypeId}
                  onSlotChange={(slotIndex, update) => updateDraftState(current => current ? updateSlot(current, selectedDayTypeIndex, slotIndex, update) : current)}
                  onSlotRemove={slotIndex => {
                    updateDraftState(current => current ? updateDayType(current, selectedDayTypeIndex, dayType => ({ ...dayType, slots: dayType.slots.filter((_, index) => index !== slotIndex) })) : current);
                    setSelectedDish(null);
                  }}
                  onAddSlot={() => updateDraftState(current => current ? updateDayType(current, selectedDayTypeIndex, dayType => ({ ...dayType, slots: [...dayType.slots, emptySlot()] })) : current)}
                  onDishChange={(slotIndex, dishIndex, update) => updateDraftState(current => current ? updateDish(current, selectedDayTypeIndex, slotIndex, dishIndex, update) : current)}
                  onDishRemove={(slotIndex, dishIndex) => {
                    updateDraftState(current => current ? updateSlot(current, selectedDayTypeIndex, slotIndex, slot => ({ ...slot, dishes: slot.dishes.filter((_, index) => index !== dishIndex) })) : current);
                    setSelectedDish(null);
                  }}
                  onAddDish={slotIndex => updateDraftState(current => current ? updateSlot(current, selectedDayTypeIndex, slotIndex, slot => ({ ...slot, dishes: [...slot.dishes, emptyDish()] })) : current)}
                  onIngredientChange={(slotIndex, dishIndex, ingredientIndex, update) => updateDraftState(current => current ? updateIngredient(current, selectedDayTypeIndex, slotIndex, dishIndex, ingredientIndex, update) : current)}
                  onIngredientRemove={(slotIndex, dishIndex, ingredientIndex) => updateDraftState(current => current ? updateDish(current, selectedDayTypeIndex, slotIndex, dishIndex, dish => ({ ...dish, ingredients: dish.ingredients.filter((_, index) => index !== ingredientIndex) })) : current)}
                  onAddIngredient={(slotIndex, dishIndex) => updateDraftState(current => current ? updateDish(current, selectedDayTypeIndex, slotIndex, dishIndex, dish => ({ ...dish, ingredients: [...dish.ingredients, emptyIngredient()] })) : current)}
                  onSelectDish={setSelectedDish}
                  onCloseDish={() => setSelectedDish(null)}
                />
              )}
              {reviewStep === 'supplements' && (
                <SupplementsStep
                  draft={draft}
                  onSupplementChange={updateSupplement}
                  onAddSupplement={() => updateDraftState(current => current ? { ...current, supplements: [...current.supplements, emptySupplement()] } : current)}
                  onRemoveSupplement={index => updateDraftState(current => current ? { ...current, supplements: current.supplements.filter((_, itemIndex) => itemIndex !== index) } : current)}
                />
              )}
              {error && <p className="form-error" role="alert">{error}</p>}
            </div>
            <FlowActionBar className="plan-entry-actions">
              <button type="button" className="secondary-button" onClick={goBackOneStep}>
                {reviewStep === 'schedule' ? 'Cambiar texto' : 'Atrás'}
              </button>
              <button type="submit" className="primary-button">
                {reviewStep === 'supplements' ? 'Guardar nueva versión' : 'Continuar'}
                {reviewStep !== 'supplements' && <Icon name="arrow" size={15} />}
              </button>
            </FlowActionBar>
          </form>
        ) : null}
      </div>
      {confirmExit && (
        <ConfirmFlowExitDialog
          onContinue={() => setConfirmExit(false)}
          onDiscard={exitFlow}
        />
      )}
    </main>
  );
}

function PlanSaveSuccess({
  draft,
  onViewToday
}: {
  draft: PlanDraft;
  onViewToday: () => void;
}) {
  const metrics = [
    { value: draft.dayTypes.length, label: 'variantes' },
    { value: countSlots(draft), label: 'comidas' },
    { value: countDishes(draft), label: 'platillos' },
    { value: draft.supplements.length, label: 'suplementos' }
  ];

  return (
    <section className="plan-success" aria-labelledby="plan-success-heading">
      <div className="plan-success-card">
        <span className="plan-success-mark" aria-hidden="true">
          <Icon name="check" size={30} />
        </span>
        <div>
          <p className="eyebrow">NUEVA VERSIÓN CREADA</p>
          <h2 id="plan-success-heading">Tu menú ya trabaja para ti</h2>
          <p>
            Conservamos tus días, cantidades y suplementos en una versión
            editable. Tus versiones anteriores siguen intactas.
          </p>
        </div>
      </div>

      <div className="plan-success-metrics" aria-label="Resumen del plan creado">
        {metrics.map(metric => (
          <div key={metric.label}>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </div>
        ))}
      </div>

      <div className="plan-success-next">
        <span><Icon name="sparkles" size={18} /></span>
        <div>
          <strong>Todo listo para hoy</strong>
          <p>Consulta lo que te corresponde y marca cada comida conforme avances.</p>
        </div>
      </div>

      <button
        type="button"
        className="primary-button plan-success-action"
        onClick={onViewToday}>
        Ver mi plan de hoy <Icon name="arrow" size={16} />
      </button>
      <small className="plan-success-note">
        LevelUp organizó tu menú; no modificó las indicaciones de tu profesional.
      </small>
    </section>
  );
}

function InterpretationLoading() {
  const loadingSteps = [
    { title: 'Leyendo tu menú', detail: 'Buscando días y variantes' },
    { title: 'Ordenando tus comidas', detail: 'Juntando cada platillo en su horario' },
    { title: 'Preparando tu revisión', detail: 'Conservando cantidades y notas' }
  ];
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveStep(current => (current + 1) % loadingSteps.length);
    }, 1900);
    return () => window.clearInterval(timer);
  }, [loadingSteps.length]);

  return (
    <div className="plan-interpretation-loading" role="status" aria-live="polite" aria-atomic="true" aria-busy="true" aria-label="Creando un borrador editable del menú">
      <div className="plan-loading-orbit" aria-hidden="true">
        <span className="plan-loading-orbit-dot plan-loading-orbit-dot-one" />
        <span className="plan-loading-orbit-dot plan-loading-orbit-dot-two" />
        <span className="plan-loading-orbit-dot plan-loading-orbit-dot-three" />
        <span className="plan-loading-center"><Icon name="sparkles" size={27} /></span>
      </div>
      <p className="eyebrow">UN MOMENTO</p>
      <h2>{loadingSteps[activeStep].title}</h2>
      <p>{loadingSteps[activeStep].detail}. Enseguida podrás revisar todo con calma.</p>
      <div className="plan-loading-progress" aria-hidden="true"><span /></div>
      <div className="plan-loading-step-list">
        {loadingSteps.map((step, index) => (
          <div className={classNames('plan-loading-step', index === activeStep && 'active', index < activeStep && 'complete')} key={step.title}>
            <span>{index < activeStep ? <Icon name="check" size={12} /> : index + 1}</span>
            <strong>{step.title}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScheduleStep({
  draft,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onDayTypeChange,
  onAddDayType,
  onRemoveDayType
}: {
  draft: PlanDraft;
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onDayTypeChange: (index: number, update: (dayType: DayType) => DayType) => void;
  onAddDayType: () => void;
  onRemoveDayType: (index: number) => void;
}) {
  return (
    <div className="plan-step-content">
      <div className="plan-step-heading">
        <p className="eyebrow">PASO 1 · CALENDARIO</p>
        <h3>Primero, confirma cuándo aplica</h3>
        <p>Esto ayuda a mostrarte la variante correcta cada día.</p>
      </div>
      <div className="field-row plan-date-row">
        <div className="field">
          <label htmlFor="plan-start-date">Empieza</label>
          <input id="plan-start-date" type="date" value={startDate} onChange={event => onStartDateChange(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="plan-end-date">Termina <small>(opcional)</small></label>
          <input id="plan-end-date" type="date" value={endDate} min={startDate} onChange={event => onEndDateChange(event.target.value)} />
        </div>
      </div>
      <div className="plan-section-heading">
        <div>
          <p className="eyebrow">VARIANTES</p>
          <h4>¿Qué menú toca cada día?</h4>
        </div>
        <button type="button" className="text-button" onClick={onAddDayType}><Icon name="plus" size={14} /> Agregar variante</button>
      </div>
      <div className="plan-schedule-list">
        {draft.dayTypes.map((dayType, index) => (
          <section className="plan-schedule-card" key={dayType.id}>
            <div className="plan-card-heading">
              <div>
                <p className="eyebrow">VARIANTE {index + 1}</p>
                <strong>{dayType.slots.length} comidas detectadas</strong>
              </div>
              {draft.dayTypes.length > 1 && <button type="button" className="text-button danger-text" onClick={() => onRemoveDayType(index)}>Eliminar</button>}
            </div>
            <div className="field">
              <label htmlFor={`day-type-name-${index}`}>Nombre de la variante</label>
              <input id={`day-type-name-${index}`} value={dayType.name} placeholder="Ej. Lunes, miércoles, viernes y domingo" onChange={event => onDayTypeChange(index, current => ({ ...current, name: event.target.value }))} />
            </div>
            <div className="field">
              <label>Días que cubre</label>
              <div className="weekday-picker">
                {weekdayOptions.map(option => {
                  const selected = dayType.weekdays.includes(option.value);
                  return (
                    <button
                      type="button"
                      key={option.value}
                      className={classNames('weekday-button', selected && 'selected')}
                      aria-pressed={selected}
                      onClick={() => onDayTypeChange(index, current => ({ ...current, weekdays: selected ? current.weekdays.filter(day => day !== option.value) : [...current.weekdays, option.value] }))}>
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <details className="plan-collapsible">
              <summary>Notas de referencia <span>{dayType.references.length || 'Ninguna'}</span></summary>
              <div className="reference-list">
                {dayType.references.map((reference, referenceIndex) => (
                  <div className="reference-edit-row" key={`reference-${referenceIndex}`}>
                    <input aria-label={`Etiqueta de referencia ${referenceIndex + 1}`} placeholder="Momento" value={reference.label} onChange={event => onDayTypeChange(index, current => ({ ...current, references: current.references.map((item, itemIndex) => itemIndex === referenceIndex ? { ...item, label: event.target.value } : item) }))} />
                    <input aria-label={`Texto de referencia ${referenceIndex + 1}`} placeholder="Agua: 300 ml" value={reference.text} onChange={event => onDayTypeChange(index, current => ({ ...current, references: current.references.map((item, itemIndex) => itemIndex === referenceIndex ? { ...item, text: event.target.value } : item) }))} />
                    <button type="button" className="icon-button plan-remove-button" aria-label={`Eliminar referencia ${referenceIndex + 1}`} onClick={() => onDayTypeChange(index, current => ({ ...current, references: current.references.filter((_, itemIndex) => itemIndex !== referenceIndex) }))}><Icon name="trash" size={14} /></button>
                  </div>
                ))}
                <button type="button" className="text-button plan-add-inline" onClick={() => onDayTypeChange(index, current => ({ ...current, references: [...current.references, { label: '', text: '' } as PlanReference] }))}><Icon name="plus" size={13} /> Agregar nota</button>
              </div>
            </details>
          </section>
        ))}
      </div>
    </div>
  );
}

function MealsStep({
  draft,
  selectedDayType,
  selectedDayTypeIndex,
  selectedDish,
  onSelectDayType,
  onSlotChange,
  onSlotRemove,
  onAddSlot,
  onDishChange,
  onDishRemove,
  onAddDish,
  onIngredientChange,
  onIngredientRemove,
  onAddIngredient,
  onSelectDish,
  onCloseDish
}: {
  draft: PlanDraft;
  selectedDayType: DayType;
  selectedDayTypeIndex: number;
  selectedDish: DishSelection | null;
  onSelectDayType: (id: string) => void;
  onSlotChange: (slotIndex: number, update: (slot: PlanSlot) => PlanSlot) => void;
  onSlotRemove: (slotIndex: number) => void;
  onAddSlot: () => void;
  onDishChange: (slotIndex: number, dishIndex: number, update: (dish: PlanDish) => PlanDish) => void;
  onDishRemove: (slotIndex: number, dishIndex: number) => void;
  onAddDish: (slotIndex: number) => void;
  onIngredientChange: (slotIndex: number, dishIndex: number, ingredientIndex: number, update: (ingredient: PlanIngredient) => PlanIngredient) => void;
  onIngredientRemove: (slotIndex: number, dishIndex: number, ingredientIndex: number) => void;
  onAddIngredient: (slotIndex: number, dishIndex: number) => void;
  onSelectDish: (selection: DishSelection) => void;
  onCloseDish: () => void;
}) {
  return (
    <div className="plan-step-content">
      <div className="plan-step-heading plan-step-heading-row">
        <div>
          <p className="eyebrow">PASO 2 · COMIDAS</p>
          <h3>Revisa una variante a la vez</h3>
          <p>Confirma los nombres. Abre los detalles solo donde quieras corregir algo.</p>
        </div>
        <span className="plan-count-pill">{countSlots(draft)} comidas</span>
      </div>
      <div className="plan-day-type-selector" role="tablist" aria-label="Variantes del menú">
        {draft.dayTypes.map(dayType => (
          <button
            type="button"
            role="tab"
            key={dayType.id}
            aria-selected={dayType.id === selectedDayType.id}
            className={classNames('plan-day-type-option', dayType.id === selectedDayType.id && 'selected')}
            onClick={() => { onSelectDayType(dayType.id); onCloseDish(); }}>
            <strong>{dayType.name || 'Variante sin nombre'}</strong>
            <small>{weekdaysText(dayType)}</small>
          </button>
        ))}
      </div>
      <section className="plan-menu-panel">
        <div className="plan-menu-panel-heading">
          <div>
            <p className="eyebrow">MENÚ DE ESTA VARIANTE</p>
            <h4>{selectedDayType.name || 'Variante sin nombre'}</h4>
            <p>{weekdaysText(selectedDayType)}</p>
          </div>
          <button type="button" className="text-button" onClick={onAddSlot}><Icon name="plus" size={14} /> Comida</button>
        </div>
        {selectedDayType.references.length > 0 && (
          <div className="plan-reference-strip">
            <Icon name="info" size={14} />
            <span>{selectedDayType.references.map(reference => `${reference.label}: ${reference.text}`).join(' · ')}</span>
          </div>
        )}
        <div className="plan-slot-summary-list">
          {selectedDayType.slots.map((slot, slotIndex) => (
            <section className="plan-slot-summary-card" key={slot.id}>
              <div className="plan-slot-heading">
                <input
                  aria-label={`Nombre de la comida ${slotIndex + 1}`}
                  value={slot.name}
                  placeholder="Ej. Desayuno"
                  onChange={event => onSlotChange(slotIndex, current => ({ ...current, name: event.target.value }))}
                />
                {selectedDayType.slots.length > 1 && <button type="button" className="text-button danger-text" onClick={() => onSlotRemove(slotIndex)}>Eliminar</button>}
              </div>
              <div className="plan-dish-summary-list">
                {slot.dishes.map((dish, dishIndex) => {
                  const isSelected = selectedDish?.dayTypeIndex === selectedDayTypeIndex
                    && selectedDish.slotIndex === slotIndex
                    && selectedDish.dishIndex === dishIndex;
                  const unquantified = dish.ingredients.filter(ingredient => ingredient.grams === null).length;
                  return (
                    <div className={classNames('plan-dish-summary', isSelected && 'selected')} key={`${slot.id}-dish-${dishIndex}`}>
                      <button
                        type="button"
                        className="plan-dish-summary-button"
                        aria-expanded={isSelected}
                        onClick={() => isSelected ? onCloseDish() : onSelectDish({ dayTypeIndex: selectedDayTypeIndex, slotIndex, dishIndex })}>
                        <span className="plan-dish-summary-copy">
                          <strong>{dish.name || 'Platillo sin nombre'}</strong>
                          <small>{dish.ingredients.length === 0 ? 'Sin ingredientes detectados' : `${dish.ingredients.length} ingredientes${unquantified > 0 ? ` · ${unquantified} sin equivalente para compras` : ''}`}</small>
                          <span>{ingredientSummary(dish)}</span>
                        </span>
                        <span className="plan-dish-summary-action">{isSelected ? 'Cerrar' : 'Editar'} <Icon name={isSelected ? 'close' : 'edit'} size={14} /></span>
                      </button>
                      {isSelected && (
                        <DishDetailEditor
                          dish={dish}
                          index={dishIndex}
                          idPrefix={`${selectedDayType.id}-${slot.id}-${dishIndex}`}
                          onChange={update => onDishChange(slotIndex, dishIndex, update)}
                          onRemove={() => onDishRemove(slotIndex, dishIndex)}
                          onIngredientChange={(ingredientIndex, update) => onIngredientChange(slotIndex, dishIndex, ingredientIndex, update)}
                          onIngredientRemove={ingredientIndex => onIngredientRemove(slotIndex, dishIndex, ingredientIndex)}
                          onAddIngredient={() => onAddIngredient(slotIndex, dishIndex)}
                          onClose={onCloseDish}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              {slot.dishes.length === 0 && <p className="field-hint">Agrega el primer platillo de esta comida.</p>}
              <button type="button" className="text-button plan-add-inline" onClick={() => onAddDish(slotIndex)}><Icon name="plus" size={13} /> Agregar platillo</button>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}

function DishDetailEditor({
  dish,
  index,
  idPrefix,
  onChange,
  onRemove,
  onIngredientChange,
  onIngredientRemove,
  onAddIngredient,
  onClose
}: {
  dish: PlanDish;
  index: number;
  idPrefix: string;
  onChange: (update: (dish: PlanDish) => PlanDish) => void;
  onRemove: () => void;
  onIngredientChange: (ingredientIndex: number, update: (ingredient: PlanIngredient) => PlanIngredient) => void;
  onIngredientRemove: (ingredientIndex: number) => void;
  onAddIngredient: () => void;
  onClose: () => void;
}) {
  return (
    <div className="plan-dish-detail">
      <div className="plan-dish-detail-heading">
        <div>
          <p className="eyebrow">DETALLES DEL PLATILLO {index + 1}</p>
          <strong>Corrige solo lo que haga falta</strong>
        </div>
        <button type="button" className="icon-button" aria-label="Cerrar detalles del platillo" onClick={onClose}><Icon name="close" size={16} /></button>
      </div>
      <div className="field">
        <label htmlFor={`dish-name-${idPrefix}`}>Nombre del platillo</label>
        <input id={`dish-name-${idPrefix}`} value={dish.name} placeholder="Nombre del platillo" onChange={event => onChange(current => ({ ...current, name: event.target.value }))} />
      </div>
      <details className="plan-collapsible plan-tags-details">
        <summary>Etiquetas opcionales <span>{dish.tags.length || 'Ninguna'}</span></summary>
        <div className="tag-picker-groups plan-tag-picker">
          {MEAL_TAG_GROUPS.map(group => (
            <div className="tag-picker-group" key={group.label}>
              <span>{group.label}</span>
              <div className="tag-picker">
                {group.tags.map(tag => {
                  const selected = dish.tags.includes(tag);
                  return <button type="button" key={tag} className={classNames('tag-option', selected && 'selected')} onClick={() => onChange(current => ({ ...current, tags: selected ? current.tags.filter(item => item !== tag) : [...current.tags, tag] }))}>{getMealTagLabel(tag)}</button>;
                })}
              </div>
            </div>
          ))}
        </div>
      </details>
      <div className="plan-ingredient-detail-list">
        <div className="plan-detail-label">
          <div>
            <span className="field-label">Ingredientes</span>
            <small>Conservamos la cantidad original del menú.</small>
          </div>
          <span className="field-label">{dish.ingredients.length}</span>
        </div>
        {dish.ingredients.map((ingredient, ingredientIndex) => (
          <div className="plan-ingredient-detail" key={`${index}-ingredient-${ingredientIndex}`}>
            <input aria-label={`Ingrediente ${ingredientIndex + 1}`} placeholder="Ingrediente" value={ingredient.name} onChange={event => onIngredientChange(ingredientIndex, current => ({ ...current, name: event.target.value }))} />
            <div className="plan-ingredient-fields">
              <div className="field">
                <label htmlFor={`quantity-${idPrefix}-${ingredientIndex}`}>Cantidad original</label>
                <input id={`quantity-${idPrefix}-${ingredientIndex}`} aria-label={`Cantidad original del ingrediente ${ingredientIndex + 1}`} placeholder="Ej. 1 taza" value={ingredient.quantityText} onChange={event => onIngredientChange(ingredientIndex, current => ({ ...current, quantityText: event.target.value }))} />
              </div>
              <div className="field">
                <label htmlFor={`equivalent-${idPrefix}-${ingredientIndex}`}>Para compras <small>(opcional)</small></label>
                <div className="plan-equivalent-fields">
                  <input id={`equivalent-${idPrefix}-${ingredientIndex}`} aria-label={`Equivalente numérico del ingrediente ${ingredientIndex + 1}`} type="number" min="0" step="any" placeholder="—" value={ingredient.grams ?? ''} onChange={event => onIngredientChange(ingredientIndex, current => { const grams = numberOrNull(event.target.value); return { ...current, grams, unit: grams === null ? null : current.unit }; })} />
                  <select aria-label={`Unidad del ingrediente ${ingredientIndex + 1}`} value={ingredient.unit ?? ''} disabled={ingredient.grams === null} onChange={event => onIngredientChange(ingredientIndex, current => ({ ...current, unit: event.target.value === '' ? null : event.target.value as PlanIngredient['unit'] }))}>
                    <option value="">—</option><option value="g">g</option><option value="ml">ml</option>
                  </select>
                </div>
              </div>
              <button type="button" className="icon-button plan-remove-button" aria-label={`Eliminar ingrediente ${ingredientIndex + 1}`} onClick={() => onIngredientRemove(ingredientIndex)}><Icon name="trash" size={14} /></button>
            </div>
            {ingredient.grams === null && <small className="ingredient-warning"><Icon name="info" size={12} /> Se conserva para tu menú, pero no se suma a la lista de compras.</small>}
          </div>
        ))}
        <button type="button" className="text-button plan-add-inline" onClick={onAddIngredient}><Icon name="plus" size={13} /> Agregar ingrediente</button>
      </div>
      <button type="button" className="text-button danger-text plan-detail-delete" onClick={onRemove}><Icon name="trash" size={13} /> Eliminar platillo</button>
    </div>
  );
}

function SupplementsStep({
  draft,
  onSupplementChange,
  onAddSupplement,
  onRemoveSupplement
}: {
  draft: PlanDraft;
  onSupplementChange: (index: number, update: (supplement: PlanSupplement) => PlanSupplement) => void;
  onAddSupplement: () => void;
  onRemoveSupplement: (index: number) => void;
}) {
  const unquantified = countUnquantifiedIngredients(draft);
  return (
    <div className="plan-step-content">
      <div className="plan-step-heading">
        <p className="eyebrow">PASO 3 · SUPLEMENTOS</p>
        <h3>Una última revisión y listo</h3>
        <p>Estos se mostrarán como recordatorios diarios separados.</p>
      </div>
      <div className="plan-supplement-section">
        <div className="plan-section-heading">
          <div>
            <p className="eyebrow">TODOS LOS DÍAS</p>
            <h4>Suplementos</h4>
          </div>
          <button type="button" className="text-button" onClick={onAddSupplement}><Icon name="plus" size={14} /> Agregar</button>
        </div>
        <div className="plan-supplement-list">
          {draft.supplements.map((supplement, index) => (
            <div className="plan-supplement-card" key={`supplement-${index}`}>
              <div className="plan-supplement-number">{index + 1}</div>
              <div className="plan-supplement-fields">
                <div className="field">
                  <label htmlFor={`supplement-name-${index}`}>Nombre</label>
                  <input id={`supplement-name-${index}`} aria-label={`Nombre del suplemento ${index + 1}`} placeholder="Ej. Omega 3" value={supplement.name} onChange={event => onSupplementChange(index, current => ({ ...current, name: event.target.value }))} />
                </div>
                <div className="field">
                  <label htmlFor={`supplement-dose-${index}`}>Dosis e indicación</label>
                  <input id={`supplement-dose-${index}`} aria-label={`Dosis del suplemento ${index + 1}`} placeholder="Ej. 1 cápsula por día" value={supplement.doseText} onChange={event => onSupplementChange(index, current => ({ ...current, doseText: event.target.value }))} />
                </div>
              </div>
              <button type="button" className="icon-button plan-remove-button" aria-label={`Eliminar suplemento ${index + 1}`} onClick={() => onRemoveSupplement(index)}><Icon name="trash" size={15} /></button>
            </div>
          ))}
          {draft.supplements.length === 0 && <p className="field-hint">No se detectaron suplementos. Puedes continuar.</p>}
        </div>
      </div>
      <div className="plan-save-summary">
        <div className="plan-save-summary-icon"><Icon name="check" size={18} /></div>
        <div>
          <strong>Tu borrador está casi listo</strong>
          <p>{draft.dayTypes.length} variantes · {countSlots(draft)} comidas · {countDishes(draft)} platillos · {draft.supplements.length} suplementos</p>
          {unquantified > 0 && <small>{unquantified} ingrediente{unquantified === 1 ? '' : 's'} quedará{unquantified === 1 ? '' : 'n'} sin sumar en la lista de compras.</small>}
        </div>
      </div>
    </div>
  );
}
