import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { DayType, Plan, Weekday } from '../../lib/levelup';
import { classNames } from '../shared';
import { WEEK, menuNumber } from './utils';

export function WeekMenuNavigation({
  plan,
  todayWeekday,
  selectedWeekday,
  onSelect
}: {
  plan: Plan;
  todayWeekday: Weekday;
  selectedWeekday: Weekday;
  onSelect: (dayType: DayType, weekday: Weekday) => void;
}) {
  return (
    <nav className="week-menu-nav" aria-label="Elegir día de la semana" role="tablist">
      {WEEK.map(day => {
        const dayType = plan.dayTypes.find(candidate => candidate.weekdays.includes(day.value));
        const isSelected = day.value === selectedWeekday;
        const isToday = day.value === todayWeekday;

        return (
          <button
            key={day.value}
            id={`meal-plan-day-${day.value}`}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-controls="active-day-menu"
            aria-label={`${day.long}${isToday ? ', hoy' : ''}`}
            tabIndex={isSelected ? 0 : -1}
            disabled={!dayType}
            onKeyDown={handleTabKeyDown}
            className={classNames(isSelected && 'is-selected', isToday && 'is-today')}
            onClick={() => dayType && onSelect(dayType, day.value)}>
            <span>{day.short}</span>
            <small>{isToday ? 'Hoy' : menuNumber(plan, dayType)}</small>
          </button>
        );
      })}
    </nav>
  );
}

function handleTabKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;

  const tablist = event.currentTarget.closest('[role="tablist"]');
  if (!tablist) return;

  const tabs = Array.from(
    tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)')
  );
  const currentIndex = tabs.indexOf(event.currentTarget);
  if (currentIndex < 0) return;

  event.preventDefault();
  const nextIndex = event.key === 'Home'
    ? 0
    : event.key === 'End'
      ? tabs.length - 1
      : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;

  tabs[nextIndex]?.focus();
  tabs[nextIndex]?.click();
}
