-- Выплаты преподавателям в журнале финансовых операций
ALTER TYPE "FinanceLogEntity" ADD VALUE 'PAYOUT';

-- AlterTable
ALTER TABLE "finance_logs" ADD COLUMN "teacherId" UUID;

-- CreateIndex
CREATE INDEX "finance_logs_teacherId_idx" ON "finance_logs"("teacherId");

-- AddForeignKey
ALTER TABLE "finance_logs" ADD CONSTRAINT "finance_logs_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
