-- AlterTable: ФИО одной строкой, ставка за час, Telegram и дата начала работы
ALTER TABLE "teachers"
ADD COLUMN "fullName" TEXT,
ADD COLUMN "telegram" TEXT,
ADD COLUMN "startedOn" DATE;

UPDATE "teachers"
SET "fullName" = concat_ws(' ', "lastName", "firstName"),
    "startedOn" = ("createdAt" AT TIME ZONE 'UTC')::date;

ALTER TABLE "teachers"
ALTER COLUMN "fullName" SET NOT NULL,
ALTER COLUMN "startedOn" SET NOT NULL,
DROP COLUMN "firstName",
DROP COLUMN "lastName";

ALTER TABLE "teachers" RENAME COLUMN "lessonRate" TO "hourlyRate";

ALTER TABLE "teachers" RENAME CONSTRAINT "teachers_lesson_rate_check" TO "teachers_hourly_rate_check";

-- CreateIndex
CREATE INDEX "teachers_organizationId_fullName_idx" ON "teachers"("organizationId", "fullName");
