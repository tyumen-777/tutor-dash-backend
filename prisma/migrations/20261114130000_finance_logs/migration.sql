-- CreateEnum
CREATE TYPE "FinanceLogEntity" AS ENUM ('PAYMENT');

-- CreateEnum
CREATE TYPE "FinanceLogAction" AS ENUM ('CREATED', 'UPDATED', 'CANCELED');

-- CreateTable: журнал финансовых операций
CREATE TABLE "finance_logs" (
    "id" UUID NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityType" "FinanceLogEntity" NOT NULL,
    "entityId" UUID NOT NULL,
    "studentId" UUID,
    "action" "FinanceLogAction" NOT NULL,
    "description" TEXT NOT NULL,
    "changes" JSONB,
    "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "finance_logs_organizationId_createdAt_idx" ON "finance_logs"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "finance_logs_entityType_entityId_createdAt_idx" ON "finance_logs"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "finance_logs_studentId_idx" ON "finance_logs"("studentId");

-- AddForeignKey
ALTER TABLE "finance_logs" ADD CONSTRAINT "finance_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_logs" ADD CONSTRAINT "finance_logs_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_logs" ADD CONSTRAINT "finance_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
