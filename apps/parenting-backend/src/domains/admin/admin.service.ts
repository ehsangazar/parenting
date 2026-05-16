import { recordAudit } from "../../shared/audit/index.js";
import { getSignedViewUrl } from "../../shared/storage/index.js";
import {
  getAdminModuleDefaults,
  getFamilyDefaultModules,
  getModuleConfigPayload,
  upsertAdminModuleDefaults,
} from "../../shared/adminModuleDefaults/index.js";
import type { ModuleDefaultsInput, LearningLessonInput } from "./admin.schema.js";
import * as repo from "./admin.repository.js";

// --- Users ---

export async function listUsers() {
  return repo.findAllUsers();
}

export async function setUserRole(
  adminId: string,
  targetId: string,
  role: "user" | "admin",
) {
  const user = await repo.updateUserRole(targetId, role);
  await recordAudit({
    userId: adminId,
    action: "update_user_role",
    resourceType: "user",
    resourceId: targetId,
  });
  return user;
}

export async function removeUser(adminId: string, targetId: string) {
  if (adminId === targetId) throw Object.assign(new Error("Cannot delete your own account"), { statusCode: 400 });
  await repo.deleteUser(targetId);
  await recordAudit({
    userId: adminId,
    action: "delete_user",
    resourceType: "user",
    resourceId: targetId,
  });
}

// --- Reports ---

export async function getReports() {
  const stats = await repo.getReportStats();
  return {
    users: stats.userCount,
    documentCount: stats.documentCount,
    conversations: stats.conversationCount,
    queryCount: stats.conversationCount,
    usage: stats.usage,
  };
}

// --- Conversations ---

