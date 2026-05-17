import clsx from 'clsx';
import type { ReactNode } from 'react';

export type BadgeVariant = 'count' | 'status' | 'super';

export type BadgeProps = {
  variant: BadgeVariant;
  children: ReactNode;
  color?: 'red' | 'yellow' | 'green' | 'blue' | 'purple';
  className?: string;
};

const statusBg: Record<NonNullable<BadgeProps['color']>, string> = {
  red: 'bg-brand-red text-white',
  yellow: 'bg-secondary-400 text-text-inverse',
  green: 'bg-primary-400 text-white',
  blue: 'bg-brand-blue text-white',
  purple: 'bg-brand-purple text-white',
};

export const Badge = ({ variant, children, color = 'red', className = '' }: BadgeProps) => {
  if (variant === 'super') {
    return (
      <span
        className={clsx(
          'inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-black italic uppercase tracking-wider text-white shadow-lg',
          className,
        )}
        style={{
          backgroundImage: 'linear-gradient(90deg, #be53f2, #4481eb)',
        }}
      >
        {children}
      </span>
    );
  }

  if (variant === 'count') {
    return (
      <span
        className={clsx(
          'absolute -right-1 -top-1 z-10 min-w-[1.5rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-black leading-none text-white shadow-md',
          statusBg[color],
          className,
        )}
      >
        {children}
      </span>
    );
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold',
        statusBg[color],
        className,
      )}
    >
      {children}
    </span>
  );
};
