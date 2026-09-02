'use client';

import { useState, type FormEvent } from 'react';
import { Icon } from '../components/Icons';
import { Button, Field, Modal } from '../components/ui';
import {
  LAB_METRICS,
  MEAL_TAG_GROUPS,
  getMealTagLabel,
  type ExerciseType,
  type ImplementationIntention,
  type LabCheckpoint,
  type LabValues,
  type Meal,
  type MealTag,
  type MealType
} from '../lib/levelup';
import {
  classNames,
  defaultMealTypeForHour,
  exerciseTypes,
  mealTypes
} from './shared';
import { useMealTagSuggestions } from './useMealTagSuggestions';

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
  const [aiSuggestedTags, setAiSuggestedTags] = useState<MealTag[]>([]);
  const [suggestionCompleted, setSuggestionCompleted] = useState(false);
  const [manuallyToggled, setManuallyToggled] = useState<Set<MealTag>>(
    new Set()
  );
  const applySuggestion = (suggested: MealTag[]) => {
    setAiSuggestedTags(suggested);
    setSuggestionCompleted(true);
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
    setTags(current =>
      current.filter(
        tag => !aiSuggestedTags.includes(tag) || manuallyToggled.has(tag)
      )
    );
    setAiSuggestedTags([]);
    setSuggestionCompleted(false);
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
        <Field label="Tipo de comida">
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
        </Field>
        <Field label="¿Qué comiste?" htmlFor="meal-description">
          <textarea
            id="meal-description"
            value={description}
            onChange={event => handleDescriptionChange(event.target.value)}
            onBlur={handleDescriptionBlur}
            placeholder="Ej. Salmón + arroz + verduras asadas"
            rows={3}
            autoFocus
          />
        </Field>
        <div className="field">
          <div className="meal-tag-heading">
            <label>
              Etiquetas rápidas <small>(opcional)</small>
            </label>
            {!suggestionCompleted && (
              <button
                type="button"
                className={classNames(
                  'ai-tag-trigger',
                  suggesting && 'loading'
                )}
                onClick={requestSuggestion}
                disabled={description.trim().length < 8 || suggesting}>
                <Icon name="sparkles" size={13} />
                {suggesting
                  ? 'Analizando comida…'
                  : 'Sugerir etiquetas con IA'}
              </button>
            )}
          </div>
          {suggestionCompleted && (
            <div className="ai-tag-result" role="status" aria-live="polite">
              <Icon name="sparkles" size={14} />
              <span>
                {aiSuggestedTags.length > 0
                  ? `IA sugirió ${aiSuggestedTags.length} ${
                      aiSuggestedTags.length === 1 ? 'etiqueta' : 'etiquetas'
                    }`
                  : 'IA revisó esta comida'}
                <small> · puedes cambiar la selección</small>
              </span>
            </div>
          )}
          <div className="tag-picker-groups">
            {MEAL_TAG_GROUPS.map(group => (
              <div className="tag-picker-group" key={group.label}>
                <span>{group.label}</span>
                <div className="tag-picker">
                  {group.tags.map(tag => (
                    <button
                      type="button"
                      key={tag}
                      className={classNames(
                        'tag-option',
                        tags.includes(tag) && 'selected',
                        aiSuggestedTags.includes(tag) &&
                          tags.includes(tag) &&
                          !manuallyToggled.has(tag) &&
                          'ai-suggested'
                      )}
                      onClick={() => toggleTag(tag)}>
                      {aiSuggestedTags.includes(tag) &&
                        tags.includes(tag) &&
                        !manuallyToggled.has(tag) && (
                          <Icon name="sparkles" size={10} />
                        )}
                      {getMealTagLabel(tag)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={!description.trim()}>
            Guardar comida
          </Button>
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
        <Field label="Actividad">
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
        </Field>
        <div className="field-row">
          <Field label="Duración" htmlFor="exercise-duration">
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
          </Field>
        </div>
        <Field label={<>Nota <small>(opcional)</small></>} htmlFor="exercise-note">
          <input
            id="exercise-note"
            type="text"
            value={note}
            onChange={event => setNote(event.target.value)}
            placeholder="¿Cómo se sintió?"
          />
        </Field>
        <div className="modal-actions">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit">
            Guardar actividad
          </Button>
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
        <Field label="Fecha de toma" htmlFor="lab-date">
          <input
            id="lab-date"
            type="date"
            value={date}
            onChange={event => setDate(event.target.value)}
          />
        </Field>
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
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit">
            Guardar valores
          </Button>
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
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit">
            Guardar regla
          </Button>
        </div>
      </form>
    </Modal>
  );
}
