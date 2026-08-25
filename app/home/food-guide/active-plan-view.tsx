'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { DayType, Plan, Weekday } from '../../lib/levelup';
import { DayMenu } from './day-menu';
import { PlanHeader, SupplementSection } from './plan-reference';
import { resolveSelectedPlanDay } from './utils';
import { WeekMenuNavigation } from './week-menu-navigation';

export function ActivePlanView({
  plan,
  today,
  onPlanEntry
}: {
  plan: Plan;
  today: string;
  onPlanEntry: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selection = resolveSelectedPlanDay(
    plan,
    today,
    searchParams.get('planMenu'),
    searchParams.get('planDay')
  );

  const selectDay = useCallback((dayType: DayType, weekday: Weekday) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('planMenu', dayType.id);
    params.set('planDay', String(weekday));
    params.delete('menu');
    params.delete('slot');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  if (!selection) return null;

  return (
    <div className="food-guide active-meal-plan">
      <PlanHeader plan={plan} onPlanEntry={onPlanEntry} />
      <section className="weekly-meal-plan" aria-label="Menú semanal">
        <WeekMenuNavigation
          plan={plan}
          todayWeekday={selection.todayWeekday}
          selectedWeekday={selection.weekday}
          onSelect={selectDay}
        />
        <DayMenu dayType={selection.dayType} weekday={selection.weekday} />
      </section>
      <SupplementSection supplements={plan.supplements} />
    </div>
  );
}
