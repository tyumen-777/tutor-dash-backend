-- Отдельная миграция: новое значение enum нельзя использовать в той же
-- транзакции, в которой оно добавлено.
--
-- Дописываем в журнал уже проведённые выплаты. Отменённые восстановить нельзя:
-- при отмене занятия отвязываются от выплаты, и состав выплаты теряется.
INSERT INTO "finance_logs" (
  "id", "organizationId", "entityType", "entityId", "teacherId", "action",
  "description", "actorUserId", "createdAt"
)
SELECT
  gen_random_uuid(),
  e."organizationId",
  'PAYOUT',
  e."id",
  e."teacherId",
  'CREATED',
  'Выплата преподавателю ' || COALESCE(t."fullName", e."recipient", '—') || ': '
    || regexp_replace(trunc(e."amount")::text, '(\d)(?=(\d{3})+$)', '\1 ', 'g')
    || CASE WHEN e."amount" <> trunc(e."amount")
         THEN ',' || lpad(((e."amount" - trunc(e."amount")) * 100)::int::text, 2, '0')
         ELSE '' END
    || ' ' || CASE e."currency" WHEN 'RUB' THEN '₽' ELSE e."currency" END
    || ' · ' || l."lessonsCount" || ' зан.'
    -- Период выплаты хранится только в тексте описания расхода
    || COALESCE(' · период ' || substring(e."description" from '\d{2}\.\d{2}\.\d{4}–\d{2}\.\d{2}\.\d{4}'), '')
    || ' · ' || CASE e."method"
         WHEN 'CASH' THEN 'наличные'
         WHEN 'CARD' THEN 'карта'
         WHEN 'TRANSFER' THEN 'перевод'
         ELSE 'другое' END
    || ' · дата ' || to_char(e."spentOn", 'DD.MM.YYYY'),
  e."createdByUserId",
  e."createdAt"
FROM "expenses" e
JOIN (
  SELECT "payoutExpenseId", count(*) AS "lessonsCount"
  FROM "lessons"
  WHERE "payoutExpenseId" IS NOT NULL
  GROUP BY "payoutExpenseId"
) l ON l."payoutExpenseId" = e."id"
LEFT JOIN "teachers" t ON t."id" = e."teacherId"
WHERE e."status" <> 'CANCELED'
  AND NOT EXISTS (
    SELECT 1 FROM "finance_logs" f
    WHERE f."entityType" = 'PAYOUT' AND f."entityId" = e."id"
  );
