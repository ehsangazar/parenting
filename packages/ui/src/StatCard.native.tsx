import React from 'react';
import { View, Text } from 'react-native';
import type { StatCardProps } from './StatCard';

export function StatCard({ emoji, value, label }: StatCardProps) {
  return (
    <View className="flex-1 bg-hub-card border border-hub-border rounded-2xl px-4 py-3 flex-row items-center gap-2">
      <Text className="text-2xl">{emoji}</Text>
      <View>
        <Text className="text-hub-text font-bold text-lg leading-tight">{value}</Text>
        <Text className="text-hub-muted text-xs">{label}</Text>
      </View>
    </View>
  );
}
