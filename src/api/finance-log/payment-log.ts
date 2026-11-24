import type { Prisma } from '../../generated/prisma/client.js';

// Тексты журнала собираются в момент операции и дальше не меняются

const METHOD_LABELS: Record<string, string> = {
  CASH: 'наличные',
  CARD: 'карта',
  TRANSFER: 'перевод',
  OTHER: 'другое',
};

export type PaymentSnapshot = {
  amount: string;
  currency: string;
  method: string;
  paidOn: string;
  comment: string | null;
  lessonsCount: number | null;
  studentName: string;
};

export type PaymentChange = { from: unknown; to: unknown };
export type PaymentChanges = Record<string, PaymentChange>;

export function formatMoney(amount: string, currency: string): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
    .format(Number(amount))
    .replace(/ /g, ' ');
}

export function formatDay(date: string): string {
  const [year, month, day] = date.split('-');

  return `${day}.${month}.${year}`;
}

export function studentName(student: {
  firstName: string;
  lastName: string | null;
}): string {
  return [student.firstName, student.lastName].filter(Boolean).join(' ');
}

function lessons(count: number | null): string | null {
  return count === null ? null : `${count} зан.`;
}

export function describeCreated(payment: PaymentSnapshot): string {
  const parts = [
    formatMoney(payment.amount, payment.currency),
    lessons(payment.lessonsCount),
    METHOD_LABELS[payment.method] ?? payment.method,
    `дата ${formatDay(payment.paidOn)}`,
  ].filter(Boolean);

  return `Оплата от ${payment.studentName}: ${parts.join(' · ')}`;
}

export function describeCanceled(payment: PaymentSnapshot): string {
  const parts = [
    formatMoney(payment.amount, payment.currency),
    lessons(payment.lessonsCount),
  ].filter(Boolean);

  return `Отменена оплата ${payment.studentName} от ${formatDay(payment.paidOn)}: ${parts.join(' · ')}`;
}

/**
 * Сравнивает оплату до и после правки. Возвращает null, если ничего
 * фактически не поменялось — такую правку в журнал не пишем.
 */
export function diffPayment(
  before: PaymentSnapshot,
  after: PaymentSnapshot,
): { changes: PaymentChanges; description: string } | null {
  const changes: PaymentChanges = {};
  const lines: string[] = [];

  if (before.amount !== after.amount) {
    changes.amount = { from: before.amount, to: after.amount };
    lines.push(
      `сумма ${formatMoney(before.amount, before.currency)} → ${formatMoney(after.amount, after.currency)}`,
    );
  }

  if (before.lessonsCount !== after.lessonsCount) {
    changes.lessonsCount = {
      from: before.lessonsCount,
      to: after.lessonsCount,
    };
    lines.push(`занятий ${before.lessonsCount} → ${after.lessonsCount}`);
  }

  if (before.paidOn !== after.paidOn) {
    changes.paidOn = { from: before.paidOn, to: after.paidOn };
    lines.push(`дата ${formatDay(before.paidOn)} → ${formatDay(after.paidOn)}`);
  }

  if (before.method !== after.method) {
    changes.method = { from: before.method, to: after.method };
    lines.push(
      `способ ${METHOD_LABELS[before.method] ?? before.method} → ${METHOD_LABELS[after.method] ?? after.method}`,
    );
  }

  if (before.comment !== after.comment) {
    changes.comment = { from: before.comment, to: after.comment };
    lines.push(
      after.comment ? `комментарий: «${after.comment}»` : 'комментарий удалён',
    );
  }

  if (lines.length === 0) {
    return null;
  }

  return {
    changes,
    description: `Оплата ${before.studentName} от ${formatDay(before.paidOn)}: ${lines.join('; ')}`,
  };
}

export function toJson(changes: PaymentChanges): Prisma.InputJsonValue {
  return changes as Prisma.InputJsonValue;
}
