import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

const STEPS = [
  {
    emoji: '👶',
    title: 'Track your journey',
    body: 'Log milestones, moments, and memories as your child grows.',
  },
  {
    emoji: '📚',
    title: 'Learn every day',
    body: 'Bite-sized lessons from pediatric experts, tailored to your stage.',
  },
  {
    emoji: '🏆',
    title: 'Earn streaks and rewards',
    body: 'Stay consistent, grow your knowledge, and celebrate every win.',
  },
];

export default function OnboardingScreen() {
  return (
    <View className="flex-1 bg-hub px-6 justify-between py-16">
      <View className="flex-1 items-center justify-center gap-8">
        {STEPS.map((step) => (
          <View key={step.title} className="items-center">
            <Text className="text-5xl mb-3">{step.emoji}</Text>
            <Text className="text-hub-text text-xl font-semibold text-center mb-1">{step.title}</Text>
            <Text className="text-hub-muted text-base text-center">{step.body}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        className="bg-hub-accent rounded-xl py-4 items-center"
        onPress={() => router.replace('/(app)/dashboard')}
      >
        <Text className="text-white font-semibold text-base">Get started</Text>
      </TouchableOpacity>
    </View>
  );
}
