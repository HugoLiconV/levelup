import type { DayType, PlanDish, PlanSlot, Weekday } from '../../lib/levelup';
import { ReferenceList } from './plan-reference';
import { WEEK, weekdaySummary } from './utils';

export function DayMenu({ dayType, weekday }: { dayType: DayType; weekday: Weekday }) {
  const dayLabel = WEEK.find(day => day.value === weekday)?.long ?? 'Menú';

  return (
    <section
      className="day-menu-sheet"
      id="active-day-menu"
      role="tabpanel"
      aria-labelledby={`meal-plan-day-${weekday}`}>
      <MenuHeading dayType={dayType} dayLabel={dayLabel} />
      <ReferenceList references={dayType.references} />
      <div className="day-menu-meals">
        {dayType.slots.map((slot, index) => (
          <MealSlot key={slot.id} slot={slot} index={index} />
        ))}
      </div>
    </section>
  );
}

function MenuHeading({ dayType, dayLabel }: { dayType: DayType; dayLabel: string }) {
  return (
    <header className="day-menu-heading">
      <div>
        <p className="eyebrow">{dayLabel}</p>
        <h2>{dayType.name}</h2>
        <span>{weekdaySummary(dayType)}</span>
      </div>
      <span>{dayType.slots.length}<small>comidas</small></span>
    </header>
  );
}

function MealSlot({ slot, index }: { slot: PlanSlot; index: number }) {
  return (
    <article className="meal-slot">
      <header>
        <span>{String(index + 1).padStart(2, '0')}</span>
        <h3>{slot.name}</h3>
      </header>
      <div>
        {slot.dishes.map((dish, dishIndex) => (
          <section key={`${dish.name}-${dishIndex}`} className="meal-dish">
            <h4>{dish.name}</h4>
            <IngredientRows dish={dish} />
          </section>
        ))}
      </div>
    </article>
  );
}

function IngredientRows({ dish }: { dish: PlanDish }) {
  if (dish.ingredients.length === 0) {
    return <p className="no-measurement">Sin ingredientes detallados</p>;
  }

  return (
    <dl className="ingredient-rows">
      {dish.ingredients.map((ingredient, index) => (
        <div key={`${ingredient.name}-${index}`}>
          <dt>{ingredient.name}</dt>
          <dd>{ingredient.quantityText || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
