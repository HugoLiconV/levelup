import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Icon } from '../Icons';
import { Badge, BottomNav, Button, Field, IconButton, Modal } from './index';

describe('shared UI primitives', () => {
  it('renders button variants, full width, and disabled state', () => {
    render(
      <>
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="text" fullWidth disabled>
          Text
        </Button>
      </>
    );

    expect(screen.getByRole('button', { name: 'Primary' }).className).toContain('primary-button');
    expect(screen.getByRole('button', { name: 'Secondary' }).className).toContain('secondary-button');
    const textButton = screen.getByRole('button', { name: 'Text' }) as HTMLButtonElement;
    expect(textButton.className).toContain('text-button');
    expect(textButton.className).toContain('full-button');
    expect(textButton.disabled).toBe(true);
  });

  it('requires and exposes an accessible icon-button label', () => {
    render(
      <IconButton label="Cerrar">
        <Icon name="close" />
      </IconButton>
    );

    const closeButton = screen.getByRole('button', { name: 'Cerrar' });
    expect(closeButton.className).toContain('icon-button');
    expect(closeButton.getAttribute('type')).toBe('button');
  });

  it('renders field hints and errors in the shared field structure', () => {
    render(
      <Field
        label="Correo"
        htmlFor="email"
        hint="Usa el correo de tu cuenta."
        hintId="email-hint"
        error="Correo no válido."
        errorId="email-error"
      >
        <input id="email" aria-describedby="email-hint email-error" />
      </Field>
    );

    expect(screen.getByLabelText('Correo')).toBeTruthy();
    expect(screen.getByText('Usa el correo de tu cuenta.').getAttribute('id')).toBe('email-hint');
    expect(screen.getByRole('alert').textContent).toContain('Correo no válido.');
  });

  it('provides modal semantics and closes on Escape and backdrop click', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal title="Prueba" onClose={onClose}>
        <p>Contenido</p>
      </Modal>
    );

    expect(screen.getByRole('dialog', { name: 'Prueba' }).getAttribute('aria-modal')).toBe('true');
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.mouseDown(container.querySelector('.modal-backdrop')!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('marks the active bottom navigation item with aria-current', () => {
    const onChange = vi.fn();
    render(
      <BottomNav
        items={[
          { id: 'today', label: 'Hoy', icon: 'home' },
          { id: 'food', label: 'Comida', icon: 'utensils' },
        ]}
        activeId="today"
        onChange={onChange}
      />
    );

    expect(screen.getByRole('button', { name: 'Hoy' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: 'Comida' }).getAttribute('aria-current')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Comida' }));
    expect(onChange).toHaveBeenCalledWith('food');
  });

  it('supports documented badge variants', () => {
    render(<Badge variant="gold">Opcional</Badge>);
    expect(screen.getByText('Opcional').className).toContain('ui-badge');
    expect(screen.getByText('Opcional').className).toContain('ui-badge-gold');
  });
});
