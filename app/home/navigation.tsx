'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode
} from 'react';
import { Icon } from '../components/Icons';
import { classNames, navItems, type Screen } from './shared';

export function MainTabBar({
  screen,
  onNavigate
}: {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
}) {
  return (
    <nav
      className="navigation-surface bottom-nav"
      aria-label="Navegación principal">
      {navItems.map(item => (
        <button
          type="button"
          key={item.id}
          className={classNames(screen === item.id && 'active')}
          onClick={() => onNavigate(item.id)}
          aria-current={screen === item.id ? 'page' : undefined}>
          <Icon name={item.icon} size={21} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

export function FlowTopBar({
  title,
  onExit
}: {
  title: string;
  onExit: () => void;
}) {
  return (
    <header className="navigation-surface flow-top-bar">
      <span aria-hidden="true" />
      <strong>{title}</strong>
      <button type="button" onClick={onExit} aria-label={`Salir de ${title}`}>
        <Icon name="close" size={18} />
      </button>
    </header>
  );
}

export function FlowActionBar({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={classNames('navigation-surface', 'flow-action-bar', className)}>
      {children}
    </div>
  );
}

export function ConfirmFlowExitDialog({
  onContinue,
  onDiscard
}: {
  onContinue: () => void;
  onDiscard: () => void;
}) {
  const continueButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    continueButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onContinue();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onContinue]);

  return (
    <div
      className="flow-exit-backdrop"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onContinue();
      }}>
      <div
        className="flow-exit-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="flow-exit-title"
        aria-describedby="flow-exit-description">
        <span className="flow-exit-icon" aria-hidden="true">
          <Icon name="info" size={20} />
        </span>
        <h2 id="flow-exit-title">¿Salir sin guardar?</h2>
        <p id="flow-exit-description">
          El texto y los cambios de este borrador se perderán.
        </p>
        <button
          ref={continueButtonRef}
          type="button"
          className="primary-button"
          onClick={onContinue}>
          Continuar editando
        </button>
        <button
          type="button"
          className="flow-discard-button"
          onClick={onDiscard}>
          Salir y descartar
        </button>
      </div>
    </div>
  );
}

export function useMainTabNavigation(
  screen: Screen,
  setScreen: (screen: Screen) => void
) {
  const mainRef = useRef<HTMLElement>(null);
  const positionsRef = useRef<Record<Screen, number>>({
    today: 0,
    food: 0,
    move: 0,
    progress: 0,
    more: 0
  });

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      mainRef.current?.scrollTo({
        top: positionsRef.current[screen],
        behavior: 'auto'
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [screen]);

  const navigate = useCallback((nextScreen: Screen) => {
    const main = mainRef.current;
    if (nextScreen === screen) {
      const reduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      main?.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      positionsRef.current[screen] = 0;
      return;
    }

    if (main) positionsRef.current[screen] = main.scrollTop;
    const url = new URL(window.location.href);
    url.searchParams.set('screen', nextScreen);
    window.history.replaceState(
      window.history.state,
      '',
      `${url.pathname}${url.search}${url.hash}`
    );
    setScreen(nextScreen);
  }, [screen, setScreen]);

  return { mainRef, navigate };
}
