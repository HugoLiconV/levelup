'use client';

import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../components/Icons';
import {
  addDays,
  daysBetween,
  formatShortDate,
  formatWeekday,
  type MealPrepPlan,
  type MealPrepPreferences,
  type Plan,
  type PrepTaskCompletion,
} from '../../lib/levelup';
import {
  createDeterministicMealPrepDraft,
  getNextOpenSelectionDates,
  MEAL_PREP_GENERATOR_VERSION,
  materializeMealPrepPlan,
  resolveMealPrepWeek,
  validateMealPrepDraft,
  type MealPrepDraftContent,
} from '../../lib/meal-prep';
import { classNames } from '../shared';

type SetupStep = 'coverage' | 'constraints' | 'review';

const EQUIPMENT = ['estufa', 'horno', 'microondas', 'licuadora', 'air-fryer'];
const EQUIPMENT_LABELS: Record<string, string> = {
  estufa: 'Estufa',
  horno: 'Horno',
  microondas: 'Microondas',
  licuadora: 'Licuadora',
  'air-fryer': 'Freidora de aire',
};
const STYLE_OPTIONS: Array<{ value: MealPrepPreferences['style']; title: string; description: string }> = [
  { value: 'balanced', title: 'Equilibrado', description: 'Adelanta lo que se conserva bien y termina lo fresco al momento.' },
  { value: 'maximum_ready', title: 'Máximo listo', description: 'Prioriza porciones terminadas usando congelador o segunda sesión.' },
  { value: 'minimum_time', title: 'Sesión corta', description: 'Organiza componentes y deja más trabajo para el día.' },
];

function normalizedSlotName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX').trim();
}

function isMainMealSlot(name: string): boolean {
  return /^(desayuno|comida|almuerzo|cena)(?:\s|$)/.test(normalizedSlotName(name));
}

function recommendedSelection(occurrences: ReturnType<typeof resolveMealPrepWeek>['occurrences']): string[] {
  const mainMeals = occurrences.filter(item => isMainMealSlot(item.slot.name));
  if (mainMeals.length > 0) return mainMeals.map(item => item.id);

  // Plans with custom slot names still get a small, useful starting point:
  // one meal per day, with the rest available through the day sections.
  const seenDates = new Set<string>();
  return occurrences.filter(item => {
    if (seenDates.has(item.date)) return false;
    seenDates.add(item.date);
    return true;
  }).map(item => item.id);
}

function taskKindLabel(kind: string): string {
  return {
    wash: 'Lavar',
    cut: 'Cortar',
    cook: 'Cocinar',
    cool: 'Enfriar',
    portion: 'Porcionar',
    label: 'Etiquetar',
    store: 'Guardar',
    clean: 'Limpiar',
  }[kind] ?? kind;
}

function assumptionNeedsAcknowledgement(text: string, provenance: string): boolean {
  return provenance === 'safety_rule' || /refriger|congel|guardar|segur|conservar|consum|crudo|higien|caduc/i.test(text);
}

function defaultPreferences(weekStart: string): MealPrepPreferences {
  return {
    style: 'balanced',
    freezerAvailable: true,
    equipment: ['estufa', 'microondas', 'licuadora'],
    sessions: [
      { scheduledFor: `${addDays(weekStart, -1)}T17:00:00`, maxMinutes: 100 },
      { scheduledFor: `${addDays(weekStart, 2)}T19:00:00`, maxMinutes: 45 },
    ],
  };
}

function preferencesForWeek(
  preferences: MealPrepPreferences,
  sourceWeekStart: string,
  weekStart: string
): MealPrepPreferences {
  return {
    ...preferences,
    equipment: [...preferences.equipment],
    sessions: preferences.sessions.map(session => ({
      ...session,
      scheduledFor: `${addDays(
        weekStart,
        daysBetween(sourceWeekStart, session.scheduledFor.slice(0, 10))
      )}${session.scheduledFor.slice(10)}`,
    })),
  };
}

