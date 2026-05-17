import clsx from 'clsx';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

export type ActionLinkProps = {
  to?: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
};

export const ActionLink = ({
  to,
  onClick,
  children,
  className,
  disabled,
  type = 'button',
}: ActionLinkProps) => {
  const cls = clsx('duo-action-link', disabled && 'pointer-events-none opacity-50', className);

  if (to) {
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
};
