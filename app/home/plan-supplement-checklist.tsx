'use client';

import type { PlanSupplement } from '../lib/levelup';
import { classNames } from './shared';

export function PlanSupplementChecklist({
  planId,
  supplements,
  completedNames,
  onToggle
}: {
  planId: string;
  supplements: PlanSupplement[];
  completedNames: Set<string>;
  onToggle: (supplement: PlanSupplement) => void;
}) {
  if (supplements.length === 0) return null;

  return (
    <section className="plan-supplement-checklist" aria-label="Suplementos de hoy">
      <header className="plan-slot-heading">
        <div>
          <p className="eyebrow">SUPLEMENTOS DE HOY</p>
          <h2>Uno por uno</h2>
        </div>
        <span>{completedNames.size} / {supplements.length}</span>
      </header>
      <div className="plan-supplement-checklist-list">
        {supplements.map(supplement => {
          const checked = completedNames.has(supplement.name);
          return (
            <label
              key={`${planId}-${supplement.name}`}
              className={classNames('plan-supplement-check-row', checked && 'is-complete')}
              >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(supplement)}
                aria-label={`Registrar ${supplement.name}`}
              />
              <span className="plan-slot-copy">
                <strong>{supplement.name}</strong>
                <small>{supplement.doseText}</small>
              </span>
              <small>{checked ? 'Registrado' : 'Toca para registrar'}</small>
            </label>
          );
        })}
      </div>
    </section>
  );
}
