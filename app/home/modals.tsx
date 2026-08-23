'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Icon } from '../components/Icons';
import {
  LAB_METRICS,
  MEAL_TAGS,
  type ExerciseType,
  type ImplementationIntention,
  type LabCheckpoint,
  type LabValues,
  type Meal,
  type MealTag,
  type MealType,
  type NutritionPlan
} from '../lib/levelup';
import {
  classNames,
  defaultMealTypeForHour,
  exerciseTypes,
  mealTypes
} from './shared';
import { useMealTagSuggestions } from './useMealTagSuggestions';

export function Modal({
  title,
  eyebrow,
  children,
  onClose,
  className
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const [viewportRect, setViewportRect] = useState<{
    height: number;
    top: number;
  } | null>(null);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const updateViewportRect = () =>
      setViewportRect({
        height: Math.round(viewport.height),
        top: Math.round(viewport.offsetTop)
      });
    updateViewportRect();
    viewport.addEventListener('resize', updateViewportRect);
    viewport.addEventListener('scroll', updateViewportRect);
    return () => {
      viewport.removeEventListener('resize', updateViewportRect);
      viewport.removeEventListener('scroll', updateViewportRect);
    };
  }, []);

  const backdropStyle = viewportRect
    ? { height: `${viewportRect.height}px`, top: `${viewportRect.top}px` }
    : undefined;
  const panelStyle = viewportRect
    ? { maxHeight: `${Math.max(0, viewportRect.height - 28)}px` }
    : undefined;
  return (
    <div
      className="modal-backdrop"
      style={backdropStyle}
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}>
      <div
        className={classNames('modal-panel', className)}
        style={panelStyle}
        role="dialog"
        aria-modal="true"
        aria-label={title}>
        <div className="modal-header">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2>{title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function MealModal({
  meal,
  onClose,
  onSave
}: {
  meal?: Meal;
  onClose: () => void;
  onSave: (meal: Omit<Meal, 'id' | 'date' | 'createdAt'>) => void;
}) {
  const [type, setType] = useState<MealType>(
    meal?.type ?? defaultMealTypeForHour(new Date().getHours())
  );
  const [description, setDescription] = useState(meal?.description ?? '');
  const [tags, setTags] = useState<MealTag[]>(meal?.tags ?? []);
  const [manuallyToggled, setManuallyToggled] = useState<Set<MealTag>>(
    new Set()
  );
  const applySuggestion = (suggested: MealTag[]) => {
    setTags(current => {
      const kept = current.filter(item => manuallyToggled.has(item));
      const added = suggested.filter(item => !manuallyToggled.has(item));
      return Array.from(new Set([...kept, ...added]));
    });
  };

  const { suggesting, requestSuggestion } = useMealTagSuggestions({
    description,
    onSuggested: applySuggestion
  });

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    setManuallyToggled(new Set());
  };

  const handleDescriptionBlur = () => requestSuggestion();

  const toggleTag = (tag: MealTag) => {
    setManuallyToggled(current => new Set(current).add(tag));
    setTags(current =>
      current.includes(tag)
        ? current.filter(item => item !== tag)
        : [...current, tag]
    );
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!description.trim()) return;
    onSave({ type, description: description.trim(), tags });
  };
  return (
    <Modal
      title="Registrar comida"
      eyebrow="MENOS DE 10 SEGUNDOS"
      onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <div className="field">
          <label>Tipo de comida</label>
          <div className="choice-grid meal-choice-grid">
            {mealTypes.map(item => (
              <button
                type="button"
                key={item}
                className={classNames(
                  'choice-button',
                  type === item && 'selected'
                )}
                onClick={() => setType(item)}>
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="meal-description">¿Qué comiste?</label>
          <textarea
            id="meal-description"
            value={description}
            onChange={event => handleDescriptionChange(event.target.value)}
            onBlur={handleDescriptionBlur}
            placeholder="Ej. Salmón + arroz + verduras asadas"
            rows={3}
            autoFocus
          />
        </div>
        <div className="field">
          <label>
            Etiquetas rápidas <small>(opcional)</small>
            {suggesting && (
              <span className="ai-suggesting">
                <Icon name="sparkles" size={12} /> Sugerido por IA…
              </span>
            )}
          </label>
          <div className="tag-picker">
            {MEAL_TAGS.map(tag => (
              <button
                type="button"
                key={tag}
                className={classNames(
                  'tag-option',
                  tags.includes(tag) && 'selected',
                  tags.includes(tag) &&
                    !manuallyToggled.has(tag) &&
                    'ai-suggested'
                )}
                onClick={() => toggleTag(tag)}>
                {tag}
              </button>
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            className="primary-button"
            disabled={!description.trim()}>
            Guardar comida
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function ExerciseModal({
  preset,
  onClose,
  onSave
}: {
  preset?: { activity: ExerciseType; duration: number };
  onClose: () => void;
  onSave: (exercise: {
    activity: ExerciseType;
    duration: number;
    note: string;
  }) => void;
}) {
  const [activity, setActivity] = useState<ExerciseType>(
    preset?.activity ?? 'Caminata'
  );
  const [duration, setDuration] = useState(String(preset?.duration ?? 20));
  const [note, setNote] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const minutes = Number(duration);
    if (!minutes || minutes < 1) return;
    onSave({ activity, duration: minutes, note: note.trim() });
  };
  return (
    <Modal title="Registrar actividad" eyebrow="TODO CUENTA" onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <div className="field">
          <label>Actividad</label>
          <div className="exercise-picker">
            {exerciseTypes.map(item => (
              <button
                type="button"
                key={item.id}
                className={classNames(
                  'exercise-choice',
                  activity === item.id && 'selected'
                )}
                onClick={() => setActivity(item.id)}>
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="exercise-duration">Duración</label>
            <div className="input-with-suffix">
              <input
                id="exercise-duration"
                type="number"
                min="1"
                max="600"
                value={duration}
                onChange={event => setDuration(event.target.value)}
              />
              <span>minutos</span>
            </div>
          </div>
        </div>
        <div className="field">
          <label htmlFor="exercise-note">
            Nota <small>(opcional)</small>
          </label>
          <input
            id="exercise-note"
            type="text"
            value={note}
            onChange={event => setNote(event.target.value)}
            placeholder="¿Cómo se sintió?"
          />
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="primary-button">
            Guardar actividad
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function LabsModal({
  checkpoint,
  baseline,
  onClose,
  onSave
}: {
  checkpoint?: LabCheckpoint;
  baseline?: LabCheckpoint;
  onClose: () => void;
  onSave: (checkpoint: LabCheckpoint) => void;
}) {
  const [date, setDate] = useState(checkpoint?.date ?? '2026-11-07');
  const [values, setValues] = useState<LabValues>(
    checkpoint?.values ?? {
      triglycerides: null,
      ldl: null,
      hdl: null,
      nonHdl: null,
      vldl: null,
      sdLdl: null,
      totalCholesterol: null
    }
  );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({
      id: checkpoint?.id ?? 'follow-up',
      label: 'Noviembre',
      date,
      values
    });
  };
  return (
    <Modal
      title={checkpoint ? 'Editar laboratorios' : 'Agregar laboratorios'}
      eyebrow="REGISTRO NEUTRAL"
      onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <p className="form-note">
          Guarda los valores tal como aparezcan en tus resultados. Tu médico
          interpreta el significado.
        </p>
        <div className="field">
          <label htmlFor="lab-date">Fecha de toma</label>
          <input
            id="lab-date"
            type="date"
            value={date}
            onChange={event => setDate(event.target.value)}
          />
        </div>
        <div className="lab-input-grid">
          {LAB_METRICS.map(metric => (
            <label className="lab-input" key={metric.id}>
              <span>
                {metric.shortLabel}
                <small>{metric.unit}</small>
              </span>
              <input
                type="number"
                step={metric.id === 'sdLdl' ? '0.01' : '1'}
                value={values[metric.id] ?? ''}
                onChange={event =>
                  setValues(current => ({
                    ...current,
                    [metric.id]:
                      event.target.value === ''
                        ? null
                        : Number(event.target.value)
                  }))
                }
                placeholder={baseline?.values[metric.id] === null ? '—' : ''}
              />
            </label>
          ))}
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="primary-button">
            Guardar valores
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function NutritionModal({
  plan,
  onClose,
  onSave
}: {
  plan: NutritionPlan;
  onClose: () => void;
  onSave: (plan: NutritionPlan) => void;
}) {
  const [prioritize, setPrioritize] = useState(plan.prioritize.join('\n'));
  const [limit, setLimit] = useState(plan.limit.join('\n'));
  const [targets, setTargets] = useState(plan.targets.join('\n'));
  const [notes, setNotes] = useState(plan.notes);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const lines = (value: string) =>
      value
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);
    onSave({
      status: 'added',
      prioritize: lines(prioritize),
      limit: lines(limit),
      targets: lines(targets),
      notes
    });
  };
  return (
    <Modal
      title="Plan de nutriólogo"
      eyebrow="EDITABLE CUANDO LO NECESITES"
      onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <p className="form-note">
          Estas recomendaciones reemplazan o complementan la guía general.
          Escríbelas como te las entregue tu nutriólogo.
        </p>
        <div className="field">
          <label htmlFor="nutrition-prioritize">Priorizar más</label>
          <textarea
            id="nutrition-prioritize"
            value={prioritize}
            onChange={event => setPrioritize(event.target.value)}
            placeholder="Una recomendación por línea"
            rows={3}
          />
        </div>
        <div className="field">
          <label htmlFor="nutrition-limit">Limitar o cuidar</label>
          <textarea
            id="nutrition-limit"
            value={limit}
            onChange={event => setLimit(event.target.value)}
            placeholder="Una recomendación por línea"
            rows={3}
          />
        </div>
        <div className="field">
          <label htmlFor="nutrition-targets">Objetivos personales</label>
          <textarea
            id="nutrition-targets"
            value={targets}
            onChange={event => setTargets(event.target.value)}
            placeholder="Ej. incluir verduras en comida y cena"
            rows={3}
          />
        </div>
        <div className="field">
          <label htmlFor="nutrition-notes">Notas</label>
          <textarea
            id="nutrition-notes"
            value={notes}
            onChange={event => setNotes(event.target.value)}
            rows={3}
          />
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="primary-button">
            Guardar plan
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function IntentionModal({
  intention,
  onClose,
  onSave
}: {
  intention: ImplementationIntention;
  onClose: () => void;
  onSave: (intention: ImplementationIntention) => void;
}) {
  const [ifText, setIfText] = useState(intention.ifText);
  const [thenText, setThenText] = useState(intention.thenText);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!ifText.trim() || !thenText.trim()) return;
    onSave({ ...intention, ifText: ifText.trim(), thenText: thenText.trim() });
  };
  return (
    <Modal title="Editar mi plan" eyebrow="IF → THEN" onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <div className="intent-edit">
          <label htmlFor="intention-if">SI</label>
          <input
            id="intention-if"
            value={ifText}
            onChange={event => setIfText(event.target.value)}
          />
        </div>
        <div className="intent-edit">
          <label htmlFor="intention-then">ENTONCES</label>
          <input
            id="intention-then"
            value={thenText}
            onChange={event => setThenText(event.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="primary-button">
            Guardar regla
          </button>
        </div>
      </form>
    </Modal>
  );
}
