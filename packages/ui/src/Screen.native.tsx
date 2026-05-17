import React from 'react';
import { ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ScreenProps, ScreenHeaderProps } from './Screen';

export function Screen({ children, scrollable = true, className = '' }: ScreenProps) {
  if (scrollable) {
    return (
      <SafeAreaView className={`flex-1 bg-hub ${className}`}>
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView className={`flex-1 bg-hub ${className}`}>
      <View className="flex-1">{children}</View>
    </SafeAreaView>
  );
}

export function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  return (
    <View className="px-5 pt-4 pb-6">
      <Text className="text-hub-text text-2xl font-bold">{title}</Text>
      {subtitle && <Text className="text-hub-muted text-sm mt-0.5">{subtitle}</Text>}
    </View>
  );
}
