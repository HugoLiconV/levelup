'use client';

import type { IconName } from '../components/Icons';
import type { ExerciseType, MealType } from '../lib/levelup';

export type Screen = 'today' | 'food' | 'move' | 'progress' | 'more';
export type NotificationPermissionState =
  | NotificationPermission
  | 'unsupported';

export type ModalState =
  | null
  | { type: 'meal'; meal?: import('../lib/levelup').Meal }
  | { type: 'exercise'; preset?: { activity: ExerciseType; duration: number } }
  | { type: 'labs'; checkpoint?: import('../lib/levelup').LabCheckpoint }
  | { type: 'plan-entry' }
  | {
      type: 'intention';
      intention: import('../lib/levelup').ImplementationIntention;
    };

export const navItems: Array<{ id: Screen; label: string; icon: IconName }> = [
  { id: 'today', label: 'Hoy', icon: 'home' },
  { id: 'food', label: 'Comida', icon: 'utensils' },
  { id: 'move', label: 'Mover', icon: 'footprints' },
  { id: 'progress', label: 'Progreso', icon: 'chart' },
  { id: 'more', label: 'Más', icon: 'more' }
];

export const mealTypes: MealType[] = ['Desayuno', 'Comida', 'Cena', 'Snack'];

export function defaultMealTypeForHour(hour: number): MealType {
  if (hour >= 5 && hour < 11) return 'Desayuno';
  if (hour >= 11 && hour < 17) return 'Comida';
  if (hour >= 17 && hour < 22) return 'Cena';
  return 'Snack';
}

export const exerciseTypes: Array<{
  id: ExerciseType;
  label: string;
  icon: IconName;
}> = [
  { id: 'Caminata', label: 'Caminata', icon: 'walk' },
  { id: 'Gimnasio', label: 'Gimnasio', icon: 'gym' },
  { id: 'Fuerza', label: 'Fuerza', icon: 'dumbbell' },
  { id: 'Correr', label: 'Correr', icon: 'run' },
  { id: 'Ciclismo', label: 'Ciclismo', icon: 'bike' },
  { id: 'Otro', label: 'Otro', icon: 'other' }
];

export function classNames(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(' ');
}

export function formatMetric(value: number | null): string {
  if (value === null) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function formatChange(value: number | null): string {
  if (value === null) return 'Sin comparar';
  return `${value > 0 ? '+' : ''}${value.toFixed(value % 1 === 0 ? 0 : 2)}`;
}

export function getDaysUntilAppointment(
  today: string,
  appointmentDate: string
): number {
  const current = new Date(`${today}T12:00:00`);
  const appointment = new Date(`${appointmentDate}T12:00:00`);
  return Math.max(
    0,
    Math.round(
      (appointment.getTime() - current.getTime()) / (24 * 60 * 60 * 1000)
    )
  );
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export function getRequestedScreen(): Screen {
  const requestedScreen = new URLSearchParams(window.location.search).get(
    'screen'
  );
  return navItems.some(item => item.id === requestedScreen)
    ? (requestedScreen as Screen)
    : 'today';
}
