import React from 'react';

export interface StatCardProps {
  emoji: string;
  value: string;
  label: string;
}

export function StatCard({ emoji, value, label }: StatCardProps) {
  return (
    <div className="flex-1 bg-hub-card border border-hub-border rounded-2xl px-4 py-3 flex items-center gap-2">
      <span className="text-2xl">{emoji}</span>
      <div>
        <p className="text-hub-text font-bold text-lg leading-tight">{value}</p>
        <p className="text-hub-muted text-xs">{label}</p>
      </div>
    </div>
  );
}
