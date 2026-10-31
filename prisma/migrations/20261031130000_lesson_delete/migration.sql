-- AlterTable: кто, когда и почему удалил занятие
ALTER TABLE "lessons"
ADD COLUMN "deleteReason" TEXT,
ADD COLUMN "deletedAt" TIMESTAMPTZ,
ADD COLUMN "deletedByUserId" TEXT;

-- AddForeignKey
ALTER TABLE "lessons"
  ADD CONSTRAINT "lessons_deletedByUserId_fkey"
  FOREIGN KEY ("deletedByUserId") REFERENCES "user"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Удалённое занятие не занимает время преподавателя
ALTER TABLE "lessons" DROP CONSTRAINT "lessons_teacher_no_overlap";

ALTER TABLE "lessons"
  ADD CONSTRAINT "lessons_teacher_no_overlap"
    EXCLUDE USING gist (
      "teacherId" WITH =,
      tstzrange("startsAt", "endsAt") WITH &&
    ) WHERE ("status" NOT IN ('CANCELED', 'RESCHEDULED', 'DELETED'));
