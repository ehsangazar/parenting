export interface LearningCourse {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  totalModules: number;
  completedModules: number;
  currentPhaseId?: string;
}

export interface LearningPhase {
  id: string;
  title: string;
  accentColor?: string;
  position: number;
  modules: LearningModule[];
}

export interface LearningModule {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  position: number;
  status: 'completed' | 'current' | 'in_progress' | 'locked';
  completedLessons: number;
  totalLessons: number;
}

export interface Lesson {
  id: string;
  title: string;
  content?: string;
  position: number;
  moduleId: string;
  completed: boolean;
  duration?: number;
}
