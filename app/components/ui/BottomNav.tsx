'use client';

import type { HTMLAttributes } from 'react';
import { Icon, type IconName } from '../Icons';

export interface BottomNavItem {
  id: string;
  label: string;
  icon: IconName;
}

export interface BottomNavProps extends Omit<HTMLAttributes<HTMLElement>, 'onChange'> {
  items: readonly BottomNavItem[];
  activeId: string;
  onChange: (id: string) => void;
}

export function BottomNav({
  items,
  activeId,
  onChange,
  className,
  'aria-label': ariaLabel,
  ...props
}: BottomNavProps) {
  return (
    <nav
      {...props}
      className={['navigation-surface', 'bottom-nav', className].filter(Boolean).join(' ')}
      aria-label={ariaLabel ?? 'Navegación principal'}
    >
      {items.map(item => (
        <button
          type="button"
          key={item.id}
          className={activeId === item.id ? 'active' : undefined}
          onClick={() => onChange(item.id)}
          aria-current={activeId === item.id ? 'page' : undefined}
        >
          <Icon name={item.icon} size={21} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
