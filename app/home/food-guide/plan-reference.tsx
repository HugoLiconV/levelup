import { Icon } from '../../components/Icons';
import { formatLongDate, type Plan, type PlanReference, type PlanSupplement } from '../../lib/levelup';

export function PlanHeader({ plan, onPlanEntry }: { plan: Plan; onPlanEntry: () => void }) {
  return (
    <header className="meal-plan-head">
      <div>
        <p className="eyebrow">PLAN ACTIVO · DESDE {formatLongDate(plan.startDate)}</p>
        <h2>Plan de tu nutriólogo</h2>
      </div>
      <button className="secondary-button" type="button" onClick={onPlanEntry}>
        <Icon name="sparkles" size={15} /> Interpretar otro menú con IA
      </button>
    </header>
  );
}

export function ReferenceList({ references }: { references: PlanReference[] }) {
  if (references.length === 0) return null;

  return (
    <div className="meal-references" aria-label="Indicaciones de referencia">
      {references.map((reference, index) => (
        <p key={`${reference.label}-${reference.text}-${index}`}>
          <Icon name="droplet" size={13} />
          <span><strong>{reference.label}</strong> · {reference.text}</span>
        </p>
      ))}
    </div>
  );
}

export function SupplementSection({ supplements }: { supplements: PlanSupplement[] }) {
  if (supplements.length === 0) return null;

  return (
    <section className="meal-supplements">
      <header>
        <span><Icon name="sun" size={17} /></span>
        <div><p className="eyebrow">REFERENCIA DIARIA</p><h3>Suplementos</h3></div>
      </header>
      <div>
        {supplements.map((supplement, index) => (
          <p key={`${supplement.name}-${index}`}>
            <strong>{supplement.name}</strong>
            <span>{supplement.doseText}</span>
          </p>
        ))}
      </div>
    </section>
  );
}
