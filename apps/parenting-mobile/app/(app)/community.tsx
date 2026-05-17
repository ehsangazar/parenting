import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { villageApi } from '@/lib/api';

export default function CommunityScreen() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    villageApi
      .listPosts()
      .then((data) => setPosts(Array.isArray(data?.posts) ? data.posts : []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-hub">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-5 pt-4 pb-6">
          <Text className="text-hub-text text-2xl font-bold">Village</Text>
          <Text className="text-hub-muted text-sm">Connect with your parenting community</Text>
        </View>

        {loading ? (
          <View className="flex-1 items-center py-16">
            <ActivityIndicator size="large" color="#3db47b" />
          </View>
        ) : posts.length === 0 ? (
          <View className="mx-5 bg-hub-card border border-hub-border rounded-2xl p-8 items-center">
            <Text className="text-4xl mb-3">🌍</Text>
            <Text className="text-hub-text font-semibold text-lg mb-1">Join the conversation</Text>
            <Text className="text-hub-muted text-sm text-center">Share your experiences with other parents in the village.</Text>
          </View>
        ) : (
          <View className="px-5 gap-4">
            {posts.map((post: any) => (
              <PostCard key={post.id} post={post} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PostCard({ post }: { post: any }) {
  return (
    <TouchableOpacity className="bg-hub-card border border-hub-border rounded-2xl p-5">
      <View className="flex-row items-center gap-2 mb-2">
        <View className="w-8 h-8 rounded-full bg-hub-border items-center justify-center">
          <Text className="text-xs">{post.author?.name?.[0] ?? '?'}</Text>
        </View>
        <Text className="text-hub-muted text-sm">{post.author?.name ?? 'Anonymous'}</Text>
      </View>
      <Text className="text-hub-text text-base leading-relaxed" numberOfLines={4}>{post.content}</Text>
      <View className="flex-row items-center gap-4 mt-3">
        <Text className="text-hub-muted text-xs">❤️ {post._count?.reactions ?? 0}</Text>
        <Text className="text-hub-muted text-xs">💬 {post._count?.comments ?? 0}</Text>
      </View>
    </TouchableOpacity>
  );
}
