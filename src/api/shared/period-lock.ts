import { ConflictException } from '@nestjs/common';

import type { Prisma } from '../../generated/prisma/client.js';
import { schoolToday } from '../dashboard/school-date.js';

/**
 * Дата, по которой операция относится к месяцу:
 * - строка YYYY-MM-DD — уже дата по календарю школы (оплата, расход);
 * - Date — момент времени (начало занятия), месяц берётся по часам школы.
 * Даты, которые хранятся как полночь или полдень UTC (paidAt, spentOn),
 * передаются строкой, чтобы не съехать на соседние сутки.
 */
export type PeriodDate = string | Date;

/** Месяц (YYYY-MM) по дате YYYY-MM-DD. */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/** Первое число месяца (YYYY-MM) в виде значения колонки DATE. */
export function monthToDate(month: string): Date {
  return new Date(`${month}-01T00:00:00.000Z`);
}

export function closedPeriodException(month: string): ConflictException {
  return new ConflictException(`Period ${month} is closed`);
}

/**
 * Блокирует строку школы и возвращает её часовой пояс.
 *
 * Операции с деньгами берут FOR SHARE (и не мешают друг другу), закрытие
 * месяца — FOR UPDATE. Поэтому месяц не закроется посреди транзакции,
 * которая уже проверила, что он открыт, и наоборот: операция, начатая
 * после закрытия, увидит закрытый месяц.
 */
export async function lockOrganization(
  tx: Prisma.TransactionClient,
  organizationId: string,
  mode: 'share' | 'update',
): Promise<string> {
  const rows =
    mode === 'update'
      ? await tx.$queryRaw<{ timezone: string }[]>`
          SELECT "timezone" FROM "organization"
          WHERE "id" = ${organizationId} FOR UPDATE`
      : await tx.$queryRaw<{ timezone: string }[]>`
          SELECT "timezone" FROM "organization"
          WHERE "id" = ${organizationId} FOR SHARE`;

  if (!rows[0]) {
    throw new ConflictException('Organization not found');
  }

  return rows[0].timezone;
}

/**
 * Запрещает операцию, если хотя бы одна из дат попадает в закрытый месяц.
 * Вызывается внутри транзакции, которая затем меняет данные.
 */
export async function assertPeriodsOpen(
  tx: Prisma.TransactionClient,
  organizationId: string,
  dates: PeriodDate[],
): Promise<void> {
  const timezone = await lockOrganization(tx, organizationId, 'share');
  const months = [
    ...new Set(
      dates.map((date) =>
        monthOf(typeof date === 'string' ? date : schoolToday(timezone, date)),
      ),
    ),
  ];

  if (months.length === 0) {
    return;
  }

  const locked = await tx.periodLock.findFirst({
    where: { organizationId, month: { in: months.map(monthToDate) } },
    orderBy: { month: 'asc' },
    select: { month: true },
  });

  if (locked) {
    throw closedPeriodException(locked.month.toISOString().slice(0, 7));
  }
}
