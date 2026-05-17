import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Screen, ScreenHeader, StatCard, Card, Button } from '@parenting/ui';
import { useAuth } from '@/lib/store';
import { learningApi, gamificationApi } from '@/lib/api';

export default function DashboardScreen() {
  const user = useAuth((s) => s.user);
  const [nextLesson, setNextLesson] = useState<any>(null);
  const [gamification, setGamification] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      learningApi.getNextLesson().catch(() => null),
      gamificationApi.getProfile().catch(() => null),
    ]).then(([lesson, gam]) => {
      setNextLesson(lesson);
      setGamification(gam);
    }).finally(() => setLoading(false));
  }, []);

  const name = user?.profile?.name ?? user?.email?.split('@')[0] ?? 'there';
  const streak = gamification?.currentStreak ?? user?.gamification?.streak ?? 0;
  const coins = gamification?.totalPoints ?? user?.gamification?.coins ?? 0;

  return (
    <Screen>
      <View className="px-5 pt-4 pb-6">
        <Text className="text-hub-muted text-sm">Good {greeting()},</Text>
        <Text className="text-hub-text text-2xl font-bold">{name}</Text>
      </View>

      <View className="flex-row mx-5 mb-6 gap-3">
        <StatCard emoji="🔥" value={String(streak)} label="day streak" />
        <StatCard emoji="⭐" value={String(coins)} label="XP earned" />
      </View>

      <View className="mx-5 mb-6">
        <Text className="text-hub-muted text-xs uppercase tracking-wider mb-3">Continue learning</Text>
        {loading ? (
          <Card>
            <ActivityIndicator color="#3db47b" />
          </Card>
        ) : nextLesson ? (
          <Card onPress={() => router.push('/(app)/learning')}>
            <Text className="text-hub-accent text-xs uppercase tracking-wider mb-1">Next lesson</Text>
            <Text className="text-hub-text text-lg font-semibold mb-1">
              {nextLesson.title ?? nextLesson.lessonTitle ?? 'Continue your course'}
            </Text>
            <Text className="text-hub-muted text-sm mb-4">{nextLesson.moduleName ?? 'Tap to continue'}</Text>
            <Button label="Start lesson" onPress={() => router.push('/(app)/learning')} fullWidth />
          </Card>
        ) : (
          <Card onPress={() => router.push('/(app)/learning')}>
            <Text className="text-hub-text text-lg font-semibold mb-1">Start your journey</Text>
            <Text className="text-hub-muted text-sm mb-4">Pick a course and begin learning today</Text>
            <Button label="Browse courses" onPress={() => router.push('/(app)/learning')} fullWidth />
          </Card>
        )}
      </View>

      <View className="mx-5">
        <Text className="text-hub-muted text-xs uppercase tracking-wider mb-3">Quick access</Text>
        <View className="flex-row flex-wrap gap-3">
          <QuickCard emoji="📅" label="Calendar" onPress={() => {}} />
          <QuickCard emoji="📸" label="Moments" onPress={() => {}} />
          <QuickCard emoji="💬" label="AI Chat" onPress={() => {}} />
          <QuickCard emoji="🏆" label="Leaderboard" onPress={() => {}} />
        </View>
      </View>
    </Screen>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function QuickCard({ emoji, label, onPress }: { emoji: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      className="bg-hub-card border border-hub-border rounded-2xl p-4 items-center"
      style={{ width: '47%' }}
      onPress={onPress}
    >
      <Text className="text-3xl mb-1">{emoji}</Text>
      <Text className="text-hub-muted text-sm">{label}</Text>
    </TouchableOpacity>
  );
}
