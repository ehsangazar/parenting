import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { Button, FormInput } from '@parenting/ui';
import { authApi } from '@/lib/api';
import { useAuth } from '@/lib/store';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setToken = useAuth((s) => s.setToken);
  const setUser = useAuth((s) => s.setUser);

  async function handleLogin() {
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      const data = await authApi.login(email.trim().toLowerCase(), password);
      await setToken(data.token);
      setUser(data.user);
      router.replace('/(app)/dashboard');
    } catch (err: any) {
      Alert.alert('Login failed', err?.response?.data?.message ?? 'Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-hub"
    >
      <View className="flex-1 justify-center px-6 gap-4">
        <View className="mb-6">
          <Text className="text-hub-text text-4xl font-bold mb-2">Raised</Text>
          <Text className="text-hub-muted text-base">Your parenting companion</Text>
        </View>

        <FormInput label="Email" placeholder="hello@example.com" value={email} onChange={setEmail} type="email" autoComplete="email" />
        <FormInput label="Password" placeholder="••••••••" value={password} onChange={setPassword} type="password" autoComplete="password" />

        <Button label="Sign in" onPress={handleLogin} loading={loading} fullWidth size="lg" />

        <Button
          label="New here? Create an account"
          onPress={() => router.push('/(auth)/register')}
          variant="ghost"
          fullWidth
        />
      </View>
    </KeyboardAvoidingView>
  );
}
