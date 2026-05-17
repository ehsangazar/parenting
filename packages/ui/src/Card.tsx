import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

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
      <button onClick={onPress} className={`${base} w-full text-left cursor-pointer hover:border-hub-muted transition-colors`}>
        {children}
      </button>
    );
  }
  return <div className={base}>{children}</div>;
}
