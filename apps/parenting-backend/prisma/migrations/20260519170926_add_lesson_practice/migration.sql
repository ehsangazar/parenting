-- CreateTable
CREATE TABLE "LessonPractice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "childId" TEXT,
    "technique" TEXT NOT NULL,
    "pledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "nudgedAt" TIMESTAMP(3),
    "reflectionOutcome" TEXT,
    "reflectionNote" TEXT,
    "reflectedAt" TIMESTAMP(3),

    CONSTRAINT "LessonPractice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonPractice_userId_reflectedAt_idx" ON "LessonPractice"("userId", "reflectedAt");

-- CreateIndex
CREATE INDEX "LessonPractice_lessonId_idx" ON "LessonPractice"("lessonId");

-- CreateIndex
CREATE INDEX "LessonPractice_dueAt_idx" ON "LessonPractice"("dueAt");

-- AddForeignKey
ALTER TABLE "LessonPractice" ADD CONSTRAINT "LessonPractice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPractice" ADD CONSTRAINT "LessonPractice_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "LearningLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPractice" ADD CONSTRAINT "LessonPractice_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE SET NULL ON UPDATE CASCADE;

