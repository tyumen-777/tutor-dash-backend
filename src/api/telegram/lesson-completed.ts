import { buildLowBalanceLines, pluralizeLessons } from './low-balance.js';

/**
 * «27 ноября» в часовом поясе ученика (или школы).
 */
export function formatLessonDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: timezone,
    day: 'numeric',
    month: 'long',
  }).format(date);
}

export function buildLessonCompletedText(params: {
  schoolName: string;
  firstName: string;
  startsAt: Date;
  timezone: string;
  teacherName: string;
  lessonsLeft: number;
  lowBalance: boolean;
}): string {
  return [
    `✅ Занятие проведено — «${params.schoolName}»`,
    '',
    `Ученик: ${params.firstName}`,
    `Дата: ${formatLessonDate(params.startsAt, params.timezone)}`,
    `Преподаватель: ${params.teacherName}`,
    '',
    ...(params.lowBalance
      ? buildLowBalanceLines(params.lessonsLeft)
      : [`Остаток: ${pluralizeLessons(params.lessonsLeft)}.`]),
  ].join('\n');
}
