-- AlterTable: выплата преподавателю, в которую вошло занятие
ALTER TABLE "lessons" ADD COLUMN "payoutExpenseId" UUID;

-- CreateIndex
CREATE INDEX "lessons_teacherId_payoutExpenseId_idx" ON "lessons"("teacherId", "payoutExpenseId");

-- CreateIndex
CREATE INDEX "lessons_payoutExpenseId_idx" ON "lessons"("payoutExpenseId");

-- AddForeignKey
ALTER TABLE "lessons"
  ADD CONSTRAINT "lessons_payoutExpenseId_fkey"
  FOREIGN KEY ("payoutExpenseId") REFERENCES "expenses"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
