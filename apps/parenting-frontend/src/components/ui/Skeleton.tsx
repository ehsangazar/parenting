import { clsx } from 'clsx';

export type SkeletonVariant = 'card' | 'text' | 'circle' | 'rect';

export type SkeletonProps = {
  variant: SkeletonVariant;
  width?: string;
  height?: string;
  className?: string;
};

export const Skeleton = ({ variant, width, height, className }: SkeletonProps) => {
  const style = { width, height };

  if (variant === 'card') {
    return (
      <div
        className={clsx('animate-shimmer rounded-2xl border border-border bg-surface-light p-5', className)}
        style={style}
      >
        <div className="mb-3 h-10 w-10 rounded-xl bg-surface" />
        <div className="mb-2 h-3 w-20 rounded bg-surface" />
        <div className="h-6 w-16 rounded bg-surface" />
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div
        className={clsx('animate-shimmer h-3 rounded bg-surface-light', className)}
        style={style ?? { width: '100%', maxWidth: '12rem' }}
      />
    );
  }

  if (variant === 'circle') {
    return (
      <div
        className={clsx('animate-shimmer rounded-full bg-surface-light', className)}
        style={style ?? { width: '2.5rem', height: '2.5rem' }}
      />
    );
  }

  return (
    <div
      className={clsx('animate-shimmer rounded-lg bg-surface-light', className)}
      style={style ?? { width: '100%', height: '4rem' }}
    />
  );
};
