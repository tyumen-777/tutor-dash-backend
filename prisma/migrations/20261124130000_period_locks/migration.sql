-- Закрытие месяцев: оплаты, занятия и расходы закрытого месяца не меняются
ALTER TYPE "FinanceLogEntity" ADD VALUE 'PERIOD';

-- CreateTable
CREATE TABLE "period_locks" (
    "id" UUID NOT NULL,
    "organizationId" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "closedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "period_locks_pkey" PRIMARY KEY ("id"),
    -- Хранится первое число месяца
    CONSTRAINT "period_locks_month_check" CHECK (EXTRACT(DAY FROM "month") = 1)
);

-- CreateIndex
CREATE UNIQUE INDEX "period_locks_organizationId_month_key" ON "period_locks"("organizationId", "month");

-- AddForeignKey
ALTER TABLE "period_locks" ADD CONSTRAINT "period_locks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "period_locks" ADD CONSTRAINT "period_locks_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
