import clsx from 'clsx';
import type { InputHTMLAttributes } from 'react';

import { ActionLink } from './ActionLink.js';

export type DuoInputProps = {
  label?: string;
  trailingAction?: { label: string; onClick: () => void };
  /** Container only — input still gets global styles from index.css */
  className?: string;
} & InputHTMLAttributes<HTMLInputElement>;

export const DuoInput = ({
  label,
  trailingAction,
  className,
  id: idProp,
  ...inputProps
}: DuoInputProps) => {
  const id = idProp ?? (label ? `duo-input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

  return (
    <div className={clsx('w-full', className)}>
      {label && (
        <div className="mb-2 flex items-center justify-between gap-2">
          <label htmlFor={id} className="block text-sm font-medium text-text-primary">
            {label}
          </label>
          {trailingAction && (
            <ActionLink type="button" onClick={trailingAction.onClick} className="!text-[12px]">
              {trailingAction.label}
            </ActionLink>
          )}
        </div>
      )}
      {!label && trailingAction && (
        <div className="mb-2 flex justify-end">
          <ActionLink type="button" onClick={trailingAction.onClick} className="!text-[12px]">
            {trailingAction.label}
          </ActionLink>
        </div>
      )}
      <input id={id} className="w-full px-4" {...inputProps} />
    </div>
  );
};
