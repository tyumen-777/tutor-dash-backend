-- AlterTable: основной преподаватель, уровень и Telegram ученика
ALTER TABLE "students"
ADD COLUMN "teacherId" UUID,
ADD COLUMN "telegram" TEXT,
ADD COLUMN "level" TEXT;

-- CreateIndex
CREATE INDEX "students_teacherId_idx" ON "students"("teacherId");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
