import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/store';

export default function Index() {
  const token = useAuth((s) => s.token);
  const isOnboarded = useAuth((s) => s.isOnboarded);

  if (!token) return <Redirect href="/(auth)/login" />;
  if (!isOnboarded()) return <Redirect href="/(auth)/onboarding" />;
  return <Redirect href="/(app)/dashboard" />;
}
