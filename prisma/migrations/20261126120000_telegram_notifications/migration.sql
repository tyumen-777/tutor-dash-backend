-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('LOW_BALANCE');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELED');

-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "lowBalanceNotifyAt" INTEGER DEFAULT 1;

-- CreateTable
CREATE TABLE "telegram_link_tokens" (
    "token" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "studentId" UUID NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_link_tokens_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "telegram_links" (
    "id" UUID NOT NULL,
    "organizationId" TEXT NOT NULL,
    "studentId" UUID NOT NULL,
    "chatId" BIGINT NOT NULL,
    "username" TEXT,
    "displayName" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "organizationId" TEXT NOT NULL,
    "studentId" UUID,
    "chatId" BIGINT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "text" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sendAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMPTZ,
    "lastError" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "telegram_link_tokens_studentId_idx" ON "telegram_link_tokens"("studentId");

-- CreateIndex
CREATE INDEX "telegram_link_tokens_expiresAt_idx" ON "telegram_link_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "telegram_links_chatId_idx" ON "telegram_links"("chatId");

-- CreateIndex
CREATE INDEX "telegram_links_organizationId_idx" ON "telegram_links"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_links_studentId_chatId_key" ON "telegram_links"("studentId", "chatId");

-- CreateIndex
CREATE INDEX "notifications_status_sendAt_idx" ON "notifications"("status", "sendAt");

-- CreateIndex
CREATE INDEX "notifications_studentId_type_createdAt_idx" ON "notifications"("studentId", "type", "createdAt");

-- AddForeignKey
ALTER TABLE "telegram_link_tokens" ADD CONSTRAINT "telegram_link_tokens_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_link_tokens" ADD CONSTRAINT "telegram_link_tokens_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_links" ADD CONSTRAINT "telegram_links_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_links" ADD CONSTRAINT "telegram_links_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Порог уведомления о низком остатке: от 0 до 20 занятий
ALTER TABLE "organization" ADD CONSTRAINT "organization_lowBalanceNotifyAt_check" CHECK ("lowBalanceNotifyAt" IS NULL OR "lowBalanceNotifyAt" BETWEEN 0 AND 20);
