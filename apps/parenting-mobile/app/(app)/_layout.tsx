import { Redirect, Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { useAuth } from '@/lib/store';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View className="items-center pt-1">
      <Text className="text-xl">{emoji}</Text>
      <Text className={`text-xs mt-0.5 ${focused ? 'text-hub-accent' : 'text-hub-muted'}`}>
        {label}
      </Text>
    </View>
  );
}

export default function AppLayout() {
  const token = useAuth((s) => s.token);
  if (!token) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1a2b33',
          borderTopColor: '#37464f',
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="learning"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📚" label="Learn" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👨‍👩‍👧" label="Family" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🌍" label="Village" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
