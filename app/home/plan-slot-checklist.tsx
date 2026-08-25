'use client';

import { Icon } from '../components/Icons';
import type { DayType, PlanSlot } from '../lib/levelup';
import { classNames } from './shared';

function getSlotDescription(slot: PlanSlot) {
  return slot.dishes.map(dish => dish.name).join(' · ');
}

export function PlanSlotChecklist({
  dayType,
  completedSlotIds,
  onToggle,
  onOpenMeal
}: {
  dayType: DayType;
  completedSlotIds: Set<string>;
  onToggle: (slot: PlanSlot) => void;
  onOpenMeal: () => void;
}) {
  return (
    <section className="plan-slot-checklist" aria-label="Plan de comidas de hoy">
      <header className="plan-slot-heading">
        <div>
          <p className="eyebrow">TU PLAN DE HOY</p>
          <h2>{dayType.name}</h2>
        </div>
        <span>{completedSlotIds.size} / {dayType.slots.length}</span>
      </header>
      <div className="plan-slot-list">
        {dayType.slots.map(slot => {
          const checked = completedSlotIds.has(slot.id);
          return (
            <button
              type="button"
              key={slot.id}
              className={classNames('plan-slot-row', checked && 'is-complete')}
              onClick={() => onToggle(slot)}
              aria-pressed={checked}>
              <span className={classNames('plan-slot-check', checked && 'is-checked')}>
                {checked && <Icon name="check" size={16} />}
              </span>
              <span className="plan-slot-copy">
                <strong>{slot.name}</strong>
                <small>{getSlotDescription(slot)}</small>
              </span>
              <small>{checked ? 'Registrada' : 'Toca para registrar'}</small>
            </button>
          );
        })}
      </div>
      <button type="button" className="plan-slot-freeform" onClick={onOpenMeal}>
        <Icon name="plus" size={15} />
        <span>Registrar algo diferente</span>
        <Icon name="arrow" size={14} />
      </button>
    </section>
  );
}
