-- AlterTable: дата увольнения для архива преподавателей
ALTER TABLE "teachers" ADD COLUMN "endedOn" DATE;

UPDATE "teachers"
SET "endedOn" = GREATEST("startedOn", ("updatedAt" AT TIME ZONE 'UTC')::date)
WHERE "isActive" = false;

-- CheckConstraint
ALTER TABLE "teachers"
  ADD CONSTRAINT "teachers_ended_on_check" CHECK ("endedOn" IS NULL OR "endedOn" >= "startedOn"),
  ADD CONSTRAINT "teachers_archive_check" CHECK ("isActive" = ("endedOn" IS NULL));
