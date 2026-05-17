import React from 'react';

export interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  className?: string;
}

export function Screen({ children, scrollable = true, className = '' }: ScreenProps) {
  const base = `flex flex-col min-h-screen bg-hub ${className}`;

  if (scrollable) {
    return <main className={base}>{children}</main>;
  }
  return <main className={`${base} overflow-hidden`}>{children}</main>;
}

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
}

export function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  return (
    <div className="px-5 pt-4 pb-6">
      <h1 className="text-hub-text text-2xl font-bold">{title}</h1>
      {subtitle && <p className="text-hub-muted text-sm mt-0.5">{subtitle}</p>}
    </div>
  );
}
