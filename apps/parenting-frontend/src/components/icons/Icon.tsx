import { clsx } from 'clsx';
import type { ImgHTMLAttributes } from 'react';

import { iconUrls, type IconName } from './iconMap';

export type { IconName };

export type IconProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  name: IconName;
};

export const Icon = ({ name, className, alt = '', ...props }: IconProps) => {
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
