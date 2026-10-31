-- AlterEnum: удалённое занятие. Отдельная миграция: новое значение enum
-- нельзя использовать в той же транзакции, где оно добавлено
ALTER TYPE "LessonStatus" ADD VALUE 'DELETED';
