import { cx } from '../utils/cx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * Button — the canonical button used across the overlay.
 *
 * Variants:
 *   primary   — indigo, used for the main CTA
 *   secondary — subtle surface, used for secondary actions
 *   ghost     — transparent, used for icon-only buttons in tight spaces
 *   danger    — red, used for destructive actions
 *
 * Sizes:
 *   sm (28px), md (36px), lg (44px)
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-wt-accent hover:bg-wt-accentHover text-white shadow-sm disabled:opacity-50',
  secondary:
    'bg-wt-surface2 hover:bg-wt-border text-wt-text border border-wt-border disabled:opacity-50',
  ghost: 'bg-transparent hover:bg-wt-surface2 text-wt-muted hover:text-wt-text',
  danger: 'bg-wt-danger/90 hover:bg-wt-danger text-white disabled:opacity-50',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1',
  md: 'h-9 px-3.5 text-sm gap-1.5',
  lg: 'h-11 px-5 text-sm gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wt-accent/60 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent',
        'disabled:cursor-not-allowed active:scale-[0.98]',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span
          className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
          aria-hidden
        />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  );
}
