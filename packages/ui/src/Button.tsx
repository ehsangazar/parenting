import React from 'react';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const variantClass = {
  primary: 'bg-hub-accent hover:bg-hub-accent-dim text-white',
  ghost: 'border border-hub-border text-hub-muted hover:text-hub-text',
  danger: 'bg-red-500 hover:bg-red-600 text-white',
};

const sizeClass = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-3 text-base',
  lg: 'px-6 py-4 text-base',
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
  size = 'md',
}: ButtonProps) {
  return (
    <button
      onClick={onPress}
      disabled={disabled || loading}
      className={[
        'rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        variantClass[variant],
        sizeClass[size],
        fullWidth ? 'w-full' : '',
      ].join(' ')}
    >
      {loading ? '...' : label}
    </button>
  );
}
