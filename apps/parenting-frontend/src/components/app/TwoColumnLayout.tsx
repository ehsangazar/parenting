import clsx from 'clsx';
import type { ReactNode } from 'react';

export type TwoColumnLayoutProps = {
  children: ReactNode;
  sidebar?: ReactNode;
  className?: string;
};

/**
 * Desktop: main column + sticky right sidebar. Mobile: stacked (sidebar after main).
 */
export const TwoColumnLayout = ({ children, sidebar, className }: TwoColumnLayoutProps) => {
  if (!sidebar) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={clsx('flex w-full flex-col gap-6 lg:flex-row lg:items-start lg:gap-8', className)}>
      <div className="min-w-0 flex-1 lg:max-w-2xl">{children}</div>
      <aside className="w-full shrink-0 space-y-4 lg:sticky lg:top-4 lg:w-[320px] lg:self-start">
        {sidebar}
      </aside>
    </div>
  );
};
