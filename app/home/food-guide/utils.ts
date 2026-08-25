import type { DayType, Plan, Weekday } from '../../lib/levelup';

export const WEEK: { value: Weekday; short: string; long: string }[] = [
  { value: 1, short: 'L', long: 'Lunes' },
  { value: 2, short: 'M', long: 'Martes' },
  { value: 3, short: 'M', long: 'Miércoles' },
  { value: 4, short: 'J', long: 'Jueves' },
  { value: 5, short: 'V', long: 'Viernes' },
  { value: 6, short: 'S', long: 'Sábado' },
  { value: 0, short: 'D', long: 'Domingo' }
];

export function resolveSelectedPlanDay(
  plan: Plan,
  today: string,
  requestedDayTypeId: string | null,
  requestedWeekday: string | null
) {
  const todayWeekday = new Date(`${today}T12:00:00`).getDay() as Weekday;
  const parsedWeekday = requestedWeekday === null ? null : Number(requestedWeekday);
  const validRequestedWeekday = WEEK.some(day => day.value === parsedWeekday)
    ? parsedWeekday as Weekday
    : null;
  const requestedDayType = plan.dayTypes.find(dayType => dayType.id === requestedDayTypeId);
  const dayTypeForRequestedWeekday = validRequestedWeekday === null
    ? undefined
    : plan.dayTypes.find(dayType => dayType.weekdays.includes(validRequestedWeekday));
  const todayDayType = plan.dayTypes.find(dayType => dayType.weekdays.includes(todayWeekday));
  const dayType = dayTypeForRequestedWeekday ?? requestedDayType ?? todayDayType ?? plan.dayTypes[0];

  if (!dayType) return null;

  const weekday = validRequestedWeekday !== null && dayType.weekdays.includes(validRequestedWeekday)
    ? validRequestedWeekday
    : dayType.weekdays.includes(todayWeekday)
      ? todayWeekday
      : dayType.weekdays[0];

  if (weekday === undefined) return null;
  return { dayType, weekday, todayWeekday };
}

export function menuNumber(plan: Plan, dayType: DayType | undefined) {
  if (!dayType) return '—';
  return String(plan.dayTypes.findIndex(candidate => candidate.id === dayType.id) + 1);
}

export function weekdaySummary(dayType: DayType) {
  const labels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return dayType.weekdays.map(day => labels[day]).join(' · ');
}
