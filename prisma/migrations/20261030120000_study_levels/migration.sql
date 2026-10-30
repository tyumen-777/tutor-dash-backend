-- CreateTable
CREATE TABLE "study_levels" (
    "id" UUID NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "study_levels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "study_levels_organizationId_code_key" ON "study_levels"("organizationId", "code");

-- AddForeignKey
ALTER TABLE "study_levels" ADD CONSTRAINT "study_levels_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "students" ADD COLUMN "levelId" UUID;

-- Перенос уровня из свободного текста в справочник: каждое уникальное
-- значение школы становится уровнем с одинаковыми обозначением и названием
INSERT INTO "study_levels" ("id", "organizationId", "code", "name", "updatedAt")
SELECT DISTINCT ON ("organizationId", left(btrim("level"), 20))
  gen_random_uuid(),
  "organizationId",
  left(btrim("level"), 20),
  left(btrim("level"), 100),
  CURRENT_TIMESTAMP
FROM "students"
WHERE "level" IS NOT NULL AND btrim("level") <> ''
ORDER BY "organizationId", left(btrim("level"), 20), "createdAt";

UPDATE "students" AS s
SET "levelId" = l."id"
FROM "study_levels" AS l
WHERE l."organizationId" = s."organizationId"
  AND l."code" = left(btrim(s."level"), 20);

ALTER TABLE "students" DROP COLUMN "level";

-- CreateIndex
CREATE INDEX "students_levelId_idx" ON "students"("levelId");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "study_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
