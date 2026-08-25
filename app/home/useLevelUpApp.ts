'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '../lib/supabase/client';
import { useDataTransfer } from './useDataTransfer';
import { useNotifications } from './useNotifications';
import {
  createId,
  createSeedState,
  deriveMealFromPlanSlot,
  getDayData,
  getJourneyDay,
  getJourneyStatus,
  getLevel,
  getMomentum,
  getTotalXp,
  getWeeklyStats,
  loadState,
  saveState,
  syncAchievements,
  toDateInput,
  type AppSettings,
  type AppState,
  type ExerciseType,
  type ImplementationIntention,
  type LabCheckpoint,
  type Meal,
  type Plan,
  type PlanSlot,
  type PlanSupplement,
  type QuestId
} from '../lib/levelup';
import { getRequestedScreen, type ModalState, type Screen } from './shared';

export function useLevelUpApp() {
  const router = useRouter();
  const [state, setState] = useState<AppState>(() => createSeedState());
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>('today');
  const [modal, setModal] = useState<ModalState>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const previousLevelRef = useRef<number | null>(null);

  const today = toDateInput(new Date());
  const todayData = useMemo(() => getDayData(state, today), [state, today]);
  const journeyStatus = getJourneyStatus(today, state.settings);
  const journeyDay = getJourneyDay(today, state.settings);
  const weeklyStats = useMemo(
    () => getWeeklyStats(state, today),
    [state, today]
  );
  const momentum = useMemo(() => getMomentum(state, today), [state, today]);
  const totalXp = useMemo(() => getTotalXp(state), [state]);
  const level = useMemo(() => getLevel(totalXp), [totalXp]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() =>
      setScreen(getRequestedScreen())
    );
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const loaded = loadState();
      setState(syncAchievements(loaded, toDateInput(new Date())));
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (ready) saveState(state);
  }, [ready, state]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!ready) return;
    if (previousLevelRef.current === null) {
      previousLevelRef.current = level.level;
      return;
    }
    if (level.level > previousLevelRef.current) {
      const frame = window.requestAnimationFrame(() =>
        setNotice(`Nivel ${level.level} · ${level.title}. Sigue a tu ritmo.`)
      );
      previousLevelRef.current = level.level;
      return () => window.cancelAnimationFrame(frame);
    }
    previousLevelRef.current = level.level;
  }, [level.level, level.title, ready]);

  const apply = (
    updater: (previous: AppState) => AppState,
    message?: string
  ) => {
    setState(previous =>
      syncAchievements(updater(previous), toDateInput(new Date()))
    );
    if (message) setNotice(message);
  };

  const completeQuest = (questId: QuestId, message: string) => {
    apply(previous => {
      const completionId = `${questId}-${today}`;
      if (previous.questCompletions.some(item => item.id === completionId))
        return previous;
      return {
        ...previous,
        questCompletions: [
          ...previous.questCompletions,
          {
            id: completionId,
            questId,
            date: today,
            completedAt: new Date().toISOString()
          }
        ]
      };
    }, message);
  };

  const logMovementBreak = () => {
    apply(
      previous => ({
        ...previous,
        movementBreaks: [
          ...previous.movementBreaks,
          {
            id: createId('break'),
            date: today,
            createdAt: new Date().toISOString()
          }
        ]
      }),
      '+3 XP · Una pausa corta también cuenta'
    );
  };

  const logWater = () => {
    apply(
      previous => ({
        ...previous,
        waterLogs: [
          ...previous.waterLogs,
          {
            id: createId('water'),
            date: today,
            createdAt: new Date().toISOString()
          }
        ]
      }),
      `+${state.settings.questXp.water} XP · Botella registrada`
    );
  };

  const logPartnerWalk = () => {
    if (todayData.partnerWalk) return;
    apply(
      previous => ({
        ...previous,
        partnerWalks: [...previous.partnerWalks, today]
      }),
      `Caminata juntos · +${state.settings.questXp.partnerWalk} XP`
    );
    completeQuest('partnerWalk', '');
  };

  const addMeal = (meal: Omit<Meal, 'id' | 'date' | 'createdAt'>) => {
    apply(
      previous => ({
        ...previous,
        meals: [
          ...previous.meals,
          {
            ...meal,
            id: createId('meal'),
            date: today,
            createdAt: new Date().toISOString()
          }
        ]
      }),
      'Comida registrada · +5 XP'
    );
    setModal(null);
  };

  const deleteMeal = (mealId: string) => {
    apply(
      previous => ({
        ...previous,
        meals: previous.meals.filter(meal => meal.id !== mealId),
        planSlotCompletions: previous.planSlotCompletions.filter(
          completion => completion.mealId !== mealId
        )
      }),
      'Comida eliminada'
    );
  };

  const togglePlanSlot = (
    planId: string,
    dayTypeId: string,
    slot: PlanSlot
  ) => {
    const existing = state.planSlotCompletions.find(
      completion =>
        completion.date === today &&
        completion.planId === planId &&
        completion.dayTypeId === dayTypeId &&
        completion.slotId === slot.id
    );

    apply(previous => {
      const completion = previous.planSlotCompletions.find(
        item =>
          item.date === today &&
          item.planId === planId &&
          item.dayTypeId === dayTypeId &&
          item.slotId === slot.id
      );
      if (completion) {
        return {
          ...previous,
          meals: previous.meals.filter(meal => meal.id !== completion.mealId),
          planSlotCompletions: previous.planSlotCompletions.filter(
            item => item.id !== completion.id
          )
        };
      }

      const createdAt = new Date().toISOString();
      const mealId = createId('meal');
      return {
        ...previous,
        meals: [
          ...previous.meals,
          {
            ...deriveMealFromPlanSlot(slot),
            id: mealId,
            date: today,
            createdAt
          }
        ],
        planSlotCompletions: [
          ...previous.planSlotCompletions,
          {
            id: createId('plan-slot-completion'),
            date: today,
            planId,
            dayTypeId,
            slotId: slot.id,
            mealId,
            completedAt: createdAt
          }
        ]
      };
    }, existing ? 'Comida del plan eliminada' : 'Comida del plan registrada · +5 XP');
  };

  const togglePlanSupplement = (planId: string, supplement: PlanSupplement) => {
    const existing = state.planSupplementLogs.find(
      log =>
        log.date === today &&
        log.planId === planId &&
        log.supplementName === supplement.name
    );

    apply(previous => {
      if (existing) {
        return {
          ...previous,
          planSupplementLogs: previous.planSupplementLogs.filter(log => log.id !== existing.id)
        };
      }

      return {
        ...previous,
        planSupplementLogs: [
          ...previous.planSupplementLogs,
          {
            id: createId('plan-supplement-log'),
            date: today,
            planId,
            supplementName: supplement.name,
            createdAt: new Date().toISOString()
          }
        ]
      };
    }, existing ? `${supplement.name} desmarcado` : `✓ ${supplement.name} registrado · +${state.settings.questXp.omega} XP`);
  };

  const addExercise = (exercise: {
    activity: ExerciseType;
    duration: number;
    note: string;
  }) => {
    apply(
      previous => ({
        ...previous,
        exercises: [
          ...previous.exercises,
          {
            ...exercise,
            id: createId('exercise'),
            date: today,
            createdAt: new Date().toISOString()
          }
        ]
      }),
      `Actividad registrada · +${state.settings.questXp.exercise} XP`
    );
    setModal(null);
  };

  const repeatRecentMeal = () => {
    const recent = [...state.meals].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    )[0];
    if (!recent) return;
    addMeal({
      type: recent.type,
      description: recent.description,
      tags: recent.tags
    });
  };

  const updateSettings = (patch: Partial<AppSettings>) => {
    apply(previous => ({
      ...previous,
      settings: { ...previous.settings, ...patch }
    }));
  };

  const notifications = useNotifications({
    ready,
    settings: state.settings,
    onSettingsChange: updateSettings,
    setNotice
  });
  const dataTransfer = useDataTransfer({
    state,
    today,
    setState,
    setNotice
  });

  const savePlan = (plan: Omit<Plan, 'id'>) => {
    const savedPlan: Plan = {
      ...plan,
      id: createId('plan'),
      dayTypes: plan.dayTypes.map(dayType => ({
        ...dayType,
        id: createId('day-type'),
        slots: dayType.slots.map(slot => ({ ...slot, id: createId('slot') }))
      }))
    };
    apply(
      previous => ({ ...previous, plans: [...previous.plans, savedPlan] }),
      'Nueva versión del plan guardada'
    );
    setModal(null);
  };

  const saveIntention = (intention: ImplementationIntention) => {
    apply(
      previous => ({
        ...previous,
        intentions: previous.intentions.map(item =>
          item.id === intention.id ? intention : item
        )
      }),
      'Plan actualizado'
    );
    setModal(null);
  };

  const saveLabs = (checkpoint: LabCheckpoint) => {
    apply(previous => {
      const exists = previous.labs.some(item => item.id === checkpoint.id);
      return {
        ...previous,
        labs: exists
          ? previous.labs.map(item =>
              item.id === checkpoint.id ? checkpoint : item
            )
          : [...previous.labs, checkpoint]
      };
    }, 'Checkpoint guardado');
    setModal(null);
  };

  const saveReflection = (note: string) => {
    const weekStart = weeklyStats.weekStart;
    apply(previous => {
      const reflection = {
        id: `reflection-${weekStart}`,
        weekStart,
        note,
        createdAt: new Date().toISOString()
      };
      return {
        ...previous,
        reflections: previous.reflections.some(
          item => item.weekStart === weekStart
        )
          ? previous.reflections.map(item =>
              item.weekStart === weekStart ? reflection : item
            )
          : [...previous.reflections, reflection]
      };
    }, 'Reflexión guardada');
  };

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return {
    ready,
    state,
    screen,
    setScreen,
    modal,
    setModal,
    notice,
    today,
    todayData,
    journeyStatus,
    journeyDay,
    weeklyStats,
    momentum,
    totalXp,
    level,
    logMovementBreak,
    logPartnerWalk,
    logWater,
    repeatRecentMeal,
    deleteMeal,
    togglePlanSlot,
    togglePlanSupplement,
    addMeal,
    addExercise,
    saveLabs,
    savePlan,
    saveIntention,
    ...dataTransfer,
    updateSettings,
    ...notifications,
    saveReflection,
    signOut,
    openMeal: () => setModal({ type: 'meal' }),
    openExercise: (preset?: { activity: ExerciseType; duration: number }) =>
      setModal({ type: 'exercise', preset }),
    openLabs: (checkpoint?: LabCheckpoint) =>
      setModal({ type: 'labs', checkpoint }),
    openPlanEntry: () => setModal({ type: 'plan-entry' }),
    openIntention: (intention: ImplementationIntention) =>
      setModal({ type: 'intention', intention })
  };
}
