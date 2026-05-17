import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import type { ButtonProps } from './Button';

const variantClass = {
  primary: 'bg-hub-accent',
  ghost: 'border border-hub-border',
  danger: 'bg-red-500',
};

const labelClass = {
  primary: 'text-white font-semibold',
  ghost: 'text-hub-muted font-semibold',
  danger: 'text-white font-semibold',
};

const sizeClass = {
  sm: 'px-3 py-2',
  md: 'px-5 py-3',
  lg: 'px-6 py-4',
};

const labelSizeClass = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-base',
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
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={[
        'rounded-xl items-center',
        variantClass[variant],
        sizeClass[size],
        fullWidth ? 'w-full' : '',
        disabled || loading ? 'opacity-50' : '',
      ].join(' ')}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? '#8fa4af' : '#fff'} />
      ) : (
        <Text className={[labelClass[variant], labelSizeClass[size]].join(' ')}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}
