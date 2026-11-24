import {
  addDays,
  schoolToday,
  startOfSchoolDay,
} from '../dashboard/school-date.js';

// Сколько дней назад преподаватель может сам внести занятие (сегодня + 7 дней)
export const TEACHER_BACKDATE_DAYS = 7;

/**
 * Самое раннее начало занятия, которое преподаватель может внести сам:
 * полночь по часам школы TEACHER_BACKDATE_DAYS дней назад. Более старые
 * занятия вносит менеджер — иначе преподаватель мог бы задним числом
 * списать занятия у ученика и начислить себе оплату.
 */
export function teacherEarliestLessonStart(
  timezone: string,
  now = new Date(),
): Date {
  return startOfSchoolDay(
    addDays(schoolToday(timezone, now), -TEACHER_BACKDATE_DAYS),
    timezone,
  );
}
