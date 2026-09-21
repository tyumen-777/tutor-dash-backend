-- Дополнительные PostgreSQL-ограничения для схемы Prisma.
-- Этот файл нужно перенести в SQL первой/следующей Prisma-миграции.
-- Prisma schema не описывает эти вещи полностью декларативно.

create extension if not exists pgcrypto;
create extension if not exists citext;
create extension if not exists btree_gist;
create extension if not exists pg_trgm;

alter table classrooms
  add constraint classrooms_capacity_positive
  check (capacity is null or capacity > 0);

alter table teachers
  add constraint teachers_hourly_rate_non_negative
  check (hourly_rate_cents is null or hourly_rate_cents >= 0);

alter table groups
  add constraint groups_max_students_positive
  check (max_students is null or max_students > 0);

alter table enrollments
  add constraint enrollments_date_order
  check (ended_at is null or ended_at >= started_at);

alter table lesson_series
  add constraint lesson_series_group_or_student
  check (
    (group_id is not null and student_id is null)
    or (group_id is null and student_id is not null)
  );

alter table lessons
  add constraint lessons_time_order
  check (ends_at > starts_at);

alter table lessons
  add constraint lessons_teacher_no_overlap
  exclude using gist (
    teacher_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (status = 'planned');

alter table lessons
  add constraint lessons_classroom_no_overlap
  exclude using gist (
    classroom_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (status = 'planned' and classroom_id is not null);

alter table price_plans
  add constraint price_plans_lessons_count_positive
  check (lessons_count is null or lessons_count > 0);

alter table price_plans
  add constraint price_plans_amount_non_negative
  check (amount_cents >= 0);

alter table price_plans
  add constraint price_plans_date_order
  check (valid_to is null or valid_to >= valid_from);

alter table invoices
  add constraint invoices_total_amount_non_negative
  check (total_amount_cents >= 0);

alter table invoices
  add constraint invoices_paid_amount_non_negative
  check (paid_amount_cents >= 0);

alter table invoices
  add constraint invoices_paid_not_greater_than_total
  check (paid_amount_cents <= total_amount_cents);

alter table payments
  add constraint payments_amount_positive
  check (amount_cents > 0);

alter table lesson_credits
  add constraint lesson_credits_initial_positive
  check (initial_lessons > 0);

alter table lesson_credits
  add constraint lesson_credits_remaining_non_negative
  check (remaining_lessons >= 0);

alter table lesson_credits
  add constraint lesson_credits_remaining_not_greater_than_initial
  check (remaining_lessons <= initial_lessons);

alter table lesson_credit_usages
  add constraint lesson_credit_usages_used_positive
  check (used_lessons > 0);

alter table files
  add constraint files_size_positive
  check (size_bytes > 0);

create index idx_refresh_tokens_user_active
  on refresh_tokens (user_id, expires_at)
  where revoked_at is null;

create index idx_invoices_due_unpaid
  on invoices (due_at)
  where status in ('issued', 'partially_paid', 'overdue');

create index idx_payments_paid_at_paid
  on payments (paid_at)
  where status = 'paid';

create index idx_lesson_credits_student_active
  on lesson_credits (student_id, expires_at)
  where remaining_lessons > 0;

create index idx_persons_full_name_trgm
  on persons using gin (
    (last_name || ' ' || first_name || ' ' || coalesce(middle_name, '')) gin_trgm_ops
  );
