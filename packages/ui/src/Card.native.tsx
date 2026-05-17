import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import type { CardProps } from './Card';

const paddingClass = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

export function Card({ children, onPress, className = '', padding = 'lg' }: CardProps) {
  const base = `bg-hub-card border border-hub-border rounded-2xl ${paddingClass[padding]} ${className}`;

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} className={base} activeOpacity={0.8}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View className={base}>{children}</View>;
}
