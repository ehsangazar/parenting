import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import '../global.css';
import { tokenCache, authApi } from '@/lib/api';
import { useAuth } from '@/lib/store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const setUser = useAuth((s) => s.setUser);
  const setToken = useAuth((s) => s.setToken);

  useEffect(() => {
    async function bootstrap() {
      await tokenCache.hydrate();
      if (tokenCache.current) {
        await setToken(tokenCache.current);
        try {
          const user = await authApi.me();
          setUser(user);
        } catch {
          await setToken(null);
        }
      }
      SplashScreen.hideAsync();
    }
    bootstrap();
  }, [setToken, setUser]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}
