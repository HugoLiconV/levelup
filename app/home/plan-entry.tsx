'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Icon } from '../components/Icons';
import {
  createId,
  getToday,
  MEAL_TAGS,
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

type PlanToSave = Omit<Plan, 'id'>;
type ReviewStep = 'schedule' | 'meals' | 'supplements';
type DishSelection = {
  dayTypeIndex: number;
  slotIndex: number;
  dishIndex: number;
};

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
  onSave
}: {
  onClose: () => void;
  onSave: (plan: PlanToSave) => void;
}) {
  const [stage, setStage] = useState<'paste' | 'review'>('paste');
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

  const parse = async (event: FormEvent) => {
    event.preventDefault();
    if (rawText.trim().length < 20) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/nutrition-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText.trim() })
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
      setStage('review');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No pudimos interpretar el menú');
    } finally {
      setBusy(false);
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
    if (reviewStep === 'meals') {
      setSelectedDish(null);
      setReviewStep('supplements');
    }
  };

  const save = () => {
    if (!draft) return;
    const validationError = draftValidationError(draft, startDate, endDate);
    if (validationError) {
      setError(validationError);
      return;
    }
    onSave({
      startDate,
      endDate: endDate || null,
      dayTypes: draft.dayTypes,
      supplements: draft.supplements
    });
  };

  const selectedDayTypeIndex = draft
    ? Math.max(0, draft.dayTypes.findIndex(dayType => dayType.id === selectedDayTypeId))
    : 0;
  const selectedDayType = draft?.dayTypes[selectedDayTypeIndex] ?? null;

  const addDayType = () => {
    const dayType = emptyDayType();
    setDraft(current => current ? { ...current, dayTypes: [...current.dayTypes, dayType] } : current);
    setSelectedDayTypeId(dayType.id);
  };

  const removeDayType = (dayTypeIndex: number) => {
    setDraft(current => current ? {
      ...current,
      dayTypes: current.dayTypes.filter((_, index) => index !== dayTypeIndex)
    } : current);
    setSelectedDish(null);
  };

  const updateSupplement = (index: number, update: (supplement: PlanSupplement) => PlanSupplement) => {
    setDraft(current => current ? {
      ...current,
      supplements: current.supplements.map((supplement, supplementIndex) =>
        supplementIndex === index ? update(supplement) : supplement
      )
    } : current);
  };

  const stepIndex = reviewSteps.findIndex(item => item.id === reviewStep);
  const stepMeta = reviewSteps[stepIndex] ?? reviewSteps[0];
  const screenTitle = busy
    ? 'Estamos ordenando tu menú'
    : stage === 'paste'
      ? 'Agregar menú'
      : stepMeta.title;
  const screenEyebrow = busy
    ? 'UN MOMENTO'
    : stage === 'paste'
      ? 'PÉGALO Y LO ORDENAMOS'
      : `REVISIÓN GUIADA · ${stepIndex + 1} DE ${reviewSteps.length}`;

  return (
    <main className="plan-entry-screen" aria-labelledby="plan-entry-title">
      <div className="plan-entry-screen-shell">
        <header className="plan-entry-screen-header">
          <button
            type="button"
            className="plan-back-button"
            aria-label="Volver a Comida"
            onClick={onClose}>
            <Icon name="arrow" size={18} className="plan-back-icon" />
            <span>Volver</span>
          </button>
          <strong className="plan-entry-topbar-title">Agregar menú</strong>
          <span className="plan-entry-topbar-spacer" aria-hidden="true" />
        </header>
        <div className="plan-entry-screen-heading">
          <p className="eyebrow">{screenEyebrow}</p>
          <h1 id="plan-entry-title">{screenTitle}</h1>
          <p>{busy ? 'Estamos identificando tus días, comidas, cantidades y suplementos.' : stage === 'paste' ? 'La IA prepara un borrador y tú decides qué se guarda.' : 'Avanza con calma. Puedes volver a cualquier paso antes de guardar.'}</p>
        </div>

        {stage === 'paste' && busy ? (
          <InterpretationLoading />
        ) : stage === 'paste' ? (
          <form className="plan-paste-form" onSubmit={parse}>
            <div className="plan-entry-body plan-paste-body">
              <div className="plan-entry-welcome">
                <span className="plan-entry-welcome-icon"><Icon name="sparkles" size={20} /></span>
                <div>
                  <h3>Pega tu menú y lo ordenamos contigo</h3>
                  <p>La IA prepara un borrador. Tú revisas lo importante antes de guardar cualquier cosa.</p>
                </div>
              </div>
              <div className="field">
                <label htmlFor="nutrition-plan-source">Menú completo</label>
                <textarea
                  id="nutrition-plan-source"
                  value={rawText}
                  onChange={event => setRawText(event.target.value)}
                  placeholder="Pega aquí el texto tal como te lo entregó tu nutriólogo…"
                  rows={13}
                  autoFocus
                />
                <small className="field-hint">No incluyas datos personales que no formen parte del menú.</small>
                {rawText.trim().length > 0 && rawText.trim().length < 20 && (
                  <small className="field-hint">Pega al menos 20 caracteres para obtener un borrador útil.</small>
                )}
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
            </div>
            <div className="modal-actions plan-entry-actions">
              <button type="button" className="secondary-button" onClick={onClose}>Cancelar</button>
              <button type="submit" className="primary-button" disabled={rawText.trim().length < 20}>
                <Icon name="sparkles" size={15} /> Interpretar menú
              </button>
            </div>
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
                  className={classNames('plan-step-button', reviewStep === item.id && 'selected', index < stepIndex && 'completed')}
                  onClick={() => { setReviewStep(item.id); setError(null); setSelectedDish(null); }}>
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
                  onStartDateChange={setStartDate}
                  onEndDateChange={setEndDate}
                  onDayTypeChange={(index, update) => setDraft(current => current ? updateDayType(current, index, update) : current)}
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
                  onSlotChange={(slotIndex, update) => setDraft(current => current ? updateSlot(current, selectedDayTypeIndex, slotIndex, update) : current)}
                  onSlotRemove={slotIndex => {
                    setDraft(current => current ? updateDayType(current, selectedDayTypeIndex, dayType => ({ ...dayType, slots: dayType.slots.filter((_, index) => index !== slotIndex) })) : current);
                    setSelectedDish(null);
                  }}
                  onAddSlot={() => setDraft(current => current ? updateDayType(current, selectedDayTypeIndex, dayType => ({ ...dayType, slots: [...dayType.slots, emptySlot()] })) : current)}
                  onDishChange={(slotIndex, dishIndex, update) => setDraft(current => current ? updateDish(current, selectedDayTypeIndex, slotIndex, dishIndex, update) : current)}
                  onDishRemove={(slotIndex, dishIndex) => {
                    setDraft(current => current ? updateSlot(current, selectedDayTypeIndex, slotIndex, slot => ({ ...slot, dishes: slot.dishes.filter((_, index) => index !== dishIndex) })) : current);
                    setSelectedDish(null);
                  }}
                  onAddDish={slotIndex => setDraft(current => current ? updateSlot(current, selectedDayTypeIndex, slotIndex, slot => ({ ...slot, dishes: [...slot.dishes, emptyDish()] })) : current)}
                  onIngredientChange={(slotIndex, dishIndex, ingredientIndex, update) => setDraft(current => current ? updateIngredient(current, selectedDayTypeIndex, slotIndex, dishIndex, ingredientIndex, update) : current)}
                  onIngredientRemove={(slotIndex, dishIndex, ingredientIndex) => setDraft(current => current ? updateDish(current, selectedDayTypeIndex, slotIndex, dishIndex, dish => ({ ...dish, ingredients: dish.ingredients.filter((_, index) => index !== ingredientIndex) })) : current)}
                  onAddIngredient={(slotIndex, dishIndex) => setDraft(current => current ? updateDish(current, selectedDayTypeIndex, slotIndex, dishIndex, dish => ({ ...dish, ingredients: [...dish.ingredients, emptyIngredient()] })) : current)}
                  onSelectDish={setSelectedDish}
                  onCloseDish={() => setSelectedDish(null)}
                />
              )}
              {reviewStep === 'supplements' && (
                <SupplementsStep
                  draft={draft}
                  onSupplementChange={updateSupplement}
                  onAddSupplement={() => setDraft(current => current ? { ...current, supplements: [...current.supplements, emptySupplement()] } : current)}
                  onRemoveSupplement={index => setDraft(current => current ? { ...current, supplements: current.supplements.filter((_, itemIndex) => itemIndex !== index) } : current)}
                />
              )}
              {error && <p className="form-error" role="alert">{error}</p>}
            </div>
            <div className="modal-actions plan-entry-actions">
              <button type="button" className="secondary-button" onClick={reviewStep === 'schedule' ? changeSource : () => { setError(null); setSelectedDish(null); setReviewStep(reviewSteps[stepIndex - 1]?.id ?? 'schedule'); }}>
                {reviewStep === 'schedule' ? 'Cambiar texto' : 'Atrás'}
              </button>
              <button type="submit" className="primary-button">
                {reviewStep === 'supplements' ? 'Guardar nueva versión' : 'Continuar'}
                {reviewStep !== 'supplements' && <Icon name="arrow" size={15} />}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </main>
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
    <div className="plan-interpretation-loading" role="status" aria-live="polite">
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
        <div className="tag-picker plan-tag-picker">
          {MEAL_TAGS.map(tag => {
            const selected = dish.tags.includes(tag);
            return <button type="button" key={tag} className={classNames('tag-option', selected && 'selected')} onClick={() => onChange(current => ({ ...current, tags: selected ? current.tags.filter(item => item !== tag) : [...current.tags, tag] }))}>{tag}</button>;
          })}
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
