import { clsx } from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type DuoButtonVariant =
  | 'green'
  | 'blue'
  | 'sky'
  | 'gold'
  | 'outline'
  | 'ghost'
  | 'violet-pill'
  | 'surface-pill';

export type DuoButtonSize = 'default' | 'sm' | 'pill' | 'pill-lg';

export type DuoButtonProps = {
  variant: DuoButtonVariant;
  size?: DuoButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

function buttonClass(variant: DuoButtonVariant, size: DuoButtonSize): string {
  if (variant === 'violet-pill') return 'btn-duo-violet-pill';
  if (variant === 'surface-pill') return 'btn-duo-surface-pill';

  const baseByVariant: Record<Exclude<DuoButtonVariant, 'violet-pill' | 'surface-pill'>, string> = {
    green: 'btn-duo-green',
    blue: 'btn-duo-blue',
    sky: 'btn-duo-sky',
    gold: 'btn-duo-gold',
    outline: 'btn-duo-outline',
    ghost: 'btn-duo-ghost',
  };

  const key = baseByVariant[variant];

  if (size === 'default') return key;

  if (variant === 'green') {
    if (size === 'sm') return 'btn-duo-green-sm';
    if (size === 'pill') return 'btn-duo-green-pill';
    if (size === 'pill-lg') return 'btn-duo-green-pill-lg';
  }
  if (variant === 'blue') {
    if (size === 'sm') return 'btn-duo-blue-sm';
    if (size === 'pill')
      return clsx('btn-duo-blue', '!min-h-11 !rounded-full !px-5 !py-2 !text-sm inline-flex items-center justify-center gap-2');
    if (size === 'pill-lg')
      return clsx('btn-duo-blue', '!min-h-12 !rounded-full !px-7 !py-3 !text-sm inline-flex items-center justify-center gap-2');
  }
  if (variant === 'outline') {
    if (size === 'sm') return 'btn-duo-outline-sm';
    if (size === 'pill') return 'btn-duo-outline-pill';
    if (size === 'pill-lg') return 'btn-duo-outline-pill-lg';
  }
  if (variant === 'ghost') {
    if (size === 'sm') return 'btn-duo-ghost-sm';
  }
  if (variant === 'gold' || variant === 'sky' || variant === 'ghost') {
    if (size === 'pill')
      return clsx(key, '!min-h-11 !rounded-full !px-5 !py-2 !text-sm inline-flex items-center justify-center gap-2');
    if (size === 'pill-lg')
      return clsx(key, '!min-h-12 !rounded-full !px-7 !py-3 !text-sm inline-flex items-center justify-center gap-2');
    if (size === 'sm' && variant === 'gold')
      return clsx('btn-duo-gold', '!min-h-10 !rounded-xl !px-4 !py-2 !text-sm inline-flex items-center justify-center gap-2');
    if (size === 'sm' && variant === 'sky')
      return clsx('btn-duo-sky', '!min-h-10 !rounded-xl !px-4 !py-2 !text-sm inline-flex items-center justify-center gap-2');
  }

  return key;
}

export const DuoButton = ({
  variant,
  size = 'default',
  fullWidth,
  loading,
  disabled,
  children,
  className,
  type = 'button',
  ...rest
}: DuoButtonProps) => {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={clsx(buttonClass(variant, size), fullWidth && 'w-full', loading && 'gap-2', className)}
      {...rest}
    >
      {loading ? (
        <>
          <svg
            className="h-5 w-5 shrink-0 animate-spin text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
};
