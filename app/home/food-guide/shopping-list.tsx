'use client';

import { Icon } from '../../components/Icons';
import {
  getWeeklyShoppingList,
  type Plan,
  type ShoppingListItem,
  type UnquantifiedShoppingListItem
} from '../../lib/levelup';

interface ShoppingRow {
  key: string;
  name: string;
  quantity: string;
  detail?: string;
}

export function WeeklyShoppingList({
  plan,
  weekStart,
  bought,
  onToggle,
  onClear,
  onPlanEntry
}: {
  plan: Plan | null;
  weekStart: string;
  bought: Record<string, boolean>;
  onToggle: (key: string) => void;
  onClear: () => void;
  onPlanEntry: () => void;
}) {
  if (!plan) return <NoActivePlan onPlanEntry={onPlanEntry} />;

  const list = getWeeklyShoppingList(plan, weekStart);
  const rows = buildShoppingRows(list.items, list.unquantified);
  if (rows.length === 0) return <NoShoppingItems onPlanEntry={onPlanEntry} />;

  const boughtCount = rows.filter(row => bought[row.key]).length;
  const percent = Math.round((boughtCount / rows.length) * 100);
  const ordered = [...rows].sort(
    (first, second) => Number(Boolean(bought[first.key])) - Number(Boolean(bought[second.key]))
  );

  const clearChecks = () => {
    if (window.confirm('¿Empezar una lista nueva? Se desmarcarán todos los artículos.')) onClear();
  };

  return (
    <section className="shopping-list" aria-label="Lista de compras semanal">
      <header className="shopping-list-header">
        <div>
          <p className="eyebrow">SEMANA ACTUAL</p>
          <h2>Lista de compras</h2>
          <p>Calculada a partir de tu plan activo.</p>
        </div>
        <strong>{boughtCount}/{rows.length}</strong>
      </header>
      <div className="shopping-progress" aria-label={`${percent}% comprado`}>
        <i style={{ width: `${percent}%` }} />
      </div>
      <div className="shopping-checklist">
        {ordered.map(row => (
          <label key={row.key} className={bought[row.key] ? 'shopping-check-row is-bought' : 'shopping-check-row'}>
            <input type="checkbox" checked={Boolean(bought[row.key])} onChange={() => onToggle(row.key)} />
            <span className="shopping-checkmark"><Icon name="check" size={14} /></span>
            <span className="shopping-item-copy">
              <strong>{row.name}</strong>
              {row.detail && <small>Para {row.detail}</small>}
            </span>
            <b>{row.quantity}</b>
          </label>
        ))}
      </div>
      <button className="shopping-reset" type="button" onClick={clearChecks} disabled={boughtCount === 0}>
        <Icon name="refresh" size={14} /> Empezar una lista nueva
      </button>
    </section>
  );
}

function buildShoppingRows(
  measured: ShoppingListItem[],
  unquantified: UnquantifiedShoppingListItem[]
): ShoppingRow[] {
  const occurrenceCount = new Map<string, number>();
  return [
    ...measured.map(item => ({
      key: `${item.name.toLocaleLowerCase('es-MX')}|${item.unit}`,
      name: item.name,
      quantity: `${item.amount.toLocaleString('es-MX')} ${item.unit}`
    })),
    ...unquantified.map(item => {
      const baseKey = [
        item.name.toLocaleLowerCase('es-MX'),
        item.quantityText.toLocaleLowerCase('es-MX'),
        item.dayTypeId,
        item.slotId,
        item.dishName.toLocaleLowerCase('es-MX')
      ].join('|');
      const occurrence = (occurrenceCount.get(baseKey) ?? 0) + 1;
      occurrenceCount.set(baseKey, occurrence);
      return {
        key: `${baseKey}|${occurrence}`,
        name: item.name,
        quantity: item.quantityText || 'Cantidad por definir',
        detail: item.dishName
      };
    })
  ];
}

function NoActivePlan({ onPlanEntry }: { onPlanEntry: () => void }) {
  return (
    <section className="shopping-empty-state">
      <span><Icon name="meal" size={25} /></span>
      <p className="eyebrow">LISTA DE COMPRAS</p>
      <h2>Primero agrega tu menú</h2>
      <p>Cuando tengas un plan activo, calcularemos automáticamente lo que necesitas comprar cada semana.</p>
      <button className="primary-button" type="button" onClick={onPlanEntry}>
        <Icon name="plus" size={16} /> Agregar un plan
      </button>
    </section>
  );
}

function NoShoppingItems({ onPlanEntry }: { onPlanEntry: () => void }) {
  return (
    <section className="shopping-empty-state">
      <span><Icon name="info" size={25} /></span>
      <p className="eyebrow">LISTA DE COMPRAS</p>
      <h2>Este plan no tiene ingredientes</h2>
      <p>Las comidas del plan activo todavía no incluyen cantidades que podamos convertir en una lista.</p>
      <button className="secondary-button" type="button" onClick={onPlanEntry}>Agregar otro plan</button>
    </section>
  );
}
