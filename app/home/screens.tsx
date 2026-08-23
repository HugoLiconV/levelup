'use client';

import { useEffect, useState } from 'react';
import { Icon, type IconName } from '../components/Icons';
import { InstallGuide } from '../components/InstallGuide';
import {
  ACHIEVEMENT_META,
  ACHIEVEMENT_ORDER,
  FOOD_GUIDE,
  LAB_METRICS,
  MEAL_TAGS,
  TOTAL_DAYS,
  addDays,
  formatLongDate,
  formatShortDate,
  formatWeekday,
  getComparison,
  getDailyXp,
  getDayData,
  getActivePlanForDate,
  getDayTypeForDate,
  getJourneyStatus,
  getLevel,
  getMilestones,
  getMomentum,
  getWeeklyInsight,
  getWeeklyStats,
  isExerciseDay,
  type AppSettings,
  type AppState,
  type ExerciseType,
  type ImplementationIntention,
  type LabCheckpoint,
  type Meal,
  type NutritionPlan,
  type Plan,
  type QuestId
} from '../lib/levelup';
import {
  classNames,
  formatChange,
  formatMetric,
  getDaysUntilAppointment,
  getGreeting,
  exerciseTypes,
  navItems,
  type NotificationPermissionState,
  type Screen
} from './shared';

export function TodayView({
  state,
  today,
  journeyStatus,
  journeyDay,
  todayData,
  weeklyStats,
  momentum,
  totalXp,
  onMove,
  onOmega,
  onPartnerWalk,
  onWater,
  onOpenMeal,
  onOpenExercise,
  onNavigate
}: {
  state: AppState;
  today: string;
  journeyStatus: 'upcoming' | 'active' | 'completed';
  journeyDay: number;
  todayData: ReturnType<typeof getDayData>;
  weeklyStats: ReturnType<typeof getWeeklyStats>;
  momentum: ReturnType<typeof getMomentum>;
  totalXp: number;
  onMove: () => void;
  onOmega: () => void;
  onPartnerWalk: () => void;
  onWater: () => void;
  onOpenMeal: () => void;
  onOpenExercise: () => void;
  onNavigate: (screen: Screen) => void;
}) {
  const dayXp = getDailyXp(state, today);
  const movementComplete =
    todayData.movementBreaks.length >= state.settings.dailyMovementGoal;
  const omegaComplete = todayData.supplementTaken;
  const exerciseComplete = todayData.exercises.length > 0;
  const mealsComplete = todayData.mainMeals.length >= 3;
  const vegetablesComplete = todayData.vegetableMeals.length >= 2;
  const waterComplete = todayData.waterMl >= state.settings.dailyWaterGoalMl;
  const waterBottleGoal = Math.max(
    1,
    Math.ceil(state.settings.dailyWaterGoalMl / state.settings.bottleSizeMl)
  );
  const partnerComplete = todayData.partnerWalk;
  const scheduledExercise = isExerciseDay(today, state.settings);
  const daysUntil = getDaysUntilAppointment(
    today,
    state.settings.appointmentDate
  );

  return (
    <div className="page-stack">
      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark">
            <Icon name="sparkles" size={17} />
          </span>
          <span>levelup</span>
        </div>
        <button
          className="icon-button"
          aria-label="Abrir Más"
          onClick={() => onNavigate('more')}>
          <Icon name="settings" size={19} />
        </button>
      </header>

      <section className="welcome-row">
        <div>
          <p className="eyebrow">{formatWeekday(today)}</p>
          <h1>
            {journeyStatus === 'completed'
              ? 'Lo hiciste, Hugo'
              : `${getGreeting()}, ${state.settings.name}`}
          </h1>
          <p className="muted">
            {journeyStatus === 'upcoming'
              ? `Tu reto comienza el ${formatShortDate(state.settings.startDate)}.`
              : journeyStatus === 'completed'
                ? 'Tu checkpoint ya llegó. Tus registros siguen aquí.'
                : 'Pequeñas acciones. Un día a la vez.'}
          </p>
        </div>
        <div
          className="day-orb"
          aria-label={`Día ${journeyDay} de ${TOTAL_DAYS}`}>
          <strong>{journeyDay}</strong>
          <span>/ {TOTAL_DAYS}</span>
        </div>
      </section>

      <CheckpointStrip state={state} today={today} journeyDay={journeyDay} />

      {journeyStatus === 'upcoming' && (
        <div className="soft-banner">
          <Icon name="sparkles" size={18} />
          <div>
            <strong>Tu plan ya está listo.</strong>
            <span>
              El día 1 empieza en{' '}
              {getDaysUntilAppointment(today, state.settings.startDate)} días.
            </span>
          </div>
        </div>
      )}
      {journeyStatus === 'completed' && (
        <div className="soft-banner completed-banner">
          <Icon name="flag" size={18} />
          <div>
            <strong>Checkpoint alcanzado.</strong>
            <span>
              Agrega tus nuevos laboratorios en Progreso cuando los tengas.
            </span>
          </div>
          <button
            className="text-button"
            onClick={() => onNavigate('progress')}>
            Ver progreso <Icon name="arrow" size={14} />
          </button>
        </div>
      )}
      {journeyStatus === 'active' &&
        state.settings.reminderEnabled &&
        !omegaComplete &&
        new Date().toTimeString().slice(0, 5) >=
          state.settings.reminderTime && (
          <div className="soft-banner reminder-banner">
            <Icon name="bell" size={18} />
            <div>
              <strong>Recordatorio suave</strong>
              <span>
                Es un buen momento para tu {state.settings.supplementName}.
              </span>
            </div>
            <button className="text-button" onClick={onOmega}>
              Registrar
            </button>
          </div>
        )}

      <section className="focus-section">
        <div className="section-kicker">
          <span>ENFOQUE DE HOY</span>
          <span className="kicker-dot" />
        </div>
        <div
          className={classNames(
            'focus-card',
            movementComplete && 'is-complete'
          )}>
          <div className="focus-icon">
            <Icon name="footprints" size={23} />
          </div>
          <div className="focus-copy">
            <h2>Aléjate del escritorio</h2>
            <p>
              {movementComplete
                ? 'Meta de pausas completa.'
                : `Te faltan ${Math.max(0, state.settings.dailyMovementGoal - todayData.movementBreaks.length)} pausas de movimiento.`}
            </p>
            <DotProgress
              value={todayData.movementBreaks.length}
              max={state.settings.dailyMovementGoal}
              color="mint"
            />
          </div>
          <button
            className={classNames(
              'round-action',
              movementComplete && 'round-action-complete'
            )}
            onClick={onMove}
            disabled={movementComplete}
            aria-label={
              movementComplete
                ? 'Meta de pausas completada'
                : 'Registrar que me moví'
            }>
            {movementComplete ? (
              <Icon name="check" size={20} />
            ) : (
              <Icon name="plus" size={21} />
            )}
          </button>
        </div>
        <div className="focus-meta">
          <span>
            <Icon name="clock" size={14} /> Romper el tiempo sentado
          </span>
          <span>+3 XP por pausa</span>
        </div>
      </section>

      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">PARA HOY</p>
            <h2>Tus quests</h2>
          </div>
          <span className="quiet-count">
            {
              [
                omegaComplete,
                movementComplete,
                mealsComplete,
                vegetablesComplete,
                waterComplete,
                ...(scheduledExercise ? [exerciseComplete] : [])
              ].filter(Boolean).length
            }{' '}
            / {scheduledExercise ? 6 : 5}
          </span>
        </div>
        <div className="quest-list">
          <QuestRow
            icon="sun"
            title={state.settings.supplementName}
            description={state.settings.supplementDose}
            reward={state.settings.questXp.omega}
            completed={omegaComplete}
            onClick={onOmega}
          />
          <QuestRow
            icon="footprints"
            title="Pausas de movimiento"
            description={`Aléjate de la pantalla ${state.settings.dailyMovementGoal} veces`}
            progress={`${todayData.movementBreaks.length} / ${state.settings.dailyMovementGoal}`}
            reward={state.settings.questXp.movement}
            completed={movementComplete}
            onClick={onMove}
          />
          {scheduledExercise && (
            <QuestRow
              icon="dumbbell"
              title="Actividad"
              description="30 min de movimiento, a tu ritmo"
              reward={state.settings.questXp.exercise}
              completed={exerciseComplete}
              onClick={onOpenExercise}
            />
          )}
          <QuestRow
            icon="utensils"
            title="Comer con intención"
            description="Registra tus comidas principales"
            progress={`${Math.min(todayData.mainMeals.length, 3)} / 3`}
            reward={state.settings.questXp.meals}
            completed={mealsComplete}
            onClick={onOpenMeal}
          />
          <QuestRow
            icon="leaf"
            title="Verduras"
            description="Inclúyelas en 2 comidas"
            progress={`${Math.min(todayData.vegetableMeals.length, 2)} / 2`}
            reward={state.settings.questXp.vegetables}
            completed={vegetablesComplete}
            onClick={() => onNavigate('food')}
          />
          <QuestRow
            icon="droplet"
            title="Agua"
            description={`Toma agua durante el día (${state.settings.bottleSizeMl} mL por botella)`}
            progress={`${Math.min(todayData.waterLogs.length, waterBottleGoal)} / ${waterBottleGoal}`}
            reward={state.settings.questXp.water}
            completed={waterComplete}
            onClick={onWater}
          />
        </div>
      </section>

      <div className="optional-quest">
        <div className="optional-icon">
          <Icon name="users" size={19} />
        </div>
        <div>
          <span className="optional-label">BONUS OPCIONAL</span>
          <strong>Caminar juntos</strong>
          <small>
            10+ minutos después de cenar · +{state.settings.questXp.partnerWalk}{' '}
            XP
          </small>
        </div>
        <button
          className={classNames('small-check', partnerComplete && 'is-checked')}
          onClick={onPartnerWalk}
          aria-label={
            partnerComplete
              ? 'Caminata con pareja registrada'
              : 'Registrar caminata con pareja'
          }>
          {partnerComplete ? (
            <Icon name="check" size={15} />
          ) : (
            <Icon name="plus" size={16} />
          )}
        </button>
      </div>

      <div className="two-column-cards">
        <div className="mini-card xp-mini">
          <div className="mini-card-top">
            <span className="eyebrow">XP DE HOY</span>
            <Icon name="sparkles" size={17} />
          </div>
          <div className="mini-number">
            {dayXp}
            <small>/ 90</small>
          </div>
          <div className="bar-track">
            <span
              className="bar-fill coral-fill"
              style={{ width: `${Math.min(100, (dayXp / 90) * 100)}%` }}
            />
          </div>
          <p>{totalXp} XP acumulados</p>
        </div>
        <div className="mini-card momentum-mini">
          <div className="mini-card-top">
            <span className="eyebrow">MOMENTUM</span>
            <Icon name="target" size={17} />
          </div>
          <div className="mini-number word-number">{momentum.label}</div>
          <div className="week-dots">
            {momentum.days.map(date => (
              <span
                key={date}
                className={classNames(
                  momentum.solidDays.includes(date) && 'is-solid'
                )}
                title={date}
              />
            ))}
          </div>
          <p>{momentum.count} / 7 días sólidos</p>
        </div>
      </div>

      <div className="insight-row">
        <span className="insight-icon">
          <Icon name="sparkles" size={16} />
        </span>
        <p>
          {journeyStatus === 'active'
            ? getTodayInsight(state, today, weeklyStats)
            : 'Tu plan sigue aquí cuando estés listo.'}
        </p>
      </div>
      {journeyStatus === 'active' && daysUntil > 0 && (
        <p className="checkpoint-caption">
          Faltan {daysUntil} días para tu cita del{' '}
          {formatShortDate(state.settings.appointmentDate)}.
        </p>
      )}
    </div>
  );
}

