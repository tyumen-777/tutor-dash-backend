-- Полный сброс данных школ: остаётся только SaaS-администратор (user.isSaasAdmin).
-- Удаляет ВСЕ школы, сотрудников, учеников, занятия, оплаты, расходы и историю.
-- Перед запуском обязательно сделайте резервную копию базы.
--
-- Запуск: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/reset-school-data.sql

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "user" WHERE "isSaasAdmin") THEN
    RAISE EXCEPTION 'No SaaS admin user found, nothing was deleted';
  END IF;
END $$;

-- Все таблицы перечислены явно и без CASCADE: если появится новая таблица,
-- которая ссылается на эти, TRUNCATE упадёт, а не очистит её молча.
-- session тоже очищается: все, включая администратора, войдут заново.
TRUNCATE TABLE
  "organization",
  "member",
  "invitation",
  "session",
  "verification",
  "students",
  "guardians",
  "student_guardians",
  "teachers",
  "study_levels",
  "subscription_plans",
  "student_subscriptions",
  "subscription_usages",
  "payments",
  "schedule_rules",
  "lessons",
  "lesson_participants",
  "expenses",
  "finance_logs",
  "period_locks";

-- Пароли и сами пользователи всех, кроме SaaS-администратора
DELETE FROM "user" WHERE NOT "isSaasAdmin";

SELECT
  (SELECT count(*) FROM "user") AS users_left,
  (SELECT count(*) FROM "user" WHERE "isSaasAdmin") AS saas_admins,
  (SELECT count(*) FROM "account") AS accounts_left,
  (SELECT count(*) FROM "organization") AS organizations_left;

COMMIT;
