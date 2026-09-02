import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  Ref,
  ReactNode,
} from 'react';

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export type ButtonVariant = 'primary' | 'secondary' | 'text';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant = 'primary',
  fullWidth = false,
  className,
  ...props
}: ButtonProps) {
  const variantClass = {
    primary: 'primary-button',
    secondary: 'secondary-button',
    text: 'text-button',
  }[variant];

  return (
    <button
      {...props}
      className={classNames(variantClass, fullWidth && 'full-button', className)}
    />
  );
}

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'> {
  label: string;
  children: ReactNode;
}

export function IconButton({ label, className, children, type, ...props }: IconButtonProps) {
  return (
    <button
      {...props}
      type={type ?? 'button'}
      className={classNames('icon-button', className)}
      aria-label={label}
    >
      {children}
    </button>
  );
}

export interface FieldProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  hintId?: string;
  error?: ReactNode;
  errorId?: string;
  required?: boolean;
  children: ReactNode;
}

export function Field({
  label,
  htmlFor,
  hint,
  hintId,
  error,
  errorId,
  required = false,
  children,
  className,
  ...props
}: FieldProps) {
  return (
    <div {...props} className={classNames('field', className)}>
      <label htmlFor={htmlFor}>
        {label}
        {required && <small>(requerido)</small>}
      </label>
      {children}
      {hint && (
        <small id={hintId} className="field-hint">
          {hint}
        </small>
      )}
      {error && (
        <span id={errorId} className="field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

type SurfaceElement = 'div' | 'section' | 'article';

export interface SurfaceProps extends HTMLAttributes<HTMLElement> {
  as?: SurfaceElement;
  tone?: 'default' | 'soft';
  children: ReactNode;
}

export function Surface({
  as: Element = 'div',
  tone = 'default',
  className,
  children,
  ...props
}: SurfaceProps) {
  return (
    <Element
      {...props}
      className={classNames('ui-surface', tone === 'soft' && 'ui-surface-soft', className)}
    >
      {children}
    </Element>
  );
}

export const Card = Surface;

export type BadgeVariant = 'mint' | 'coral' | 'gold' | 'neutral';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

export function Badge({ variant = 'mint', className, children, ...props }: BadgeProps) {
  return (
    <span {...props} className={classNames('ui-badge', `ui-badge-${variant}`, className)}>
      {children}
    </span>
  );
}

export type BannerVariant = 'success' | 'warning' | 'error' | 'neutral';

export interface BannerProps extends HTMLAttributes<HTMLDivElement> {
  variant?: BannerVariant;
  children: ReactNode;
}

export function Banner({ variant = 'neutral', className, children, ...props }: BannerProps) {
  return (
    <div
      {...props}
      className={classNames('ui-banner', `ui-banner-${variant}`, className)}
    >
      {children}
    </div>
  );
}

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  icon?: ReactNode;
}

export function Toast({ children, icon, className, role = 'status', ...props }: ToastProps) {
  return (
    <div {...props} role={role} className={classNames('toast', className)}>
      {icon && <span className="toast-icon">{icon}</span>}
      {children}
    </div>
  );
}