function getTodayInsight(
  state: AppState,
  today: string,
  weeklyStats: ReturnType<typeof getWeeklyStats>
): string {
  const data = getDayData(state, today);
  if (data.movementBreaks.length > 0 && data.exercises.length === 0)
    return 'Tres caminatas cortas también cuentan.';
  if (weeklyStats.movementBreaks >= state.settings.dailyMovementGoal * 3)
    return 'Ya estás rompiendo mejor el tiempo sentado esta semana.';
  if (data.mainMeals.length > 0)
    return 'Registrar una comida toma menos de 10 segundos y deja una pista útil.';
  return 'Estás construyendo la semana, no intentando ganar el día.';
}

function CheckpointStrip({
  state,
  today,
  journeyDay
}: {
  state: AppState;
  today: string;
  journeyDay: number;
}) {
  const status = getJourneyStatus(today, state.settings);
  const total = Math.max(
    1,
    getDaysUntilAppointment(
      state.settings.startDate,
      state.settings.appointmentDate
    )
  );
  const progress =
    status === 'upcoming'
      ? 0
      : status === 'completed'
        ? 100
        : Math.min(
            100,
            Math.max(
              0,
              (getDaysUntilAppointment(state.settings.startDate, today) /
                total) *
                100
            )
          );
  return (
    <div className="checkpoint-strip">
      <div className="checkpoint-labels">
        <span>
          DÍA 1 <b>{formatShortDate(state.settings.startDate)}</b>
        </span>
        <span>
          CHECKPOINT <b>{formatShortDate(state.settings.appointmentDate)}</b>
        </span>
      </div>
      <div className="timeline-track">
        <span className="timeline-fill" style={{ width: `${progress}%` }} />
        <span className="timeline-dot" style={{ left: `${progress}%` }} />
      </div>
      <div className="journey-summary">
        <span>
          Día {journeyDay} de {TOTAL_DAYS}
        </span>
        <span>
          {status === 'completed'
            ? 'Completado'
            : `${getDaysUntilAppointment(today, state.settings.appointmentDate)} días restantes`}
        </span>
      </div>
    </div>
  );
}

