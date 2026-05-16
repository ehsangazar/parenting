import { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db/index.js";

// --- Users ---

export async function findAllUsers() {
  return prisma.user.findMany({
    select: { id: true, email: true, role: true, createdAt: true },
  });
}

export async function updateUserRole(id: string, role: "user" | "admin") {
  return prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, email: true, role: true, createdAt: true },
  });
}

export async function deleteUser(id: string) {
  return prisma.user.delete({ where: { id } });
}

// --- Reports ---

export async function getReportStats() {
  const [userCount, documentCount, conversationCount, usage] = await Promise.all([
    prisma.user.count(),
    prisma.document.count(),
    prisma.conversation.count(),
    prisma.usageLedger.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  return { userCount, documentCount, conversationCount, usage };
}

// --- Conversations ---

export async function findAdminConversations(opts: {
  page: number;
  limit: number;
  email?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const { page, limit, email, dateFrom, dateTo } = opts;
  const skip = (page - 1) * limit;

  const where: Prisma.ConversationWhereInput = {};
  if (email) {
    where.user = { email: { contains: email, mode: "insensitive" } };
  }
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      (where.createdAt as Prisma.DateTimeFilter).lte = end;
    }
  }

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, email: true } },
        _count: { select: { messages: true } },
      },
    }),
    prisma.conversation.count({ where }),
  ]);

  return {
    conversations: conversations.map((c) => ({
      id: c.id,
      createdAt: c.createdAt,
      user: c.user,
      messageCount: c._count.messages,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function findConversationWithMessages(id: string) {
  return prisma.conversation.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
}

// --- Documents ---

export async function findAllDocuments() {
  return prisma.document.findMany({
    select: {
      id: true,
      title: true,
      docType: true,
      source: true,
      s3Key: true,
      mime: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function findDocumentById(id: string) {
  return prisma.document.findUnique({
    where: { id },
    select: { id: true, title: true, s3Key: true, mime: true },
  });
}

export async function deleteDocument(id: string) {
  await prisma.chunk.deleteMany({ where: { docId: id } });
  await prisma.document.delete({ where: { id } });
}

// --- Surveys ---

export async function findAllSurveyResponses() {
  return prisma.surveyResponse.findMany({ orderBy: { createdAt: "desc" } });
}

export async function deleteSurveyResponse(id: string) {
  return prisma.surveyResponse.delete({ where: { id } });
}

// --- Learning Courses ---

export async function findAllCourses() {
  return prisma.learningCourse.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { phases: true } } },
  });
}

export async function createCourse(data: {
  title: string;
  description?: string;
  order?: number;
}) {
  return prisma.learningCourse.create({ data });
}

export async function updateCourse(
  id: string,
  data: { title: string; description?: string; order?: number },
) {
  return prisma.learningCourse.update({ where: { id }, data });
}

export async function deleteCourse(id: string) {
  return prisma.learningCourse.delete({ where: { id } });
}

// --- Learning Phases ---

export async function findPhasesByCourse(courseId: string) {
  return prisma.learningPhase.findMany({
    where: { courseId },
    orderBy: { order: "asc" },
    include: { _count: { select: { modules: true } } },
  });
}

export async function createPhase(data: {
  courseId: string;
  title: string;
  description?: string;
  order?: number;
}) {
  return prisma.learningPhase.create({ data });
}

export async function updatePhase(
  id: string,
  data: { title: string; description?: string; order?: number },
) {
  return prisma.learningPhase.update({ where: { id }, data });
}

export async function deletePhase(id: string) {
  return prisma.learningPhase.delete({ where: { id } });
}

// --- Learning Modules ---

export async function findModulesByPhase(phaseId: string) {
  return prisma.learningModule.findMany({
    where: { phaseId },
    orderBy: { order: "asc" },
    include: { _count: { select: { lessons: true } } },
  });
}

export async function createModule(data: {
  phaseId: string;
  title: string;
  description?: string;
  minAgeMonths?: number;
  maxAgeMonths?: number;
  isGeneral?: boolean;
  order?: number;
}) {
  return prisma.learningModule.create({ data });
}

export async function updateModule(
  id: string,
  data: {
    title: string;
    description?: string;
    minAgeMonths?: number;
    maxAgeMonths?: number;
    isGeneral?: boolean;
    order?: number;
  },
) {
  return prisma.learningModule.update({ where: { id }, data });
}

export async function deleteModule(id: string) {
  return prisma.learningModule.delete({ where: { id } });
}

// --- Learning Lessons ---

export async function findLessonsByModule(moduleId: string) {
  return prisma.learningLesson.findMany({
    where: { moduleId },
    orderBy: { order: "asc" },
  });
}

export async function createLesson(data: {
  moduleId: string;
  title: string;
  content: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "audio";
  order?: number;
}) {
  return prisma.learningLesson.create({ data });
}

export async function updateLesson(
  id: string,
  data: Partial<{
    title: string;
    content: string;
    mediaUrl: string;
    mediaType: "image" | "video" | "audio";
    order: number;
  }>,
) {
  return prisma.learningLesson.update({ where: { id }, data });
}

export async function deleteLesson(id: string) {
  return prisma.learningLesson.delete({ where: { id } });
}

export async function reorderLessons(lessonIds: string[]) {
  await prisma.$transaction(
    lessonIds.map((id, index) =>
      prisma.learningLesson.update({ where: { id }, data: { order: index } }),
    ),
  );
}
