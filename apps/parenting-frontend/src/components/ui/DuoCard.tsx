import { clsx } from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

export type DuoCardVariant = 'default' | 'skill' | 'promo' | 'stat';

export type DuoCardProps = {
  variant?: DuoCardVariant;
  active?: boolean;
  locked?: boolean;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, 'onClick'>;

export const DuoCard = ({
  variant = 'default',
  active,
  locked,
  onClick,
  className,
  children,
  role,
  tabIndex,
  ...rest
}: DuoCardProps) => {
  if (variant === 'skill') {
    return (
      <div
        role={onClick ? 'button' : role}
        tabIndex={onClick ? 0 : tabIndex}
        onClick={onClick}
        onKeyDown={(e) => {
          if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick();
          }
        }}
        className={clsx(
          'duo-skill-card',
          active && 'active',
          locked && 'locked',
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    );
  }

  const base =
    variant === 'promo'
      ? 'rounded-2xl border-2 border-card-border bg-surface p-6 shadow-md transition-all duration-150 hover:-translate-y-px hover:shadow-lg overflow-y-auto'
      : variant === 'stat'
        ? 'rounded-2xl border-2 border-card-border bg-surface p-5 shadow-sm overflow-y-auto'
        : 'rounded-2xl border-2 border-card-border bg-surface p-5 shadow-sm transition-all duration-150 hover:-translate-y-px hover:shadow-md overflow-y-auto';

  return (
    <div
      role={onClick ? 'button' : role}
      tabIndex={onClick ? 0 : tabIndex}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={clsx(
        base,
        onClick && 'cursor-pointer',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
};
