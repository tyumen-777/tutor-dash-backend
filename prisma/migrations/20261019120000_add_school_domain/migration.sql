-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('LEAD', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GuardianRelation" AS ENUM ('MOTHER', 'FATHER', 'GUARDIAN', 'OTHER');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXHAUSTED', 'CANCELED');

-- CreateEnum
CREATE TYPE "SubscriptionUsageType" AS ENUM ('LESSON', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('COMPLETED', 'CANCELED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PLANNED', 'ATTENDED', 'MISSED');

-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "currency" CHAR(3) NOT NULL DEFAULT 'RUB',
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Europe/Moscow';

-- CreateTable
CREATE TABLE "students" (
    "id" UUID NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "birthDate" DATE,
    "timezone" TEXT,
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardians" (
    "id" UUID NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "guardians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_guardians" (
    "studentId" UUID NOT NULL,
    "guardianId" UUID NOT NULL,
    "relation" "GuardianRelation" NOT NULL DEFAULT 'OTHER',
    "isPayer" BOOLEAN NOT NULL DEFAULT false,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "student_guardians_pkey" PRIMARY KEY ("studentId","guardianId")
);

-- CreateTable
CREATE TABLE "teachers" (
    "id" UUID NOT NULL,
    "organizationId" TEXT NOT NULL,
    "memberId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "lessonRate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "meetingUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" UUID NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lessonsCount" INTEGER NOT NULL,
    "lessonDuration" INTEGER,
    "price" DECIMAL(12,2) NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_subscriptions" (
    "id" UUID NOT NULL,
    "organizationId" TEXT NOT NULL,
    "studentId" UUID NOT NULL,
    "planId" UUID,
    "name" TEXT NOT NULL,
    "lessonsTotal" INTEGER NOT NULL,
    "lessonsLeft" INTEGER NOT NULL,
    "lessonDuration" INTEGER,
    "price" DECIMAL(12,2) NOT NULL,
    "purchasedOn" DATE NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "student_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_usages" (
    "id" UUID NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "lessonId" UUID,
    "type" "SubscriptionUsageType" NOT NULL,
    "lessonsDelta" INTEGER NOT NULL,
    "comment" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "organizationId" TEXT NOT NULL,
    "studentId" UUID NOT NULL,
    "subscriptionId" UUID,
    "payerGuardianId" UUID,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "paidAt" TIMESTAMPTZ NOT NULL,
    "comment" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_rules" (
    "id" UUID NOT NULL,
    "organizationId" TEXT NOT NULL,
    "teacherId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TIME(0) NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL,
    "validFrom" DATE NOT NULL,
    "validTo" DATE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "schedule_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" UUID NOT NULL,
    "organizationId" TEXT NOT NULL,
    "teacherId" UUID NOT NULL,
    "scheduleRuleId" UUID,
    "startsAt" TIMESTAMPTZ NOT NULL,
    "endsAt" TIMESTAMPTZ NOT NULL,
    "status" "LessonStatus" NOT NULL DEFAULT 'SCHEDULED',
    "cancelReason" TEXT,
    "rescheduledFromId" UUID,
    "meetingUrl" TEXT,
    "topic" TEXT,
    "homework" TEXT,
    "teacherRate" DECIMAL(12,2),
    "completedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_participants" (
    "lessonId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "organizationId" TEXT NOT NULL,
    "attendance" "AttendanceStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "lesson_participants_pkey" PRIMARY KEY ("lessonId","studentId")
);

-- CreateIndex
CREATE INDEX "students_organizationId_status_idx" ON "students"("organizationId", "status");

-- CreateIndex
CREATE INDEX "students_organizationId_lastName_firstName_idx" ON "students"("organizationId", "lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "students_organizationId_userId_key" ON "students"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "guardians_organizationId_idx" ON "guardians"("organizationId");

-- CreateIndex
CREATE INDEX "guardians_organizationId_phone_idx" ON "guardians"("organizationId", "phone");

-- CreateIndex
CREATE INDEX "student_guardians_guardianId_idx" ON "student_guardians"("guardianId");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_memberId_key" ON "teachers"("memberId");

-- CreateIndex
CREATE INDEX "teachers_organizationId_isActive_idx" ON "teachers"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "subscription_plans_organizationId_isArchived_idx" ON "subscription_plans"("organizationId", "isArchived");

-- CreateIndex
CREATE INDEX "student_subscriptions_organizationId_status_idx" ON "student_subscriptions"("organizationId", "status");

-- CreateIndex
CREATE INDEX "student_subscriptions_studentId_status_purchasedOn_createdA_idx" ON "student_subscriptions"("studentId", "status", "purchasedOn", "createdAt");

-- CreateIndex
CREATE INDEX "subscription_usages_subscriptionId_createdAt_idx" ON "subscription_usages"("subscriptionId", "createdAt");

-- CreateIndex
CREATE INDEX "subscription_usages_organizationId_createdAt_idx" ON "subscription_usages"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_usages_lessonId_studentId_key" ON "subscription_usages"("lessonId", "studentId");

-- CreateIndex
CREATE INDEX "payments_organizationId_paidAt_idx" ON "payments"("organizationId", "paidAt");

-- CreateIndex
CREATE INDEX "payments_studentId_paidAt_idx" ON "payments"("studentId", "paidAt");

-- CreateIndex
CREATE INDEX "payments_subscriptionId_idx" ON "payments"("subscriptionId");

-- CreateIndex
CREATE INDEX "schedule_rules_organizationId_idx" ON "schedule_rules"("organizationId");

-- CreateIndex
CREATE INDEX "schedule_rules_teacherId_idx" ON "schedule_rules"("teacherId");

-- CreateIndex
CREATE INDEX "schedule_rules_studentId_idx" ON "schedule_rules"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_rescheduledFromId_key" ON "lessons"("rescheduledFromId");

-- CreateIndex
CREATE INDEX "lessons_organizationId_startsAt_idx" ON "lessons"("organizationId", "startsAt");

-- CreateIndex
CREATE INDEX "lessons_teacherId_startsAt_idx" ON "lessons"("teacherId", "startsAt");

-- CreateIndex
CREATE INDEX "lessons_scheduleRuleId_startsAt_idx" ON "lessons"("scheduleRuleId", "startsAt");

-- CreateIndex
CREATE INDEX "lesson_participants_studentId_idx" ON "lesson_participants"("studentId");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_subscriptions" ADD CONSTRAINT "student_subscriptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_subscriptions" ADD CONSTRAINT "student_subscriptions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_subscriptions" ADD CONSTRAINT "student_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_usages" ADD CONSTRAINT "subscription_usages_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_usages" ADD CONSTRAINT "subscription_usages_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "student_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_usages" ADD CONSTRAINT "subscription_usages_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_usages" ADD CONSTRAINT "subscription_usages_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "student_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_payerGuardianId_fkey" FOREIGN KEY ("payerGuardianId") REFERENCES "guardians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_rules" ADD CONSTRAINT "schedule_rules_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_rules" ADD CONSTRAINT "schedule_rules_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_rules" ADD CONSTRAINT "schedule_rules_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_scheduleRuleId_fkey" FOREIGN KEY ("scheduleRuleId") REFERENCES "schedule_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_rescheduledFromId_fkey" FOREIGN KEY ("rescheduledFromId") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_participants" ADD CONSTRAINT "lesson_participants_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_participants" ADD CONSTRAINT "lesson_participants_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_participants" ADD CONSTRAINT "lesson_participants_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ─────────────────────────────────────────────────────────────
-- Ограничения, которые Prisma не умеет описать в schema.prisma
-- ─────────────────────────────────────────────────────────────

-- Нужен для EXCLUDE по uuid-колонке
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "subscription_plans"
  ADD CONSTRAINT "subscription_plans_lessons_count_check" CHECK ("lessonsCount" > 0),
  ADD CONSTRAINT "subscription_plans_lesson_duration_check" CHECK ("lessonDuration" IS NULL OR "lessonDuration" > 0),
  ADD CONSTRAINT "subscription_plans_price_check" CHECK ("price" >= 0);

ALTER TABLE "student_subscriptions"
  ADD CONSTRAINT "student_subscriptions_lessons_total_check" CHECK ("lessonsTotal" > 0),
  ADD CONSTRAINT "student_subscriptions_lessons_left_check" CHECK ("lessonsLeft" >= 0),
  ADD CONSTRAINT "student_subscriptions_price_check" CHECK ("price" >= 0);

ALTER TABLE "subscription_usages"
  ADD CONSTRAINT "subscription_usages_delta_check" CHECK ("lessonsDelta" <> 0),
  ADD CONSTRAINT "subscription_usages_lesson_check" CHECK (
    ("type" = 'LESSON' AND "lessonId" IS NOT NULL AND "lessonsDelta" = -1)
    OR ("type" = 'ADJUSTMENT')
  );

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_amount_check" CHECK ("amount" > 0);

ALTER TABLE "teachers"
  ADD CONSTRAINT "teachers_lesson_rate_check" CHECK ("lessonRate" >= 0);

ALTER TABLE "schedule_rules"
  ADD CONSTRAINT "schedule_rules_weekday_check" CHECK ("weekday" BETWEEN 1 AND 7),
  ADD CONSTRAINT "schedule_rules_duration_check" CHECK ("durationMin" > 0),
  ADD CONSTRAINT "schedule_rules_dates_check" CHECK ("validTo" IS NULL OR "validTo" >= "validFrom");

ALTER TABLE "lessons"
  ADD CONSTRAINT "lessons_time_check" CHECK ("endsAt" > "startsAt"),
  ADD CONSTRAINT "lessons_reschedule_self_check" CHECK ("rescheduledFromId" IS NULL OR "rescheduledFromId" <> "id"),
  -- У преподавателя не может быть двух пересекающихся активных занятий
  ADD CONSTRAINT "lessons_teacher_no_overlap"
    EXCLUDE USING gist (
      "teacherId" WITH =,
      tstzrange("startsAt", "endsAt") WITH &&
    ) WHERE ("status" NOT IN ('CANCELED', 'RESCHEDULED'));
