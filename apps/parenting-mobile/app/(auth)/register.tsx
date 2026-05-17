import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Alert, ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Button, FormInput } from '@parenting/ui';
import { authApi } from '@/lib/api';
import { useAuth } from '@/lib/store';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setToken = useAuth((s) => s.setToken);
  const setUser = useAuth((s) => s.setUser);

  async function handleRegister() {
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      const data = await authApi.register(email.trim().toLowerCase(), password, name.trim() || undefined);
      await setToken(data.token);
      setUser(data.user);
      router.replace('/(auth)/onboarding');
    } catch (err: any) {
      Alert.alert('Registration failed', err?.response?.data?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-hub">
      <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 justify-center px-6 py-12 gap-4">
          <TouchableOpacity onPress={() => router.back()} className="mb-4">
            <Text className="text-hub-muted text-sm">Back</Text>
          </TouchableOpacity>

          <View className="mb-2">
            <Text className="text-hub-text text-3xl font-bold mb-1">Create account</Text>
            <Text className="text-hub-muted text-base">Join thousands of parents on Raised</Text>
          </View>

          <FormInput label="Your name" placeholder="Jane Smith" value={name} onChange={setName} autoComplete="name" />
          <FormInput label="Email" placeholder="hello@example.com" value={email} onChange={setEmail} type="email" autoComplete="email" />
          <FormInput label="Password" placeholder="At least 8 characters" value={password} onChange={setPassword} type="password" autoComplete="new-password" />

          <Button label="Create account" onPress={handleRegister} loading={loading} fullWidth size="lg" />
          <Button label="Already have an account? Sign in" onPress={() => router.push('/(auth)/login')} variant="ghost" fullWidth />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
