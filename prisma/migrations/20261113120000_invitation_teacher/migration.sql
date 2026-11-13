-- AlterTable: приглашение в личный кабинет преподавателя
ALTER TABLE "invitation" ADD COLUMN "teacherId" UUID;

-- CreateIndex
CREATE INDEX "invitation_teacherId_idx" ON "invitation"("teacherId");

-- AddForeignKey
ALTER TABLE "invitation"
  ADD CONSTRAINT "invitation_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "teachers"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
