import { useState } from 'react';
import clsx from 'clsx';
import { DEFAULT_AVATAR_URL } from '../../lib/defaultAvatar.js';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

const frameClass: Record<AvatarSize, string> = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-16 w-16',
};

const textClass: Record<AvatarSize, string> = {
  xs: 'text-[10px]',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-2xl',
};

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';
}

export type AvatarProps = {
  src?: string | null;
  name: string;
  size?: AvatarSize;
  color?: string;
  className?: string;
  alt?: string;
  /** When `src` is missing: show default silhouette, or initials (e.g. login decorative letter). */
  emptyFallback?: 'default' | 'initials';
};

export const Avatar = ({
  src,
  name,
  size = 'md',
  color = '#C084FC',
  className,
  alt,
  emptyFallback = 'default',
}: AvatarProps) => {
  const initials = initialsFromName(name);
  const [loaded, setLoaded] = useState(false);

  if (src) {
    return (
      <div className={clsx('relative rounded-full shrink-0 border-2 border-border bg-surface-warm', frameClass[size], className)}>
        {!loaded && <div className="absolute inset-0 rounded-full animate-shimmer" />}
        <img
          src={src}
          alt={alt ?? name}
          onLoad={() => setLoaded(true)}
          className={clsx('rounded-full object-cover w-full h-full transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0')}
        />
      </div>
    );
  }

  if (emptyFallback === 'default') {
    return (
      <div className={clsx('relative rounded-full shrink-0 border-2 border-border bg-surface-warm', frameClass[size], className)}>
        {!loaded && <div className="absolute inset-0 rounded-full animate-shimmer" />}
        <img
          src={DEFAULT_AVATAR_URL}
          alt={alt ?? name}
          onLoad={() => setLoaded(true)}
          className={clsx('rounded-full object-cover w-full h-full transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0')}
        />
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'flex shrink-0 items-center justify-center rounded-full border-2 border-border font-bold text-white',
        frameClass[size],
        textClass[size],
        className,
      )}
      style={{ backgroundColor: color }}
      aria-hidden={!alt}
    >
      {initials}
    </div>
  );
};
