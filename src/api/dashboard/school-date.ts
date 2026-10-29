// Даты (YYYY-MM-DD) считаются по календарю школы, а не сервера

export function schoolToday(timezone: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);

  return next.toISOString().slice(0, 10);
}

/**
 * Тот же отрезок дней в предыдущем месяце: для 1–15 октября это 1–15
 * сентября, для 1–31 марта — 1–28 февраля.
 */
export function previousMonthRange(
  from: string,
  to: string,
): { from: string; to: string } {
  const [year, month] = from.split('-').map(Number);
  const previousStart = new Date(Date.UTC(year, month - 2, 1));
  const previousEnd = new Date(Date.UTC(year, month - 1, 0));
  const day = Math.min(Number(to.slice(8, 10)), previousEnd.getUTCDate());
  previousEnd.setUTCDate(day);

  return {
    from: previousStart.toISOString().slice(0, 10),
    to: previousEnd.toISOString().slice(0, 10),
  };
}

// Полночь даты в указанном часовом поясе, переведённая в UTC
export function startOfSchoolDay(date: string, timezone: string): Date {
  const utcMidnight = new Date(`${date}T00:00:00.000Z`);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(utcMidnight);
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  const zoned = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
  );

  return new Date(utcMidnight.getTime() - (zoned - utcMidnight.getTime()));
}