function QuestRow({
  icon,
  title,
  description,
  progress,
  reward,
  completed,
  onClick
}: {
  icon: IconName;
  title: string;
  description: string;
  progress?: string;
  reward: number;
  completed: boolean;
  onClick: () => void;
}) {
  return (
    <div className={classNames('quest-row', completed && 'quest-complete')}>
      <div className="quest-icon">
        <Icon name={icon} size={18} />
      </div>
      <button
        className="quest-content"
        onClick={onClick}
        aria-label={`${completed ? 'Ver' : 'Completar'} ${title}`}>
        <strong>{title}</strong>
        <span>{description}</span>
        {progress && <small>{progress}</small>}
      </button>
      <div className="quest-reward">
        {completed ? (
          <span className="reward-done">
            <Icon name="check" size={14} />
          </span>
        ) : (
          <span>+{reward}</span>
        )}
        <small>XP</small>
      </div>
    </div>
  );
}

function DotProgress({
  value,
  max,
  color = 'mint'
}: {
  value: number;
  max: number;
  color?: 'mint' | 'coral';
}) {
  return (
    <div className="dot-progress" aria-label={`${value} de ${max}`}>
      <span>
        {Array.from({ length: max }, (_, index) => (
          <i
            key={index}
            className={classNames(index < value && 'filled', color)}
          />
        ))}
      </span>
      <b>
        {Math.min(value, max)} / {max}
      </b>
    </div>
  );
}

export function FoodView({
  state,
  today,
  todayData,
  onOpenMeal,
  onRepeatMeal,
  onNutrition,
  onPlanEntry,
  onDeleteMeal,
  onWater
}: {
  state: AppState;
  today: string;
  todayData: ReturnType<typeof getDayData>;
  onOpenMeal: () => void;
  onRepeatMeal: () => void;
  onNutrition: () => void;
  onPlanEntry: () => void;
  onDeleteMeal: (mealId: string) => void;
  onWater: () => void;
}) {
  const [tab, setTab] = useState<'registro' | 'guia'>('registro');
  const recentMeal = [...state.meals].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  )[0];
  const waterComplete = todayData.waterMl >= state.settings.dailyWaterGoalMl;
  const waterBottleGoal = Math.max(
    1,
    Math.ceil(state.settings.dailyWaterGoalMl / state.settings.bottleSizeMl)
  );
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="COMIDA"
        title="Comer con intención"
        subtitle="Registra lo suficiente para notar tus patrones."
      />
      <div className="segmented-control">
        <button
          className={classNames(tab === 'registro' && 'selected')}
          onClick={() => setTab('registro')}>
          Registro
        </button>
        <button
          className={classNames(tab === 'guia' && 'selected')}
          onClick={() => setTab('guia')}>
          Guía de comida
        </button>
      </div>
      {tab === 'registro' ? (
        <>
          <section className="food-today-head">
            <div>
              <p className="eyebrow">HOY · {formatShortDate(today)}</p>
              <h2>{todayData.mainMeals.length} comidas registradas</h2>
            </div>
            <div className="meal-score">
              <span>{todayData.vegetableMeals.length}</span>
              <small>con verduras</small>
            </div>
          </section>
          {recentMeal && (
            <button className="repeat-meal" onClick={onRepeatMeal}>
              <span className="repeat-icon">
                <Icon name="refresh" size={17} />
              </span>
              <span>
                <strong>Repetir comida reciente</strong>
                <small>{recentMeal.description}</small>
              </span>
              <Icon name="arrow" size={16} />
            </button>
          )}

          <section
            className={classNames(
              'focus-card',
              waterComplete && 'is-complete'
            )}>
            <div className="focus-icon">
              <Icon name="droplet" size={23} />
            </div>
            <div className="focus-copy">
              <h2>Agua</h2>
              <p>
                {waterComplete
                  ? 'Meta de agua completa.'
                  : `${todayData.waterMl} / ${state.settings.dailyWaterGoalMl} mL · ${todayData.waterLogs.length} / ${waterBottleGoal} botellas`}
              </p>
              <DotProgress
                value={todayData.waterLogs.length}
                max={waterBottleGoal}
                color="mint"
              />
            </div>
            <button
              className={classNames(
                'round-action',
                waterComplete && 'round-action-complete'
              )}
              onClick={onWater}
              aria-label="Registrar una botella de agua">
              <Icon name="plus" size={21} />
            </button>
          </section>
          <div className="meal-list">
            {todayData.meals.length === 0 ? (
              <EmptyState
                icon="utensils"
                title="Tu registro empieza aquí"
                description="Una frase sencilla es suficiente. No necesitas contar calorías."
                actionLabel="Registrar comida"
                onAction={onOpenMeal}
              />
            ) : (
              todayData.meals.map(meal => (
                <MealRow key={meal.id} meal={meal} onDelete={onDeleteMeal} />
              ))
            )}
          </div>
          <button className="primary-button full-button" onClick={onOpenMeal}>
            <Icon name="plus" size={18} /> Registrar comida
          </button>
          <section className="guide-teaser">
            <div className="guide-teaser-icon">
              <Icon name="leaf" size={20} />
            </div>
            <div>
              <p className="eyebrow">GUÍA GENERAL</p>
              <h3>Ideas simples, sin reglas rígidas</h3>
              <p>
                Mientras llega tu cita con el nutriólogo, usa esto como
                orientación general.
              </p>
            </div>
            <button
              className="icon-button soft-icon"
              onClick={() => setTab('guia')}
              aria-label="Abrir guía">
              <Icon name="arrow" size={17} />
            </button>
          </section>
        </>
      ) : (
        <FoodGuide
          plan={state.nutritionPlan}
          onNutrition={onNutrition}
          onPlanEntry={onPlanEntry}
          activePlan={getActivePlanForDate(state.plans, today)}
          today={today}
        />
      )}
    </div>
  );
}

