import { Prisma } from '../../generated/prisma/client.js';

export type FinanceInput = {
  // Поступления и оплаченные расходы месяца — движение денег
  income: Prisma.Decimal;
  paidExpenses: Prisma.Decimal;
  // Стоимость проведённых в месяце занятий по цене урока в их пакетах
  revenue: Prisma.Decimal;
  // Начислено преподавателям за занятия месяца, выплачено или нет
  teacherPay: Prisma.Decimal;
  // Оплаченные расходы месяца, кроме выплат преподавателям
  otherExpenses: Prisma.Decimal;
  // Стоимость оплаченных, но ещё не проведённых занятий
  prepaid: Prisma.Decimal;
  // Начислено преподавателям, но не выплачено (за всё время)
  teacherDebt: Prisma.Decimal;
};

/**
 * Прибыль считается по проведённым занятиям, а не по движению денег:
 * предоплата за будущие уроки ещё не заработана, а зарплата относится
 * к месяцу занятий, а не к дате выплаты. Выплаты преподавателям в прочие
 * расходы не входят, иначе зарплата учлась бы дважды.
 */
export function buildFinance(input: FinanceInput) {
  const money = (value: Prisma.Decimal) => value.toFixed(2);
  const profit = input.revenue
    .minus(input.teacherPay)
    .minus(input.otherExpenses);

  return {
    revenue: money(input.revenue),
    teacherPay: money(input.teacherPay),
    otherExpenses: money(input.otherExpenses),
    profit: money(profit),
    cashFlow: money(input.income.minus(input.paidExpenses)),
    prepaid: money(input.prepaid),
    teacherDebt: money(input.teacherDebt),
  };
}