export function MealPrepView({
  plans,
  weekStart,
  savedPlan,
  savedPlans,
  completions,
  onPlanEntry,
  onSave,
  onToggleTask,
  onKitchenModeChange,
}: {
  plans: Plan[];
  weekStart: string;
  savedPlan: MealPrepPlan | null;
  savedPlans: MealPrepPlan[];
  completions: PrepTaskCompletion[];
  onPlanEntry: () => void;
  onSave: (plan: MealPrepPlan) => void;
  onToggleTask: (mealPrepPlanId: string, prepTaskId: string) => void;
  onKitchenModeChange?: (active: boolean) => void;
}) {
  const week = useMemo(() => resolveMealPrepWeek(plans, weekStart), [plans, weekStart]);
  const [step, setStep] = useState<SetupStep>('coverage');
  const [editing, setEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => recommendedSelection(week.occurrences));
  const rememberedPlan = useMemo(() => {
    if (savedPlan) return savedPlan;
    return [...savedPlans]
      .filter(plan => plan.acceptedAt && plan.status !== 'superseded')
      .sort((left, right) => (right.acceptedAt ?? right.generatedAt).localeCompare(left.acceptedAt ?? left.generatedAt))[0] ?? null;
  }, [savedPlan, savedPlans]);
  const preferenceSource = rememberedPlan ? 'tus preferencias guardadas' : 'una configuración equilibrada';
  const [preferences, setPreferences] = useState<MealPrepPreferences>(() => rememberedPlan
    ? preferencesForWeek(rememberedPlan.preferences, rememberedPlan.weekStart, weekStart)
    : defaultPreferences(weekStart));
  const [draft, setDraft] = useState<MealPrepDraftContent | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationMode, setGenerationMode] = useState<'ai' | 'safe_baseline' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kitchenSessionId, setKitchenSessionId] = useState<string | null>(null);
  const selectionDates = useMemo(() => Array.from(new Set(week.occurrences.map(item => item.date))), [week.occurrences]);
  const [openSelectionDates, setOpenSelectionDates] = useState<string[]>(() => selectionDates.slice(0, 1));

  useEffect(() => {
    onKitchenModeChange?.(Boolean(kitchenSessionId));
    return () => onKitchenModeChange?.(false);
  }, [kitchenSessionId, onKitchenModeChange]);

  if (week.occurrences.length === 0) {
    return (
      <section className="prep-empty">
        <span><Icon name="utensils" size={25} /></span>
        <p className="eyebrow">PREPARACIÓN SEMANAL</p>
        <h2>Primero necesitas un Plan activo</h2>
        <p>La preparación organiza el Plan que ya recibiste; no genera ni cambia tu dieta.</p>
        <button className="primary-button" onClick={onPlanEntry}><Icon name="plus" size={16} /> Agregar Plan</button>
      </section>
    );
  }

  if (savedPlan && !editing) {
    const session = savedPlan.sessions.find(item => item.id === kitchenSessionId);
    return session ? (
      <KitchenMode plan={savedPlan} sessionId={session.id} completions={completions} onToggle={onToggleTask} onClose={() => setKitchenSessionId(null)} />
    ) : (
      <PreparedWeek plan={savedPlan} completions={completions} updateAvailable={savedPlan.generatorVersion !== MEAL_PREP_GENERATOR_VERSION} onStart={setKitchenSessionId} onAdjust={() => { setPreferences(preferencesForWeek(savedPlan.preferences, savedPlan.weekStart, weekStart)); setEditing(true); setStep('coverage'); setDraft(null); setError(null); setGenerationMode(null); setSelectedIds(savedPlan.selectedOccurrenceIds); }} />
    );
  }

  const toggleOccurrence = (id: string) => setSelectedIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  const selectAllForDate = (date: string) => {
    const dayIds = week.occurrences.filter(item => item.date === date).map(item => item.id);
    setSelectedIds(current => Array.from(new Set([...current, ...dayIds])));
  };
  const selectMainMeals = () => setSelectedIds(week.occurrences.filter(item => isMainMealSlot(item.slot.name)).map(item => item.id));
  const currentStep = step === 'coverage' ? 1 : step === 'constraints' ? 2 : 3;
  const generate = async () => {
    setGenerating(true);
    setError(null);
    let generated: MealPrepDraftContent | null = null;
    try {
      if (!navigator.onLine) throw new Error('Necesitas conexión para generar un borrador nuevo. La ejecución guardada funciona sin conexión.');
      const response = await fetch('/api/meal-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week, selectedOccurrenceIds: selectedIds, preferences }),
      });
      const payload = await response.json() as { draft?: MealPrepDraftContent; mode?: 'ai' | 'safe_baseline'; error?: string };
      if (!response.ok || !payload.draft) throw new Error(payload.error ?? 'No pudimos generar el borrador');
      generated = payload.draft;
      setGenerationMode(payload.mode ?? 'ai');
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'No pudimos generar el borrador';
      if (!navigator.onLine) {
        setError(message);
        setGenerating(false);
        return;
      }
      generated = createDeterministicMealPrepDraft(week, selectedIds, preferences);
      setGenerationMode('safe_baseline');
      setError('Usamos un borrador conservador porque la asistencia de IA no estuvo disponible. Revísalo antes de guardarlo.');
    }
    const errors = generated ? validateMealPrepDraft(week, selectedIds, preferences, generated) : ['No se generó un borrador.'];
    if (errors.length) {
      setError(errors.slice(0, 3).join(' '));
    } else {
      setDraft(generated);
      setStep('review');
    }
    setGenerating(false);
  };

  return (
    <div className={classNames('meal-prep-flow', step === 'coverage' && 'meal-prep-flow-selection')}>
      <header className="prep-flow-head">
        <div>
          <p className="eyebrow">PREPARACIÓN DE ESTA SEMANA</p>
          <h2>{step === 'coverage' ? '¿Qué quieres adelantar?' : step === 'constraints' ? 'Personaliza tu preparación' : 'Tu plan recomendado'}</h2>
        </div>
        <span>≈ 1 minuto</span>
      </header>

      <nav className="prep-progress-steps" aria-label="Progreso de la preparación">
        {['Seleccionar', 'Recomendación', 'Confirmar'].map((label, index) => {
          const stepNumber = index + 1;
          return <span key={label} className={classNames(stepNumber === currentStep && 'current', stepNumber < currentStep && 'complete')}><b>{stepNumber}</b>{label}</span>;
        })}
      </nav>

      {step === 'coverage' && (
        <>
          <p className="prep-intro">Selecciona solo lo que quieres adelantar. Esto no cambia tu Plan ni marca comidas como omitidas. Empezamos con tus comidas principales; puedes ajustar cualquier día.</p>
          <div className="prep-selection-shortcuts" aria-label="Atajos de selección">
            <button type="button" onClick={() => setSelectedIds(week.occurrences.map(item => item.id))}>Todo el día</button>
            <button type="button" onClick={selectMainMeals}>Solo comidas principales</button>
            <button type="button" onClick={() => setSelectedIds([])}>Limpiar selección</button>
          </div>
          <div className="prep-week-map">
            {selectionDates.map(date => {
              const dayOccurrences = week.occurrences.filter(item => item.date === date);
              const selectedForDay = dayOccurrences.filter(item => selectedIds.includes(item.id)).length;
              const isOpen = openSelectionDates.includes(date);
              return <details key={date} className={classNames('prep-day-card', isOpen && 'open')} open={isOpen} onToggle={event => {
                const nextIsOpen = event.currentTarget.open;
                setOpenSelectionDates(current => getNextOpenSelectionDates(current, date, nextIsOpen));
              }}>
                <summary><span><strong>{formatWeekday(date)}</strong><small>{formatShortDate(date)} · {selectedForDay}/{dayOccurrences.length} seleccionadas</small></span><Icon name="chevron" size={17} className="prep-day-chevron" /></summary>
                <div className="prep-day-controls"><button type="button" onClick={() => selectAllForDate(date)}>Todo el día</button><span>{selectedForDay} de {dayOccurrences.length}</span></div>
                {dayOccurrences.map(item => (
                  <label key={item.id} className={classNames('prep-slot-choice', selectedIds.includes(item.id) && 'selected')}>
                    <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleOccurrence(item.id)} />
                    <span><strong>{item.slot.name}</strong><small>{item.slot.dishes.map(dish => dish.name).join(' · ')}</small></span>
                  </label>
                ))}
              </details>;
            })}
          </div>
          <div className="prep-sticky-action" role="region" aria-label="Resumen de selección">
            <div className="prep-selection-summary">
              <span className="prep-selection-kicker">Tu selección</span>
              <span><strong>{selectedIds.length}</strong> de {week.occurrences.length} comidas</span>
            </div>
            <div className="prep-selection-next">
              <span className="prep-selection-time"><Icon name="clock" size={13} /> ≈ 1 min</span>
              <button className="primary-button" disabled={selectedIds.length === 0 || generating} onClick={generate}>
                {generating ? 'Generando…' : 'Continuar'} <Icon name="arrow" size={15} />
              </button>
            </div>
          </div>
        </>
      )}

      {step === 'constraints' && (
        <>
          <p className="prep-intro">Tu plan recomendado ya está listo. Cambia estos datos solo si quieres adaptar horarios, equipo o nivel de adelanto.</p>
          <section className="prep-config-card">
            <p className="eyebrow">SESIONES</p>
            <h3>{preferences.sessions.map(session => new Intl.DateTimeFormat('es-MX', { weekday: 'long' }).format(new Date(session.scheduledFor))).join(' + ')}</h3>
            <p>La opción recomendada para repartir trabajo y conservar mejor los alimentos.</p>
            <div className="prep-session-inputs">
              {preferences.sessions.map((session, index) => (
                <label key={index}><span>{index === 0 ? 'Sesión principal' : 'Sesión corta'}</span><input type="datetime-local" value={session.scheduledFor.slice(0, 16)} onChange={event => setPreferences(current => ({ ...current, sessions: current.sessions.map((item, itemIndex) => itemIndex === index ? { ...item, scheduledFor: `${event.target.value}:00` } : item) }))} /><small>Máximo <input type="number" min="20" max="180" value={session.maxMinutes} onChange={event => setPreferences(current => ({ ...current, sessions: current.sessions.map((item, itemIndex) => itemIndex === index ? { ...item, maxMinutes: Number(event.target.value) } : item) }))} /> min</small></label>
              ))}
            </div>
          </section>
          <section className="prep-config-card">
            <p className="eyebrow">ESTILO</p>
            <div className="prep-option-list">
              {STYLE_OPTIONS.map(option => <button key={option.value} className={classNames('prep-option', preferences.style === option.value && 'selected')} onClick={() => setPreferences(current => ({ ...current, style: option.value }))}><span><strong>{option.title}</strong><small>{option.description}</small></span>{preferences.style === option.value && <Icon name="checkCircle" size={18} />}</button>)}
            </div>
          </section>
          <section className="prep-config-card">
            <div className="prep-toggle-row"><span><strong>Espacio en congelador</strong><small>Permite guardar porciones de más de 4 días.</small></span><button aria-pressed={preferences.freezerAvailable} className={classNames('toggle', preferences.freezerAvailable && 'on')} onClick={() => setPreferences(current => ({ ...current, freezerAvailable: !current.freezerAvailable }))}><span /></button></div>
            <p className="eyebrow">EQUIPO DISPONIBLE</p>
            <div className="prep-chip-list">{EQUIPMENT.map(item => <button key={item} type="button" className={classNames(preferences.equipment.includes(item) && 'selected')} onClick={() => setPreferences(current => ({ ...current, equipment: current.equipment.includes(item) ? current.equipment.filter(value => value !== item) : [...current.equipment, item] }))}>{EQUIPMENT_LABELS[item]}</button>)}</div>
          </section>
          {error && <p className="prep-error" role="alert"><Icon name="info" size={15} /> {error}</p>}
          <div className="prep-actions"><button className="secondary-button" onClick={() => setStep(draft ? 'review' : 'coverage')}>Atrás</button><button className="primary-button" disabled={generating} onClick={generate}>{generating ? 'Actualizando…' : 'Actualizar recomendación'} <Icon name="sparkles" size={15} /></button></div>
        </>
      )}

      {step === 'review' && draft && (
    <ReviewDraft draft={draft} mode={generationMode} recommendationSource={preferenceSource} error={error} onDraftChange={setDraft} onCustomize={() => setStep('constraints')} onBack={() => setStep('constraints')} onSave={() => { const plan = materializeMealPrepPlan(week, selectedIds, preferences, draft); onSave({ ...plan, status: 'ready', acceptedAt: new Date().toISOString(), version: savedPlan ? savedPlan.version + 1 : 1 }); setEditing(false); }} />
      )}
    </div>
  );
}