export async function listConversations(opts: {
  page: number;
  limit: number;
  email?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  return repo.findAdminConversations(opts);
}

export async function getConversationMessages(id: string) {
  return repo.findConversationWithMessages(id);
}

// --- Documents ---

export async function listDocuments() {
  return repo.findAllDocuments();
}

export async function getDocumentDownloadUrl(adminId: string, documentId: string) {
  const doc = await repo.findDocumentById(documentId);
  if (!doc) return null;
  if (!doc.s3Key) throw Object.assign(new Error("Document has no S3 key"), { statusCode: 400 });

  const url = await getSignedViewUrl(doc.s3Key, 3600);
  await recordAudit({
    userId: adminId,
    action: "download_document",
    resourceType: "document",
    resourceId: documentId,
  });
  return url;
}

export async function removeDocument(adminId: string, documentId: string) {
  await repo.deleteDocument(documentId);
  await recordAudit({
    userId: adminId,
    action: "delete_document",
    resourceType: "document",
    resourceId: documentId,
  });
}

// --- Modules ---

export async function getModules() {
  const defaults = (await getAdminModuleDefaults()) ?? {
    familyModules: getFamilyDefaultModules(),
    childModulesByPeriod: {},
    widgetDefaults: {},
  };
  const config = getModuleConfigPayload();
  return { defaults, config };
}

export async function saveModuleDefaults(adminId: string, data: ModuleDefaultsInput) {
  const saved = await upsertAdminModuleDefaults(data);
  await recordAudit({
    userId: adminId,
    action: "update_module_defaults",
    resourceType: "admin_module_defaults",
    resourceId: saved.id,
  });
  return {
    familyModules: saved.familyModules,
    childModulesByPeriod: saved.childModulesByPeriod,
    widgetDefaults: saved.widgetDefaults,
  };
}

// --- Surveys ---

export async function listSurveys() {
  return repo.findAllSurveyResponses();
}

export async function removeSurvey(adminId: string, surveyId: string) {
  await repo.deleteSurveyResponse(surveyId);
  await recordAudit({
    userId: adminId,
    action: "delete_survey_response",
    resourceType: "survey_response",
    resourceId: surveyId,
  });
}

// --- Learning Courses ---

export async function listCourses() {
  return repo.findAllCourses();
}

export async function addCourse(
  adminId: string,
  data: { title: string; description?: string; order?: number },
) {
  const course = await repo.createCourse(data);
  await recordAudit({
    userId: adminId,
    action: "create_learning_course",
    resourceType: "learning_course",
    resourceId: course.id,
  });
  return course;
}

export async function editCourse(
  adminId: string,
  id: string,
  data: { title: string; description?: string; order?: number },
) {
  const course = await repo.updateCourse(id, data);
  await recordAudit({
    userId: adminId,
    action: "update_learning_course",
    resourceType: "learning_course",
    resourceId: id,
  });
  return course;
}

export async function removeCourse(adminId: string, id: string) {
  await repo.deleteCourse(id);
  await recordAudit({
    userId: adminId,
    action: "delete_learning_course",
    resourceType: "learning_course",
    resourceId: id,
  });
}

// --- Learning Phases ---

export async function listPhases(courseId: string) {
  return repo.findPhasesByCourse(courseId);
}

export async function addPhase(
  adminId: string,
  courseId: string,
  data: { title: string; description?: string; order?: number },
) {
  const phase = await repo.createPhase({ ...data, courseId });
  await recordAudit({
    userId: adminId,
    action: "create_learning_phase",
    resourceType: "learning_phase",
    resourceId: phase.id,
  });
  return phase;
}

export async function editPhase(
  adminId: string,
  id: string,
  data: { title: string; description?: string; order?: number },
) {
  const phase = await repo.updatePhase(id, data);
  await recordAudit({
    userId: adminId,
    action: "update_learning_phase",
    resourceType: "learning_phase",
    resourceId: id,
  });
  return phase;
}

export async function removePhase(adminId: string, id: string) {
  await repo.deletePhase(id);
  await recordAudit({
    userId: adminId,
    action: "delete_learning_phase",
    resourceType: "learning_phase",
    resourceId: id,
  });
}

// --- Learning Modules ---

export async function listModules(phaseId: string) {
  return repo.findModulesByPhase(phaseId);
}

export async function addModule(
  adminId: string,
  phaseId: string,
  data: {
    title: string;
    description?: string;
    minAgeMonths?: number;
    maxAgeMonths?: number;
    isGeneral?: boolean;
    order?: number;
  },
) {
  const mod = await repo.createModule({ ...data, phaseId });
  await recordAudit({
    userId: adminId,
    action: "create_learning_module",
    resourceType: "learning_module",
    resourceId: mod.id,
  });
  return mod;
}

export async function editModule(
  adminId: string,
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
  const mod = await repo.updateModule(id, data);
  await recordAudit({
    userId: adminId,
    action: "update_learning_module",
    resourceType: "learning_module",
    resourceId: id,
  });
  return mod;
}

export async function removeModule(adminId: string, id: string) {
  await repo.deleteModule(id);
  await recordAudit({
    userId: adminId,
    action: "delete_learning_module",
    resourceType: "learning_module",
    resourceId: id,
  });
}

// --- Learning Lessons ---

export async function listLessons(moduleId: string) {
  return repo.findLessonsByModule(moduleId);
}

export async function addLesson(
  adminId: string,
  moduleId: string,
  data: LearningLessonInput,
) {
  const lesson = await repo.createLesson({ ...data, moduleId });
  await recordAudit({
    userId: adminId,
    action: "create_learning_lesson",
    resourceType: "learning_lesson",
    resourceId: lesson.id,
  });
  return lesson;
}

export async function editLesson(
  adminId: string,
  id: string,
  data: Partial<LearningLessonInput>,
) {
  const lesson = await repo.updateLesson(id, data);
  await recordAudit({
    userId: adminId,
    action: "update_learning_lesson",
    resourceType: "learning_lesson",
    resourceId: id,
  });
  return lesson;
}

export async function removeLesson(adminId: string, id: string) {
  await repo.deleteLesson(id);
  await recordAudit({
    userId: adminId,
    action: "delete_learning_lesson",
    resourceType: "learning_lesson",
    resourceId: id,
  });
}

export async function reorderLessons(lessonIds: string[]) {
  await repo.reorderLessons(lessonIds);
}
