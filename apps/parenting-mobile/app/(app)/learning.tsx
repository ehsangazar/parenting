import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Screen, ScreenHeader, Card } from '@parenting/ui';
import { learningApi } from '@/lib/api';

export default function LearningScreen() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    learningApi.getCourses().then(setCourses).catch(() => setCourses([])).finally(() => setLoading(false));
  }, []);

  return (
    <Screen>
      <ScreenHeader title="Learning" subtitle="Expert knowledge for every stage" />

      {loading ? (
        <View className="flex-1 items-center py-16">
          <ActivityIndicator size="large" color="#3db47b" />
        </View>
      ) : courses.length === 0 ? (
        <View className="px-5">
          <Card>
            <Text className="text-4xl mb-3 text-center">📚</Text>
            <Text className="text-hub-text font-semibold text-lg mb-1 text-center">No courses yet</Text>
            <Text className="text-hub-muted text-sm text-center">Courses will appear here once available.</Text>
          </Card>
        </View>
      ) : (
        <View className="px-5 gap-4">
          {courses.map((course: any) => <CourseCard key={course.id} course={course} />)}
        </View>
      )}
    </Screen>
  );
}

function CourseCard({ course }: { course: any }) {
  const progress = course.totalModules > 0
    ? Math.round((course.completedModules / course.totalModules) * 100)
    : 0;

  return (
    <Card>
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1 mr-3">
          <Text className="text-hub-text font-semibold text-lg leading-snug">{course.title}</Text>
          {course.description && (
            <Text className="text-hub-muted text-sm mt-1" numberOfLines={2}>{course.description}</Text>
          )}
        </View>
        <Text className="text-xl">{progress === 100 ? '✅' : progress > 0 ? '📖' : '🔒'}</Text>
      </View>
      <View className="bg-hub-border rounded-full h-1.5 overflow-hidden mb-2">
        <View className="bg-hub-accent h-full rounded-full" style={{ width: `${progress}%` }} />
      </View>
      <Text className="text-hub-muted text-xs">
        {course.completedModules ?? 0} / {course.totalModules ?? 0} modules complete
      </Text>
    </Card>
  );
}
