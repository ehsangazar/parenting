import type { ButtonHTMLAttributes, ReactNode } from 'react';
import {
  RoughButton,
  type RoughButtonSize,
  type RoughButtonVariant,
} from '../rough/index.js';

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

const VARIANT_MAP: Record<DuoButtonVariant, RoughButtonVariant> = {
  green: 'sage',
  blue: 'blue',
  sky: 'sky',
  gold: 'gold',
  outline: 'outline',
  ghost: 'ghost',
  'violet-pill': 'violet-pill',
  'surface-pill': 'surface-pill',
};

const SIZE_MAP: Record<DuoButtonSize, RoughButtonSize> = {
  default: 'default',
  sm: 'sm',
  pill: 'pill',
  'pill-lg': 'pill-lg',
};

export const DuoButton = ({ variant, size = 'default', ...rest }: DuoButtonProps) => (
  <RoughButton variant={VARIANT_MAP[variant]} size={SIZE_MAP[size]} {...rest} />
);