function ReviewDraft({ draft, mode, recommendationSource, error, onDraftChange, onCustomize, onBack, onSave }: { draft: MealPrepDraftContent; mode: 'ai' | 'safe_baseline' | null; recommendationSource: string; error: string | null; onDraftChange: (draft: MealPrepDraftContent) => void; onCustomize: () => void; onBack: () => void; onSave: () => void }) {
  const refrigerator = draft.portions.filter(item => item.storage === 'refrigerator').length;
  const freezer = draft.portions.filter(item => item.storage === 'freezer').length;
  const criticalAssumptions = draft.assumptions.filter(item => assumptionNeedsAcknowledgement(item.text, item.provenance));
  const [assumptionsAcknowledged, setAssumptionsAcknowledged] = useState(false);
  return <>
    {draft.assumptions.length > 0 && <section className="prep-review-alert" aria-labelledby="prep-review-alert-title">
      <span className="prep-review-alert-icon"><Icon name="info" size={18} /></span>
      <div>
        <strong id="prep-review-alert-title">{draft.assumptions.length} {draft.assumptions.length === 1 ? 'decisión necesita' : 'decisiones necesitan'} revisión</strong>
        <p>Confirma estos supuestos antes de guardar tu preparación.</p>
        <div className="prep-review-alert-links">{draft.assumptions.map(item => <a key={item.id} href={`#prep-assumption-${item.id}`}>{item.text.slice(0, 48)}{item.text.length > 48 ? '…' : ''}</a>)}</div>
      </div>
    </section>}
    <section className="prep-outcome-card"><div><strong>{draft.sessions.length}</strong><span>sesiones</span></div><div><strong>{draft.portions.length}</strong><span>porciones</span></div><div><strong>{draft.finishSteps.length}</strong><span>al momento</span></div></section>
    {error && <p className="prep-warning"><Icon name="info" size={15} /> {error}</p>}
    <p className="prep-trust-note"><Icon name={mode === 'ai' ? 'sparkles' : 'lock'} size={14} /> {mode === 'ai' ? 'Sugerencia de IA, validada contra tu Plan y reglas de seguridad.' : 'Borrador conservador sin cambios a tu Plan.'}</p>
    <section className="prep-recommendation-card" aria-labelledby="prep-recommendation-title">
      <div className="prep-recommendation-copy">
        <span className="prep-recommendation-icon"><Icon name="sparkles" size={16} /></span>
        <div>
          <p className="eyebrow">RECOMENDACIÓN</p>
          <h3 id="prep-recommendation-title">La configuración ya está resuelta</h3>
          <p>Generamos esta semana con {recommendationSource}. Revisa el resultado y personaliza solo si necesitas cambiar horarios, equipo o nivel de adelanto.</p>
        </div>
      </div>
      <button className="secondary-button" onClick={onCustomize}>Personalizar preparación</button>
    </section>
    <section className="prep-review-section"><header><div><p className="eyebrow">SESIONES</p><h3>Orden de preparación</h3></div></header>{draft.sessions.map(session => <article key={session.id} className="prep-session-card"><div><strong>{new Intl.DateTimeFormat('es-MX', { weekday: 'long', hour: 'numeric', minute: '2-digit' }).format(new Date(session.scheduledFor))}</strong><span>{session.estimatedMinutes} min estimados</span></div><small>{session.taskIds.length} tareas secuenciales</small></article>)}</section>
    <section className="prep-review-section"><p className="eyebrow">QUÉ VAS A ADELANTAR</p><h3>Platillos y componentes</h3>{draft.batches.map(batch => <article key={batch.id} className="prep-batch-card"><div className="prep-batch-title"><strong>{batch.label}</strong><span className={classNames('prep-batch-kind', batch.kind === 'component' && 'component')}>{batch.kind === 'component' ? 'Componentes' : 'Platillo listo'}</span></div><span>{batch.quantityDisplay}</span><small>{batch.portionIds.length} porciones asignadas</small></article>)}</section>
    <section className="prep-review-section"><p className="eyebrow">AL MOMENTO</p><h3>Qué terminas cada día</h3><div className="prep-finish-list">{draft.finishSteps.map(step => <article key={step.id}><span>{formatWeekday(step.date)}</span><p>{step.instruction}</p></article>)}</div></section>
    <details className="prep-task-editor"><summary>Revisar instrucciones <span>{draft.tasks.length} tareas</span></summary><div>{draft.tasks.map(task => <label key={task.id}><span>{taskKindLabel(task.kind)} · {task.estimatedMinutes} min {task.provenance === 'safety_rule' ? '· regla fija' : '· sugerencia editable'}</span><textarea value={task.instruction} disabled={task.provenance === 'safety_rule'} onChange={event => onDraftChange({ ...draft, tasks: draft.tasks.map(item => item.id === task.id ? { ...item, instruction: event.target.value } : item) })} /></label>)}</div></details>
    <section className="prep-storage-summary"><div><Icon name="meal" size={18} /><span><strong>{refrigerator}</strong> refrigerador</span></div><div><Icon name="lock" size={18} /><span><strong>{freezer}</strong> congelador</span></div><div><Icon name="sun" size={18} /><span><strong>{draft.finishSteps.length}</strong> frescas</span></div></section>
    {draft.assumptions.length > 0 && <section className="prep-assumptions" aria-labelledby="prep-assumptions-title"><p className="eyebrow" id="prep-assumptions-title">NECESITA TU REVISIÓN</p>{draft.assumptions.map(item => <div key={item.id} id={`prep-assumption-${item.id}`} className="prep-assumption-item"><Icon name="info" size={14} /><p>{item.text}</p></div>)}{criticalAssumptions.length > 0 && <label className="prep-assumption-ack"><input type="checkbox" checked={assumptionsAcknowledged} onChange={event => setAssumptionsAcknowledged(event.target.checked)} /><span>Confirmo que revisé los supuestos de almacenamiento y seguridad.</span></label>}</section>}
    <div className="prep-actions"><button className="secondary-button" onClick={onBack}>Personalizar preparación</button><button className="primary-button" disabled={criticalAssumptions.length > 0 && !assumptionsAcknowledged} onClick={onSave}>Guardar preparación <Icon name="check" size={15} /></button></div>
  </>;
}

