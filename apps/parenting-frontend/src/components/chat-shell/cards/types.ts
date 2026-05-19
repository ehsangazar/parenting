export type CardAction =
  | { kind: 'send'; label: string; message: string; tone?: 'primary' | 'danger' | 'ghost' }
  | { kind: 'navigate'; label: string; to: string; tone?: 'primary' | 'danger' | 'ghost' };

export type ChildCardData = {
  childId: string;
  name: string;
  ageLabel: string;
  emoji?: string;
};

export type EventCardData = {
  eventId: string;
  title: string;
  startsAt: string;
  endsAt?: string;
  childName?: string;
  eventType: string;
  location?: string;
  allDay?: boolean;
};

export type ChecklistCardData = {
  title: string;
  subtitle?: string;
  items: Array<{ id: string; label: string; hint?: string }>;
};

export type ArticleCardData = {
  title: string;
  excerpt?: string;
  slug: string;
};

export type LessonCardData = {
  lessonId: string;
  moduleId: string;
  courseId: string;
  title: string;
  courseTitle: string;
  moduleTitle: string;
  readingMinutes: number;
  isCompleted: boolean;
  excerpt?: string;
};

export type ConfirmCardData = {
  title: string;
  description: string;
  confirmLabel: string;
  confirmMessage: string;
  cancelLabel?: string;
  danger?: boolean;
};

export type Card =
  | { id: string; type: 'child'; data: ChildCardData; actions?: CardAction[] }
  | { id: string; type: 'event'; data: EventCardData; actions?: CardAction[] }
  | { id: string; type: 'checklist'; data: ChecklistCardData; actions?: CardAction[] }
  | { id: string; type: 'article'; data: ArticleCardData; actions?: CardAction[] }
  | { id: string; type: 'lesson'; data: LessonCardData; actions?: CardAction[] }
  | { id: string; type: 'confirm'; data: ConfirmCardData };

export type CardActionHandlers = {
  onSend: (message: string) => void;
  onNavigate: (to: string) => void;
};