function MealRow({
  meal,
  onDelete
}: {
  meal: Meal;
  onDelete: (mealId: string) => void;
}) {
  const handleDelete = () => {
    if (window.confirm('¿Eliminar este registro de comida?')) onDelete(meal.id);
  };
  return (
    <div className="meal-row">
      <div className="meal-type-icon">
        <Icon name={meal.type === 'Snack' ? 'coffee' : 'meal'} size={18} />
      </div>
      <div className="meal-row-content">
        <div>
          <span className="meal-type">{meal.type}</span>
          <span className="meal-time">
            {new Intl.DateTimeFormat('es-MX', {
              hour: 'numeric',
              minute: '2-digit'
            }).format(new Date(meal.createdAt))}
          </span>
        </div>
        <strong>{meal.description}</strong>
        {meal.tags.length > 0 && (
          <div className="tag-list">
            {meal.tags.slice(0, 4).map(tag => (
              <span key={tag} className="tag-chip">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <button
        className="icon-button meal-delete-button"
        onClick={handleDelete}
        aria-label="Eliminar comida">
        <Icon name="trash" size={16} />
      </button>
    </div>
  );
}

function FoodGuide({
  plan,
  onNutrition,
  onPlanEntry,
  activePlan,
  today
}: {
  plan: NutritionPlan;
  onNutrition: () => void;
  onPlanEntry: () => void;
  activePlan: Plan | null;
  today: string;
}) {
  if (activePlan) {
    return <ActivePlanSummary plan={activePlan} today={today} onPlanEntry={onPlanEntry} />;
  }
  return (
    <div className="food-guide">
      <div className="plan-entry-teaser">
        <div>
          <p className="eyebrow">MENÚ DE TU NUTRIÓLOGO</p>
          <h3>¿Ya tienes un menú nuevo?</h3>
          <p>Pégalo y revisa el borrador antes de guardarlo como una nueva versión.</p>
        </div>
        <button className="primary-button" onClick={onPlanEntry}>Pegar menú</button>
      </div>
      <div className="general-note">
        <Icon name="info" size={18} />
        <p>
          Esto es orientación general, no un plan personalizado. Tu nutriólogo
          puede ajustar lo que te funciona.
        </p>
      </div>
      {plan.status === 'added' && (
        <section className="personal-plan">
          <div className="personal-plan-head">
            <div>
              <p className="eyebrow">TU PLAN PERSONAL</p>
              <h2>Recomendaciones del nutriólogo</h2>
            </div>
            <button className="text-button" onClick={onNutrition}>
              Editar <Icon name="edit" size={13} />
            </button>
          </div>
          <div className="personal-plan-grid">
            {plan.prioritize.length > 0 && (
              <div>
                <strong>Priorizar</strong>
                <ul>
                  {plan.prioritize.map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {plan.limit.length > 0 && (
              <div>
                <strong>Limitar o cuidar</strong>
                <ul>
                  {plan.limit.map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {plan.targets.length > 0 && (
              <div>
                <strong>Objetivos</strong>
                <ul>
                  {plan.targets.map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {plan.notes && <p className="personal-notes">{plan.notes}</p>}
        </section>
      )}
      <div className="guide-columns">
        <section className="guide-block prioritize">
          <div className="guide-heading">
            <span>
              <Icon name="plus" size={15} />
            </span>
            <div>
              <p className="eyebrow">PRIORIZA MÁS A MENUDO</p>
              <h2>Más de esto</h2>
            </div>
          </div>
          <ul>
            {FOOD_GUIDE.prioritize.map(item => (
              <li key={item}>
                <Icon name="check" size={15} />
                {item}
              </li>
            ))}
          </ul>
        </section>
        <section className="guide-block limit">
          <div className="guide-heading">
            <span>
              <Icon name="minus" size={15} />
            </span>
            <div>
              <p className="eyebrow">TEN MENOS A MENUDO</p>
              <h2>Sin prohibiciones</h2>
            </div>
          </div>
          <ul>
            {FOOD_GUIDE.limit.map(item => (
              <li key={item}>
                <Icon name="arrow" size={13} />
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section className="nutritionist-card">
        <div className="nutritionist-icon">
          <Icon name="users" size={20} />
        </div>
        <div>
          <p className="eyebrow">PLAN DE NUTRIÓLOGO</p>
          <h3>
            {plan.status === 'pending'
              ? 'Aún no agregado'
              : 'Plan personal agregado'}
          </h3>
          <p>
            {plan.status === 'pending'
              ? 'Cuando tengas tu cita, guarda aquí recomendaciones, objetivos y notas.'
              : 'Puedes actualizar tus recomendaciones cuando quieras.'}
          </p>
        </div>
        <button className="secondary-button" onClick={onNutrition}>
          {plan.status === 'pending' ? 'Agregar plan' : 'Editar plan'}
        </button>
      </section>
    </div>
  );
}

function ActivePlanSummary({
  plan,
  today,
  onPlanEntry
}: {
  plan: Plan;
  today: string;
  onPlanEntry: () => void;
}) {
  const todayDayType = getDayTypeForDate(plan, today);
  const slotCount = plan.dayTypes.reduce((total, dayType) => total + dayType.slots.length, 0);
  const dishCount = plan.dayTypes.reduce((total, dayType) => total + dayType.slots.reduce((slotTotal, slot) => slotTotal + slot.dishes.length, 0), 0);
  return (
    <div className="food-guide plan-summary">
      <section className="personal-plan plan-summary-header">
        <div className="personal-plan-head">
          <div>
            <p className="eyebrow">PLAN ACTIVO · {formatLongDate(plan.startDate)}</p>
            <h2>Plan de tu nutriólogo</h2>
          </div>
          <button className="text-button" onClick={onPlanEntry}>Nuevo <Icon name="plus" size={13} /></button>
        </div>
        <p className="muted">Hoy corresponde: <strong>{todayDayType?.name ?? 'sin variante asignada'}</strong></p>
      </section>
      <div className="plan-save-success">
        <span><Icon name="check" size={17} /></span>
        <div>
          <strong>Tu menú quedó guardado</strong>
          <p>Está guardado en este dispositivo y listo para acompañarte cada día.</p>
        </div>
      </div>
      <section className="plan-saved-stats">
        <div><strong>{plan.dayTypes.length}</strong><span>tipos de día</span></div>
        <div><strong>{slotCount}</strong><span>slots</span></div>
        <div><strong>{dishCount}</strong><span>platillos</span></div>
        <div><strong>{plan.supplements.length}</strong><span>suplementos</span></div>
      </section>
      <section className="plan-day-type-card">
        <p className="eyebrow">PARA HOY</p>
        <h3>{todayDayType?.name ?? 'Sin variante asignada'}</h3>
        <p className="muted">Revisa y corrige cualquier detalle abriendo una nueva versión desde el botón “Nuevo”.</p>
      </section>
    </div>
  );
}

export function MoveView({
  state,
  todayData,
  weeklyStats,
  timerMinutes,
  timerActive,
  onMove,
  onStartTimer,
  onOpenExercise
}: {
  state: AppState;
  todayData: ReturnType<typeof getDayData>;
  weeklyStats: ReturnType<typeof getWeeklyStats>;
  timerMinutes: number;
  timerActive: boolean;
  onMove: () => void;
  onStartTimer: () => void;
  onOpenExercise: (preset?: {
    activity: ExerciseType;
    duration: number;
  }) => void;
}) {
  const activityProgress = Math.min(
    100,
    (weeklyStats.activityMinutes / state.settings.weeklyActivityGoal) * 100
  );
  const strengthProgress = Math.min(
    100,
    (weeklyStats.strengthSessions / state.settings.strengthGoal) * 100
  );
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="MOVIMIENTO"
        title="Volver a moverme"
        subtitle="La meta es interrumpir el tiempo sentado y recuperar el gusto por moverte."
      />
      <section className="move-focus-card">
        <div className="move-card-top">
          <div>
            <p className="eyebrow">PAUSAS DE ESCRITORIO</p>
            <h2>
              {todayData.movementBreaks.length}{' '}
              <small>/ {state.settings.dailyMovementGoal}</small>
            </h2>
          </div>
          <div className="movement-ring">
            <span>
              {Math.round(
                Math.min(
                  100,
                  (todayData.movementBreaks.length /
                    state.settings.dailyMovementGoal) *
                    100
                )
              )}
              %
            </span>
          </div>
        </div>
        <DotProgress
          value={todayData.movementBreaks.length}
          max={state.settings.dailyMovementGoal}
        />
        <p className="move-hint">
          Caminar por la casa, estirar o rellenar agua también vale.
        </p>
        <button className="primary-button move-action" onClick={onMove}>
          <Icon name="footprints" size={19} /> Yo me moví
        </button>
        <div className="timer-row">
          <span>
            <Icon name="clock" size={15} />{' '}
            {timerActive
              ? `Siguiente pausa en ${timerMinutes} min`
              : 'Temporizador de jornada'}
          </span>
          <button onClick={onStartTimer}>
            {timerActive ? 'Reiniciar' : 'Activar 45 min'}
          </button>
        </div>
      </section>
      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">ESTA SEMANA</p>
            <h2>Movimiento semanal</h2>
          </div>
          <span className="week-date">
            {formatShortDate(weeklyStats.weekStart)} —{' '}
            {formatShortDate(addDays(weeklyStats.weekStart, 6))}
          </span>
        </div>
        <div className="metric-card">
          <MetricLine
            icon="footprints"
            label="Actividad"
            value={`${weeklyStats.activityMinutes} / ${state.settings.weeklyActivityGoal} min`}
            percent={activityProgress}
            tone="coral"
          />
          <MetricLine
            icon="dumbbell"
            label="Sesiones de fuerza"
            value={`${weeklyStats.strengthSessions} / ${state.settings.strengthGoal}`}
            percent={strengthProgress}
            tone="mint"
          />
          {weeklyStats.weeklyGoalReached && (
            <div className="weekly-bonus">
              <Icon name="checkCircle" size={17} />
              <span>
                <strong>
                  {state.settings.weeklyActivityGoal} min esta semana
                </strong>
                <small>Meta alcanzada · +50 XP</small>
              </span>
            </div>
          )}
        </div>
      </section>
      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">ACCIONES RÁPIDAS</p>
            <h2>Registrar actividad</h2>
          </div>
          <button className="text-button" onClick={() => onOpenExercise()}>
            Ver todo <Icon name="arrow" size={14} />
          </button>
        </div>
        <div className="quick-actions">
          <QuickAction
            icon="walk"
            label="10 min caminata"
            onClick={() =>
              onOpenExercise({ activity: 'Caminata', duration: 10 })
            }
          />
          <QuickAction
            icon="walk"
            label="20 min caminata"
            onClick={() =>
              onOpenExercise({ activity: 'Caminata', duration: 20 })
            }
          />
          <QuickAction
            icon="gym"
            label="30 min gym"
            onClick={() =>
              onOpenExercise({ activity: 'Gimnasio', duration: 30 })
            }
          />
          <QuickAction
            icon="gym"
            label="45 min gym"
            onClick={() =>
              onOpenExercise({ activity: 'Gimnasio', duration: 45 })
            }
          />
        </div>
      </section>
      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">REGISTROS</p>
            <h2>Actividad reciente</h2>
          </div>
        </div>
        {weeklyStats.dates.every(
          date =>
            state.exercises.filter(exercise => exercise.date === date)
              .length === 0
        ) ? (
          <EmptyState
            icon="dumbbell"
            title="Todavía no hay actividad"
            description="Una caminata de 10 minutos es una buena forma de volver."
            actionLabel="Registrar actividad"
            onAction={() => onOpenExercise()}
          />
        ) : (
          <div className="exercise-list">
            {[...state.exercises]
              .filter(exercise => weeklyStats.dates.includes(exercise.date))
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map(exercise => (
                <div className="exercise-row" key={exercise.id}>
                  <div className="exercise-icon">
                    <Icon
                      name={
                        exerciseTypes.find(
                          item => item.id === exercise.activity
                        )?.icon ?? 'other'
                      }
                      size={18}
                    />
                  </div>
                  <div>
                    <strong>{exercise.activity}</strong>
                    <span>
                      {formatShortDate(exercise.date)}
                      {exercise.note ? ` · ${exercise.note}` : ''}
                    </span>
                  </div>
                  <b>{exercise.duration} min</b>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MetricLine({
  icon,
  label,
  value,
  percent,
  tone
}: {
  icon: IconName;
  label: string;
  value: string;
  percent: number;
  tone: 'coral' | 'mint';
}) {
  return (
    <div className="metric-line">
      <div className="metric-line-label">
        <span className={classNames('metric-icon', tone)}>
          <Icon name={icon} size={16} />
        </span>
        <strong>{label}</strong>
        <b>{value}</b>
      </div>
      <div className="bar-track">
        <span
          className={classNames(
            'bar-fill',
            tone === 'coral' ? 'coral-fill' : 'mint-fill'
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  onClick
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className="quick-action" onClick={onClick}>
      <span>
        <Icon name={icon} size={19} />
      </span>
      <strong>{label}</strong>
      <Icon name="plus" size={15} />
    </button>
  );
}

export function ProgressView({
  state,
  today,
  journeyDay,
  journeyStatus,
  weeklyStats,
  momentum,
  totalXp,
  level,
  onOpenLabs,
  onSaveReflection
}: {
  state: AppState;
  today: string;
  journeyDay: number;
  journeyStatus: 'upcoming' | 'active' | 'completed';
  weeklyStats: ReturnType<typeof getWeeklyStats>;
  momentum: ReturnType<typeof getMomentum>;
  totalXp: number;
  level: ReturnType<typeof getLevel>;
  onOpenLabs: (checkpoint?: LabCheckpoint) => void;
  onSaveReflection: (note: string) => void;
}) {
  const [reflection, setReflection] = useState(
    state.reflections.find(item => item.weekStart === weeklyStats.weekStart)
      ?.note ?? ''
  );
  const baseline = state.labs.find(lab => lab.id === 'baseline');
  const followUp = state.labs.find(lab => lab.id !== 'baseline');
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="PROGRESO"
        title="Tu recorrido"
        subtitle="Una vista tranquila de lo que estás haciendo antes del checkpoint."
      />
      <section className="level-card">
        <div className="level-badge">
          <span>NIVEL</span>
          <strong>{level.level}</strong>
        </div>
        <div className="level-copy">
          <p className="eyebrow">{level.title.toUpperCase()}</p>
          <h2>{totalXp} XP acumulados</h2>
          <div className="bar-track">
            <span
              className="bar-fill coral-fill"
              style={{
                width: `${Math.min(100, (level.current / level.next) * 100)}%`
              }}
            />
          </div>
          <small>
            {Math.max(0, level.next - level.current)} XP para el siguiente nivel
          </small>
        </div>
        <Icon name="sparkles" size={23} />
      </section>
      <PersonalBestsSection state={state} />
      <section className="timeline-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">AGOSTO — NOVIEMBRE</p>
            <h2>Checkpoint</h2>
          </div>
          <span className="day-pill">
            {journeyStatus === 'completed'
              ? 'Completado'
              : `Día ${journeyDay} / ${TOTAL_DAYS}`}
          </span>
        </div>
        <Timeline state={state} today={today} />
      </section>
      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">REVISIÓN SEMANAL</p>
            <h2>Esta semana</h2>
          </div>
          <span className="momentum-label">{momentum.label}</span>
        </div>
        <div className="review-card">
          <ReviewStat
            icon="footprints"
            label="Actividad"
            value={`${weeklyStats.activityMinutes} / ${state.settings.weeklyActivityGoal} min`}
          />
          <ReviewStat
            icon="dumbbell"
            label="Fuerza"
            value={`${weeklyStats.strengthSessions} / ${state.settings.strengthGoal}`}
          />
          <ReviewStat
            icon="sun"
            label="Omega-3"
            value={`${weeklyStats.omegaDays} / 7`}
          />
          <ReviewStat
            icon="utensils"
            label="Comidas"
            value={String(weeklyStats.mealsLogged)}
          />
          <ReviewStat
            icon="refresh"
            label="Pausas de escritorio"
            value={`${weeklyStats.movementBreaks} / ${state.settings.dailyMovementGoal * 5}`}
          />
          <ReviewStat
            icon="sparkles"
            label="XP semanal"
            value={String(weeklyStats.weekXp)}
          />
          <div className="review-momentum">
            <div className="week-dots large-dots">
              {weeklyStats.dates.map(date => (
                <span
                  key={date}
                  className={classNames(
                    date <= today &&
                      momentum.solidDays.includes(date) &&
                      'is-solid'
                  )}
                />
              ))}
            </div>
            <strong>{weeklyStats.solidDays} / 7 días sólidos</strong>
            <small>Momentum: {momentum.label}</small>
          </div>
        </div>
        <div className="insight-row">
          <span className="insight-icon">
            <Icon name="sparkles" size={16} />
          </span>
          <p>{getWeeklyInsight(state, today)}</p>
        </div>
      </section>
      <section className="reflection-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">UNA PREGUNTA</p>
            <h2>¿Qué haría más fácil la próxima semana?</h2>
          </div>
        </div>
        <textarea
          value={reflection}
          onChange={event => setReflection(event.target.value)}
          placeholder="Una idea breve, si te sirve…"
          rows={3}
        />
        <button
          className="secondary-button"
          onClick={() => onSaveReflection(reflection)}>
          Guardar reflexión
        </button>
      </section>
      <FoodPatternsSection state={state} dates={weeklyStats.dates} />
      <AchievementsSection state={state} />
      <LabsSection
        baseline={baseline}
        followUp={followUp}
        onOpenLabs={onOpenLabs}
      />
    </div>
  );
}

function Timeline({ state, today }: { state: AppState; today: string }) {
  const milestones = getMilestones(state.settings);
  return (
    <div className="milestone-list">
      {milestones.map((milestone, index) => {
        const reached = today >= milestone.date;
        return (
          <div
            className={classNames('milestone', reached && 'reached')}
            key={`${milestone.label}-${milestone.date}`}>
            <div className="milestone-line">
              <span className="milestone-node">
                <Icon name={milestone.icon as IconName} size={14} />
              </span>
              {index < milestones.length - 1 && <i />}
            </div>
            <div className="milestone-copy">
              <strong>{milestone.label}</strong>
              <span>{formatShortDate(milestone.date)}</span>
            </div>
            <span className="milestone-status">
              {reached
                ? 'Listo'
                : `${Math.max(0, getDaysUntilAppointment(today, milestone.date))} d`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function FoodPatternsSection({
  state,
  dates
}: {
  state: AppState;
  dates: string[];
}) {
  const meals = state.meals.filter(meal => dates.includes(meal.date));
  const patterns = MEAL_TAGS.map(tag => ({
    tag,
    count: meals.filter(meal => meal.tags.includes(tag)).length
  }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const max = Math.max(1, ...patterns.map(item => item.count));
  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">PATRONES DE COMIDA</p>
          <h2>Lo que apareció esta semana</h2>
        </div>
        <span className="quiet-count">{meals.length} registros</span>
      </div>
      {patterns.length === 0 ? (
        <div className="pattern-empty">
          <Icon name="leaf" size={18} />
          <p>
            Cuando etiquetes algunas comidas, aquí verás patrones simples sin
            calificaciones.
          </p>
        </div>
      ) : (
        <div className="pattern-list">
          {patterns.map(pattern => (
            <div className="pattern-row" key={pattern.tag}>
              <span>{pattern.tag}</span>
              <div className="bar-track">
                <i style={{ width: `${(pattern.count / max) * 100}%` }} />
              </div>
              <b>{pattern.count}</b>
            </div>
          ))}
        </div>
      )}
      <p className="pattern-note">
        Solo son observaciones de tus registros; no son una evaluación de salud.
      </p>
    </section>
  );
}

function NumberField({
  value,
  onCommit,
  min,
  max,
  step
}: {
  value: number;
  onCommit: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const [text, setText] = useState(String(value));
  // The field is intentionally synchronized when its parent value changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(String(value));
  }, [value]);

  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={text}
      onChange={event => setText(event.target.value)}
      onBlur={() => {
        const parsed = Number(text);
        const next =
          text.trim() === '' || Number.isNaN(parsed) ? value : parsed;
        setText(String(next));
        if (next !== value) onCommit(next);
      }}
    />
  );
}

function ReviewStat({
  icon,
  label,
  value
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <div className="review-stat">
      <span>
        <Icon name={icon} size={16} />
      </span>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function PersonalBestsSection({ state }: { state: AppState }) {
  const longestActivity = state.exercises.reduce(
    (best, session) => Math.max(best, session.duration),
    0
  );
  const movementDates = Array.from(
    new Set(state.movementBreaks.map(item => item.date))
  );
  const bestDeskDay = movementDates.reduce(
    (best, date) =>
      Math.max(
        best,
        state.movementBreaks.filter(item => item.date === date).length
      ),
    0
  );
  return (
    <section>
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">MARCAS PERSONALES</p>
          <h2>Tu mejor hasta ahora</h2>
        </div>
      </div>
      <div className="personal-bests">
        <div>
          <span>
            <Icon name="clock" size={16} />
          </span>
          <p>Actividad más larga</p>
          <strong>
            {longestActivity > 0 ? `${longestActivity} min` : '—'}
          </strong>
          <small>
            {longestActivity > 0
              ? 'Tu referencia personal'
              : 'Tu primera actividad aparecerá aquí'}
          </small>
        </div>
        <div>
          <span>
            <Icon name="footprints" size={16} />
          </span>
          <p>Mejor día de pausas</p>
          <strong>{bestDeskDay > 0 ? `${bestDeskDay} pausas` : '—'}</strong>
          <small>
            {bestDeskDay > 0
              ? 'Lejos del escritorio'
              : 'Tu primera pausa aparecerá aquí'}
          </small>
        </div>
      </div>
    </section>
  );
}

function LabsSection({
  baseline,
  followUp,
  onOpenLabs
}: {
  baseline?: LabCheckpoint;
  followUp?: LabCheckpoint;
  onOpenLabs: (checkpoint?: LabCheckpoint) => void;
}) {
  return (
    <section className="labs-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">CHECKPOINT</p>
          <h2>Laboratorios</h2>
        </div>
        {followUp ? (
          <button className="text-button" onClick={() => onOpenLabs(followUp)}>
            Editar <Icon name="edit" size={14} />
          </button>
        ) : (
          <button className="secondary-button" onClick={() => onOpenLabs()}>
            Agregar noviembre
          </button>
        )}
      </div>
      <p className="muted labs-intro">
        Tus mediciones son registros para comparar después. La interpretación es
        de tu médico.
      </p>
      <div className="lab-table">
        <div className="lab-table-head">
          <span>MEDICIÓN</span>
          <span>AGO</span>
          <span>NOV</span>
          <span>CAMBIO</span>
        </div>
        {LAB_METRICS.map(metric => {
          const before = baseline?.values[metric.id] ?? null;
          const after = followUp?.values[metric.id] ?? null;
          const comparison = getComparison(before, after);
          return (
            <div className="lab-row" key={metric.id}>
              <span>
                <strong>{metric.shortLabel}</strong>
                <small>{metric.label}</small>
              </span>
              <b>{formatMetric(before)}</b>
              <b className={classNames(after === null && 'empty-lab')}>
                {formatMetric(after)}
              </b>
              <span className="lab-change">
                {after === null
                  ? '—'
                  : `${formatChange(comparison.absolute)} · ${comparison.percent === null ? '—' : `${comparison.percent > 0 ? '+' : ''}${comparison.percent.toFixed(1)}%`}`}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AchievementsSection({ state }: { state: AppState }) {
  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">PEQUEÑOS HITOS</p>
          <h2>Logros</h2>
        </div>
        <span className="quiet-count">
          {state.achievements.length} / {ACHIEVEMENT_ORDER.length}
        </span>
      </div>
      <div className="achievement-grid">
        {ACHIEVEMENT_ORDER.map(id => {
          const achievement = state.achievements.find(item => item.id === id);
          const meta = ACHIEVEMENT_META[id];
          return (
            <div
              className={classNames('achievement', !achievement && 'locked')}
              key={id}>
              <span className="achievement-icon">
                <Icon name={meta.icon as IconName} size={17} />
              </span>
              <div>
                <strong>{meta.title}</strong>
                <small>
                  {achievement ? meta.description : 'Aún por descubrir'}
                </small>
              </div>
              {achievement && <Icon name="checkCircle" size={16} />}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function MoreView({
  state,
  onSettingsChange,
  onToggleReminders,
  onReminderTimeChange,
  onUnsubscribeNotifications,
  notificationPermission,
  notificationSupported,
  notificationBusy,
  onOpenNutrition,
  onEditIntention,
  onExport,
  onImport,
  onReset,
  onSignOut
}: {
  state: AppState;
  onSettingsChange: (patch: Partial<AppSettings>) => void;
  onToggleReminders: (enabled: boolean) => void;
  onReminderTimeChange: (reminderTime: string) => void;
  onUnsubscribeNotifications: () => void;
  notificationPermission: NotificationPermissionState;
  notificationSupported: boolean;
  notificationBusy: boolean;
  onOpenNutrition: () => void;
  onEditIntention: (intention: ImplementationIntention) => void;
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="MÁS"
        title="Tu plan"
        subtitle="Ajustes simples para que LevelUp siga siendo tuyo."
      />
      <InstallGuide />
      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">IF → THEN</p>
            <h2>Mi plan</h2>
          </div>
        </div>
        <div className="intentions-list">
          {state.intentions.map(intention => (
            <button
              className="intention-row"
              key={intention.id}
              onClick={() => onEditIntention(intention)}>
              <span className="intention-if">
                SI <strong>{intention.ifText}</strong>
              </span>
              <Icon name="arrow" size={15} />
              <span className="intention-then">
                ENTONCES <strong>{intention.thenText}</strong>
              </span>
              <Icon name="edit" size={14} />
            </button>
          ))}
        </div>
      </section>
      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">AJUSTES DEL RETO</p>
            <h2>Lo que te funciona</h2>
          </div>
        </div>
        <div className="settings-list">
          <label className="setting-row">
            <span>
              <strong>Fecha de la cita</strong>
              <small>{formatLongDate(state.settings.appointmentDate)}</small>
            </span>
            <input
              type="date"
              value={state.settings.appointmentDate}
              onChange={event =>
                onSettingsChange({ appointmentDate: event.target.value })
              }
            />
          </label>
          <label className="setting-row">
            <span>
              <strong>Ventana de laboratorios</strong>
              <small>Edita la fecha cuando la tengas clara</small>
            </span>
            <input
              type="date"
              value={state.settings.labWindowDate}
              onChange={event =>
                onSettingsChange({ labWindowDate: event.target.value })
              }
            />
          </label>
          <label className="setting-row">
            <span>
              <strong>Meta de actividad semanal</strong>
              <small>Minutos que cuentan para tu semana</small>
            </span>
            <span className="inline-input">
              <NumberField
                min={10}
                step={5}
                value={state.settings.weeklyActivityGoal}
                onCommit={value =>
                  onSettingsChange({ weeklyActivityGoal: value })
                }
              />
              <em>min</em>
            </span>
          </label>
          <label className="setting-row">
            <span>
              <strong>Sesiones de fuerza</strong>
              <small>Objetivo semanal</small>
            </span>
            <span className="inline-input">
              <NumberField
                min={0}
                max={7}
                value={state.settings.strengthGoal}
                onCommit={value => onSettingsChange({ strengthGoal: value })}
              />
              <em>/ semana</em>
            </span>
          </label>
          <label className="setting-row">
            <span>
              <strong>Pausas de movimiento</strong>
              <small>Por día de trabajo</small>
            </span>
            <span className="inline-input">
              <NumberField
                min={1}
                max={12}
                value={state.settings.dailyMovementGoal}
                onCommit={value =>
                  onSettingsChange({ dailyMovementGoal: value })
                }
              />
              <em>/ día</em>
            </span>
          </label>
          <label className="setting-row">
            <span>
              <strong>Tamaño de mi botella</strong>
              <small>Cuánto tomas por recarga</small>
            </span>
            <span className="inline-input">
              <NumberField
                min={50}
                step={50}
                value={state.settings.bottleSizeMl}
                onCommit={value => onSettingsChange({ bottleSizeMl: value })}
              />
              <em>mL</em>
            </span>
          </label>
          <label className="setting-row">
            <span>
              <strong>Meta diaria de agua</strong>
              <small>Total que quieres tomar al día</small>
            </span>
            <span className="inline-input">
              <NumberField
                min={250}
                step={250}
                value={state.settings.dailyWaterGoalMl}
                onCommit={value =>
                  onSettingsChange({ dailyWaterGoalMl: value })
                }
              />
              <em>mL</em>
            </span>
          </label>
          <label className="setting-row">
            <span>
              <strong>{state.settings.supplementName}</strong>
              <small>Texto de tu hábito</small>
            </span>
            <input
              className="setting-text-input"
              type="text"
              value={state.settings.supplementDose}
              onChange={event =>
                onSettingsChange({ supplementDose: event.target.value })
              }
            />
          </label>
          <div className="setting-row reminder-setting">
            <span>
              <strong>Recordatorios</strong>
              <small>
                {notificationSupported
                  ? 'Omega-3 y pausas aunque cierres la app'
                  : 'Este navegador no permite notificaciones push'}
              </small>
            </span>
            <button
              className={classNames(
                'toggle',
                state.settings.reminderEnabled && 'on'
              )}
              disabled={notificationBusy || !notificationSupported}
              onClick={() => onToggleReminders(!state.settings.reminderEnabled)}
              aria-pressed={state.settings.reminderEnabled}>
              <span />
            </button>
          </div>
          {state.settings.reminderEnabled && (
            <label className="reminder-time">
              <span>Hora de omega-3</span>
              <input
                type="time"
                value={state.settings.reminderTime}
                onChange={event => onReminderTimeChange(event.target.value)}
              />
            </label>
          )}
          <div className="notification-status">
            <span>
              {notificationPermission === 'granted'
                ? 'Notificaciones permitidas'
                : notificationPermission === 'denied'
                  ? 'Notificaciones bloqueadas por el navegador'
                  : notificationPermission === 'unsupported'
                    ? 'Notificaciones no disponibles'
                    : 'Notificaciones aún no activadas'}
            </span>
            {state.settings.reminderEnabled && (
              <button
                className="text-button"
                disabled={notificationBusy}
                onClick={onUnsubscribeNotifications}>
                Desvincular dispositivo
              </button>
            )}
          </div>
        </div>
      </section>
      <section className="nutrition-setting">
        <div className="setting-icon">
          <Icon name="leaf" size={18} />
        </div>
        <div>
          <p className="eyebrow">NUTRIÓLOGO</p>
          <h3>
            {state.nutritionPlan.status === 'pending'
              ? 'Plan pendiente'
              : 'Plan personal guardado'}
          </h3>
          <p>
            {state.nutritionPlan.status === 'pending'
              ? 'Agrega recomendaciones cuando tengas tu cita.'
              : 'Tus recomendaciones están listas para consultar.'}
          </p>
        </div>
        <button className="text-button" onClick={onOpenNutrition}>
          {state.nutritionPlan.status === 'pending' ? 'Agregar' : 'Editar'}
        </button>
      </section>
      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">RECOMPENSAS</p>
            <h2>XP por quest</h2>
          </div>
        </div>
        <div className="settings-list xp-settings-list">
          {(
            [
              { id: 'omega', label: 'Omega-3' },
              { id: 'movement', label: 'Pausas de movimiento' },
              { id: 'exercise', label: 'Actividad' },
              { id: 'meals', label: 'Comidas del día' },
              { id: 'vegetables', label: 'Verduras' },
              { id: 'fruit', label: 'Fruta' },
              { id: 'water', label: 'Agua' },
              { id: 'partnerWalk', label: 'Caminata juntos' }
            ] as Array<{ id: QuestId; label: string }>
          ).map(quest => (
            <label className="setting-row" key={quest.id}>
              <span>
                <strong>{quest.label}</strong>
                <small>Máximo de la quest</small>
              </span>
              <span className="inline-input">
                <NumberField
                  min={0}
                  max={100}
                  value={state.settings.questXp[quest.id]}
                  onCommit={value =>
                    onSettingsChange({
                      questXp: { ...state.settings.questXp, [quest.id]: value }
                    })
                  }
                />
                <em>XP</em>
              </span>
            </label>
          ))}
        </div>
      </section>
      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">TUS DATOS</p>
            <h2>Local y bajo tu control</h2>
          </div>
        </div>
        <div className="data-actions">
          <button onClick={onExport}>
            <Icon name="download" size={17} />
            <span>
              <strong>Exportar datos</strong>
              <small>Guardar un respaldo JSON</small>
            </span>
            <Icon name="arrow" size={15} />
          </button>
          <button onClick={onImport}>
            <Icon name="upload" size={17} />
            <span>
              <strong>Importar datos</strong>
              <small>Restaurar un respaldo JSON</small>
            </span>
            <Icon name="arrow" size={15} />
          </button>
          <button className="danger-action" onClick={onReset}>
            <Icon name="trash" size={17} />
            <span>
              <strong>Restablecer app</strong>
              <small>Borrar el progreso de este dispositivo</small>
            </span>
            <Icon name="arrow" size={15} />
          </button>
        </div>
      </section>
      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">CUENTA</p>
            <h2>Sesión</h2>
          </div>
        </div>
        <div className="data-actions">
          <button onClick={onSignOut}>
            <Icon name="logout" size={17} />
            <span>
              <strong>Cerrar sesión</strong>
            </span>
            <Icon name="arrow" size={15} />
          </button>
        </div>
      </section>
      <p className="disclaimer">
        <Icon name="info" size={14} />
        Checkpoint te ayuda a registrar hábitos y progreso. No sustituye las
        recomendaciones de tu médico o nutriólogo.
      </p>
    </div>
  );
}

function PageHeader({
  eyebrow,
  title,
  subtitle
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <header className="page-header">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="muted">{subtitle}</p>
    </header>
  );
}

function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction
}: {
  icon: IconName;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name={icon} size={22} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      <button className="secondary-button" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}

export function BottomNav({
  screen,
  onNavigate
}: {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
}) {
  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {navItems.map(item => (
        <button
          key={item.id}
          className={classNames(screen === item.id && 'active')}
          onClick={() => onNavigate(item.id)}
          aria-current={screen === item.id ? 'page' : undefined}>
          <Icon name={item.icon} size={21} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