function PreparedWeek({ plan, completions, updateAvailable, onStart, onAdjust }: { plan: MealPrepPlan; completions: PrepTaskCompletion[]; updateAvailable: boolean; onStart: (id: string) => void; onAdjust: () => void }) {
  const completedIds = new Set(completions.filter(item => item.mealPrepPlanId === plan.id).map(item => item.prepTaskId));
  const completedCount = plan.tasks.filter(task => completedIds.has(task.id)).length;
  const sortedSessions = [...plan.sessions].sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
  const nextSession = sortedSessions.find(session => session.taskIds.some(taskId => !completedIds.has(taskId)));
  const weekComplete = plan.status === 'complete' || (sortedSessions.length > 0 && sortedSessions.every(session => session.taskIds.length === 0 || session.taskIds.every(taskId => completedIds.has(taskId))));
  const nextSessionDate = nextSession?.scheduledFor.slice(0, 10);
  const dayDates = Array.from(new Set([
    ...plan.sessions.map(session => session.scheduledFor.slice(0, 10)),
    ...plan.portions.map(portion => portion.date),
    ...plan.finishSteps.map(step => step.date),
  ])).sort();
  // Keep the first render deterministic for hydration while still giving the user
  // a useful "today" group in the prepared-week overview.
  const today = new Date().toISOString().slice(0, 10);
  const [openDates, setOpenDates] = useState<string[]>(() => Array.from(new Set([today, nextSessionDate].filter((date): date is string => Boolean(date)))));

  const sessionActionLabel = (session: MealPrepPlan['sessions'][number]) => {
    const done = session.taskIds.filter(id => completedIds.has(id)).length;
    const isComplete = session.taskIds.length > 0 && done === session.taskIds.length;
    return isComplete ? 'Ver resumen' : done ? 'Continuar' : 'Empezar';
  };

  return <div className="prepared-week">
    {updateAvailable && <section className="prep-update-card"><div><strong>Nueva preparación por componentes</strong><p>Vuelve a generar para incluir paquetes para licuar y verduras cortadas para tus comidas frescas.</p></div><button className="secondary-button" onClick={onAdjust}>Actualizar</button></section>}
    <section className={classNames('prep-ready-hero', weekComplete && 'is-complete')}><span className="prep-ready-icon"><Icon name="checkCircle" size={23} /></span><p className="eyebrow">{weekComplete ? 'SEMANA COMPLETADA' : 'SEMANA ORGANIZADA'}</p><h2>{weekComplete ? 'Preparación semanal completada' : 'Tu plan de preparación está listo'}</h2><p>{plan.batches.length} preparaciones · {plan.portions.length} porciones · {plan.finishSteps.length} pasos al momento</p><div className="prep-progress"><i style={{ width: `${plan.tasks.length ? Math.round(completedCount / plan.tasks.length * 100) : 0}%` }} /></div><small>{completedCount} de {plan.tasks.length} tareas completadas</small></section>
    <section className="prep-next-action" aria-labelledby="prep-next-action-title">
      <div>
        <p className="eyebrow">PRÓXIMO PASO</p>
        <h3 id="prep-next-action-title">{nextSession ? 'Continúa con tu preparación' : 'Preparación semanal al día'}</h3>
        <p>{nextSession ? `${new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(nextSession.scheduledFor))} · ${nextSession.estimatedMinutes} min · ${nextSession.taskIds.length} tareas` : 'Ya completaste todas las sesiones de esta semana.'}</p>
      </div>
      {nextSession && <button className="primary-button" onClick={() => onStart(nextSession.id)}>{sessionActionLabel(nextSession)} <Icon name="arrow" size={14} /></button>}
    </section>
    <section className="prep-day-list" aria-label="Resumen por día">
      {dayDates.map(date => {
        const sessions = sortedSessions.filter(session => session.scheduledFor.slice(0, 10) === date);
        const storedPortions = plan.portions.filter(portion => portion.date === date && portion.storage !== 'fresh');
        const finishSteps = plan.finishSteps.filter(step => step.date === date);
        const instructionCount = sessions.reduce((total, session) => total + session.taskIds.length, 0) + finishSteps.length;
        const isOpen = openDates.includes(date);
        return <details key={date} className={classNames('prep-day', isOpen && 'open')} open={isOpen} onToggle={event => {
          const nextOpen = event.currentTarget.open;
          setOpenDates(current => nextOpen ? (current.includes(date) ? current : [...current, date]) : current.filter(item => item !== date));
        }}>
          <summary className="prep-day-summary">
            <span className="prep-day-summary-main"><strong>{date === today ? 'Hoy' : formatWeekday(date)}</strong><small>{formatShortDate(date)}{date === nextSessionDate ? ' · próxima sesión' : ''}</small></span>
            <span className="prep-day-summary-stats"><span>{instructionCount} {instructionCount === 1 ? 'instrucción' : 'instrucciones'}</span><span>{storedPortions.length} {storedPortions.length === 1 ? 'porción guardada' : 'porciones guardadas'}</span></span>
            <Icon name="chevron" size={17} className="prep-day-chevron" />
          </summary>
          <div className="prep-day-content">
            {sessions.length > 0 && <div className="prep-day-content-section"><p className="eyebrow">SESIONES</p>{sessions.map(session => { const done = session.taskIds.filter(id => completedIds.has(id)).length; return <article key={session.id} className="prep-session-card"><div><strong>{new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(session.scheduledFor))}</strong><span>{session.estimatedMinutes} min · {done}/{session.taskIds.length} tareas</span></div><button className="primary-button" onClick={() => onStart(session.id)}>{sessionActionLabel(session)} <Icon name="arrow" size={14} /></button></article>; })}</div>}
            {finishSteps.length > 0 && <div className="prep-day-content-section"><p className="eyebrow">{date === today ? 'INSTRUCCIONES DE HOY' : 'AL MOMENTO'}</p><div className="prep-finish-list">{finishSteps.map(step => <article key={step.id}><span>{formatWeekday(step.date)}</span><p>{step.instruction}</p></article>)}</div></div>}
            {storedPortions.length > 0 && <div className="prep-day-content-section"><p className="eyebrow">PORCIONES GUARDADAS</p>{storedPortions.map(portion => { const batch = plan.batches.find(item => item.id === portion.batchId); return <article key={portion.id} className="prep-portion-row"><span className={classNames('prep-storage-dot', portion.storage)} /><span><strong>{batch?.label ?? 'Porción preparada'}</strong><small>{portion.storage === 'freezer' ? `${batch?.kind === 'component' ? 'Congelador · usar desde congelado' : `Congelador · pasa al refri ${portion.thawAt ? formatShortDate(portion.thawAt) : ''}`}` : `Refrigerador · consumir antes del ${portion.consumeBy ? formatShortDate(portion.consumeBy) : ''}`}</small></span></article>; })}</div>}
          </div>
        </details>;
      })}
    </section>
    <div className="prep-week-actions"><button className="text-button" onClick={onAdjust}>Ajustar preparación</button></div>
  </div>;
}

