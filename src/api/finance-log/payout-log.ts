import { formatDay, formatMoney, METHOD_LABELS } from './payment-log.js';

// Тексты журнала собираются в момент операции и дальше не меняются

export type PayoutSnapshot = {
  teacherName: string;
  amount: string;
  currency: string;
  lessonsCount: number;
  method: string;
  paidOn: string;
  // Период занятий; известен только при проведении выплаты
  period?: { from: string; to: string };
};

export function describePayoutCreated(payout: PayoutSnapshot): string {
  const parts = [
    formatMoney(payout.amount, payout.currency),
    `${payout.lessonsCount} зан.`,
    payout.period
      ? `период ${formatDay(payout.period.from)}–${formatDay(payout.period.to)}`
      : null,
    METHOD_LABELS[payout.method] ?? payout.method,
    `дата ${formatDay(payout.paidOn)}`,
  ].filter(Boolean);

  return `Выплата преподавателю ${payout.teacherName}: ${parts.join(' · ')}`;
}

export function describePayoutCanceled(payout: PayoutSnapshot): string {
  return `Отменена выплата преподавателю ${payout.teacherName} от ${formatDay(payout.paidOn)}: ${formatMoney(payout.amount, payout.currency)} · ${payout.lessonsCount} зан. снова к выплате`;
}
