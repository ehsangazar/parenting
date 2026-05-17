import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { familiesApi } from '@/lib/api';

export default function FamilyScreen() {
  const [families, setFamilies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    familiesApi
      .list()
      .then((data) => setFamilies(Array.isArray(data) ? data : [data].filter(Boolean)))
      .catch(() => setFamilies([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-hub">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-5 pt-4 pb-6">
          <Text className="text-hub-text text-2xl font-bold">Family</Text>
          <Text className="text-hub-muted text-sm">Your family profile and children</Text>
        </View>

        {loading ? (
          <View className="flex-1 items-center py-16">
            <ActivityIndicator size="large" color="#3db47b" />
          </View>
        ) : families.length === 0 ? (
          <View className="mx-5 bg-hub-card border border-hub-border rounded-2xl p-8 items-center">
            <Text className="text-4xl mb-3">👨‍👩‍👧</Text>
            <Text className="text-hub-text font-semibold text-lg mb-1">Set up your family</Text>
            <Text className="text-hub-muted text-sm text-center mb-5">Add your family to start tracking milestones and moments.</Text>
            <TouchableOpacity className="bg-hub-accent rounded-xl py-3 px-6">
              <Text className="text-white font-semibold">Create family</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="px-5 gap-4">
            {families.map((family: any) => (
              <FamilyCard key={family.id} family={family} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FamilyCard({ family }: { family: any }) {
  return (
    <View className="bg-hub-card border border-hub-border rounded-2xl p-5">
      <Text className="text-hub-text font-semibold text-lg mb-1">{family.name}</Text>
      <Text className="text-hub-muted text-sm">
        {family._count?.members ?? 0} members · {family._count?.children ?? 0} children
      </Text>
    </View>
  );
}
