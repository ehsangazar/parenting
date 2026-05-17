import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Screen, ScreenHeader, StatCard, Button } from '@parenting/ui';
import { useAuth } from '@/lib/store';
import { authApi } from '@/lib/api';

export default function ProfileScreen() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const streak = user?.gamification?.streak ?? 0;
  const coins = user?.gamification?.coins ?? 0;

  async function handleLogout() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try { await authApi.logout(); } catch {}
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  const name = user?.profile?.name ?? user?.email?.split('@')[0] ?? 'You';
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <Screen>
      <ScreenHeader title="Profile" />

      <View className="items-center mb-8">
        <View className="w-20 h-20 rounded-full bg-hub-accent items-center justify-center mb-3">
          <Text className="text-white text-2xl font-bold">{initials}</Text>
        </View>
        <Text className="text-hub-text text-xl font-semibold">{name}</Text>
        <Text className="text-hub-muted text-sm">{user?.email}</Text>
      </View>

      <View className="flex-row mx-5 gap-3 mb-8">
        <StatCard emoji="🔥" value={String(streak)} label="Streak" />
        <StatCard emoji="⭐" value={String(coins)} label="Total XP" />
      </View>

      <View className="mx-5 bg-hub-card border border-hub-border rounded-2xl overflow-hidden mb-6">
        <MenuItem label="Edit profile" emoji="✏️" onPress={() => {}} />
        <View className="h-px bg-hub-border mx-5" />
        <MenuItem label="Notifications" emoji="🔔" onPress={() => {}} />
        <View className="h-px bg-hub-border mx-5" />
        <MenuItem label="Language" emoji="🌐" onPress={() => {}} />
        <View className="h-px bg-hub-border mx-5" />
        <MenuItem label="Privacy" emoji="🔒" onPress={() => {}} />
      </View>

      <View className="mx-5">
        <Button label="Sign out" onPress={handleLogout} variant="danger" fullWidth />
      </View>
    </Screen>
  );
}

function MenuItem({ emoji, label, onPress }: { emoji: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity className="flex-row items-center px-5 py-4 gap-3" onPress={onPress}>
      <Text className="text-xl w-7">{emoji}</Text>
      <Text className="flex-1 text-base text-hub-text">{label}</Text>
      <Text className="text-hub-muted text-sm">›</Text>
    </TouchableOpacity>
  );
}
