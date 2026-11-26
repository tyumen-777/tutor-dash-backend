-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'LESSON_COMPLETED';

-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "notifyLessonCompleted" BOOLEAN NOT NULL DEFAULT true;

