import { clsx } from 'clsx';
import { Bell, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Loader2, Menu, Plus, Search, Settings, Share2, Trash2, Upload, X } from 'lucide-react';
import type { ComponentType, ImgHTMLAttributes, SVGProps } from 'react';

import { iconUrls, type IconName } from './iconMap';

export type { IconName };

const LUCIDE_ICONS = {
  'lu:bell': Bell,
  'lu:check': Check,
  'lu:chevron-down': ChevronDown,
  'lu:chevron-left': ChevronLeft,
  'lu:chevron-right': ChevronRight,
  'lu:chevron-up': ChevronUp,
  'lu:loader': Loader2,
  'lu:menu': Menu,
  'lu:plus': Plus,
  'lu:search': Search,
  'lu:settings': Settings,
  'lu:share': Share2,
  'lu:trash': Trash2,
  'lu:upload': Upload,
  'lu:x': X,
} as const satisfies Record<string, ComponentType<SVGProps<SVGSVGElement>>>;

export type LucideIconName = keyof typeof LUCIDE_ICONS;
export type AnyIconName = IconName | LucideIconName;

export type IconProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'name'> & {
  name: AnyIconName;
};

const isLucide = (name: AnyIconName): name is LucideIconName =>
  typeof name === 'string' && name.startsWith('lu:');

export const Icon = ({ name, className, alt = '', ...props }: IconProps) => {
  if (isLucide(name)) {
    const LucideComp = LUCIDE_ICONS[name];
    return (
      <LucideComp
        className={clsx('inline-block shrink-0', className)}
        aria-hidden={alt === '' ? true : undefined}
        aria-label={alt || undefined}
      />
    );
  }
  return (
    <img
      src={iconUrls[name]}
      alt={alt}
      className={clsx('inline-block shrink-0', className)}
      decoding="async"
      {...props}
    />
  );
};