function KitchenMode({ plan, sessionId, completions, onToggle, onClose }: { plan: MealPrepPlan; sessionId: string; completions: PrepTaskCompletion[]; onToggle: (planId: string, taskId: string) => void; onClose: () => void }) {
  const session = plan.sessions.find(item => item.id === sessionId)!;
  const tasks = session.taskIds.map(id => plan.tasks.find(task => task.id === id)).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const completed = new Set(completions.filter(item => item.mealPrepPlanId === plan.id).map(item => item.prepTaskId));
  const sessionComplete = tasks.length > 0 && tasks.every(task => completed.has(task.id));
  const preparedPortions = plan.portions.filter(portion => portion.preparedAt === session.scheduledFor && portion.storage !== 'fresh');
  const storageSummary = preparedPortions.reduce<Array<{ label: string; storage: 'refrigerator' | 'freezer'; count: number }>>((summary, portion) => {
    const batch = plan.batches.find(item => item.id === portion.batchId);
    const label = batch?.label ?? 'Porción preparada';
    const storage = portion.storage === 'freezer' ? 'freezer' : 'refrigerator';
    const existing = summary.find(item => item.label === label && item.storage === storage);
    if (existing) existing.count += 1;
    else summary.push({ label, storage, count: 1 });
    return summary;
  }, []);
  const nextSession = plan.sessions
    .filter(item => item.id !== session.id && item.scheduledFor > session.scheduledFor)
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))[0];
  const nextIndex = tasks.findIndex(task => !completed.has(task.id));
  const [index, setIndex] = useState(nextIndex < 0 ? Math.max(0, tasks.length - 1) : nextIndex);
  const [timerEndsAt, setTimerEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const task = tasks[index];
  useEffect(() => {
    if (sessionComplete) return;
    const wakeLockApi = (navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock;
    let lock: { release: () => Promise<void> } | null = null;
    void wakeLockApi?.request('screen').then(value => { lock = value; }).catch(() => undefined);
    return () => { void lock?.release(); };
  }, [sessionComplete]);
  useEffect(() => {
    if (!timerEndsAt) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [timerEndsAt]);
  if (sessionComplete) {
    return <SessionComplete session={session} storageSummary={storageSummary} nextSession={nextSession} onClose={onClose} />;
  }
  if (!task) return <section className="prep-empty"><h2>Esta sesión no tiene tareas</h2><button className="secondary-button" onClick={onClose}>Volver</button></section>;
  const done = completed.has(task.id);
  const kindLabel = { wash: 'lavar', cut: 'cortar', cook: 'cocinar', cool: 'enfriar', portion: 'porcionar', label: 'etiquetar', store: 'guardar', clean: 'limpiar' }[task.kind];
  const secondsLeft = timerEndsAt ? Math.max(0, Math.ceil((timerEndsAt - now) / 1000)) : 0;
  const timerLabel = timerEndsAt ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}` : `Iniciar timer · ${task.estimatedMinutes} min`;
  return <section className="kitchen-mode"><header><button className="icon-button" aria-label="Salir de modo cocina" onClick={onClose}><Icon name="close" size={18} /></button><div><p className="eyebrow">MODO COCINA</p><strong>{index + 1} de {tasks.length}</strong></div><span>{task.estimatedMinutes} min</span></header><p className="kitchen-save-note"><Icon name="checkCircle" size={14} /> Tu avance se guarda automáticamente</p><div className="kitchen-progress"><i style={{ width: `${Math.round((index + Number(done)) / tasks.length * 100)}%` }} /></div><div className="kitchen-task"><span className="kitchen-kind">{kindLabel}</span><h2>{task.instruction}</h2>{task.equipment.length > 0 && <p><Icon name="info" size={15} /> Equipo: {task.equipment.map(item => EQUIPMENT_LABELS[item] ?? item).join(', ')}</p>}<small>{task.provenance === 'safety_rule' ? 'Regla de seguridad' : task.provenance === 'plan' ? 'Dato de tu Plan' : 'Sugerencia para revisar'}</small></div><div className="kitchen-actions"><button className="secondary-button kitchen-timer" onClick={() => { setNow(Date.now()); setTimerEndsAt(Date.now() + task.estimatedMinutes * 60000); }}><Icon name="clock" size={16} /> {timerLabel}</button><button className="primary-button" onClick={() => { if (!done) onToggle(plan.id, task.id); setTimerEndsAt(null); if (index < tasks.length - 1) setIndex(index + 1); }}>{done ? 'Siguiente' : 'Listo'} <Icon name="check" size={18} /></button><div><button className="secondary-button" disabled={index === 0} onClick={() => setIndex(index - 1)}>Atrás</button><button className="secondary-button" disabled={index === tasks.length - 1} onClick={() => setIndex(index + 1)}>Omitir por ahora</button></div></div></section>;
}

function SessionComplete({ session, storageSummary, nextSession, onClose }: { session: MealPrepPlan['sessions'][number]; storageSummary: Array<{ label: string; storage: 'refrigerator' | 'freezer'; count: number }>; nextSession?: MealPrepPlan['sessions'][number]; onClose: () => void }) {
  const sessionDate = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(session.scheduledFor));
  const nextDate = nextSession ? new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }).format(new Date(nextSession.scheduledFor)) : null;
  return <section className="prep-completion" aria-live="polite">
    <section className="prep-completion-hero" aria-labelledby="session-complete-title">
      <span className="prep-ready-icon"><Icon name="checkCircle" size={25} /></span>
      <p className="eyebrow">{sessionDate}</p>
      <h2 id="session-complete-title">Sesión terminada</h2>
      <p>Completaste todas las tareas de esta sesión.</p>
    </section>
    <section className="prep-completion-card" aria-labelledby="session-summary-title">
      <p className="eyebrow">LO QUE PREPARASTE</p>
      <h3 id="session-summary-title">Guardado para tu semana</h3>
      {storageSummary.length > 0 ? <div className="prep-completion-list">{storageSummary.map(item => <div key={`${item.label}-${item.storage}`} className="prep-completion-row"><span className={classNames('prep-storage-dot', item.storage)} /><span><strong>{item.label}</strong><small>{item.count} {item.count === 1 ? 'porción' : 'porciones'} · {item.storage === 'freezer' ? 'congelador' : 'refrigerador'}</small></span></div>)}</div> : <p className="prep-completion-empty">Esta sesión no dejó porciones para guardar. Lo fresco se termina el día indicado.</p>}
    </section>
    <section className="prep-completion-next" aria-labelledby="next-session-title">
      <p className="eyebrow">PRÓXIMA SESIÓN</p>
      <h3 id="next-session-title">{nextDate ?? 'No hay otra sesión programada'}</h3>
      <p>{nextSession ? `${nextSession.taskIds.length} tareas · ${nextSession.estimatedMinutes} min estimados` : 'Tu preparación semanal está al día.'}</p>
    </section>
    <button className="primary-button full-button" onClick={onClose}>Volver a preparación <Icon name="arrow" size={15} /></button>
  </section>;
}
