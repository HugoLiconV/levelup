'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from '../Icons';
import { IconButton } from './primitives';

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export interface ModalProps {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}

export function Modal({ title, eyebrow, children, onClose, className }: ModalProps) {
  const [viewportRect, setViewportRect] = useState<{
    height: number;
    top: number;
  } | null>(null);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const updateViewportRect = () =>
      setViewportRect({
        height: Math.round(viewport.height),
        top: Math.round(viewport.offsetTop),
      });
    updateViewportRect();
    viewport.addEventListener('resize', updateViewportRect);
    viewport.addEventListener('scroll', updateViewportRect);
    return () => {
      viewport.removeEventListener('resize', updateViewportRect);
      viewport.removeEventListener('scroll', updateViewportRect);
    };
  }, []);

  const backdropStyle = viewportRect
    ? { height: `${viewportRect.height}px`, top: `${viewportRect.top}px` }
    : undefined;
  const panelStyle = viewportRect
    ? { maxHeight: `${Math.max(0, viewportRect.height - 28)}px` }
    : undefined;

  return (
    <div
      className="modal-backdrop"
      style={backdropStyle}
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={classNames('modal-panel', className)}
        style={panelStyle}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-header">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2>{title}</h2>
          </div>
          <IconButton label="Cerrar" onClick={onClose}>
            <Icon name="close" size={19} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}
