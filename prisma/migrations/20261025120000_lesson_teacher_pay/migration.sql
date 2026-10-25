-- AlterTable: сумма, начисленная преподавателю за проведённое занятие
ALTER TABLE "lessons"
ADD COLUMN "teacherPay" DECIMAL(12,2);
