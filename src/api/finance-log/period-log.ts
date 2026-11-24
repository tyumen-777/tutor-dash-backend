// Тексты журнала о закрытии месяцев

const MONTHS = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
];

/** «октябрь 2026» по месяцу YYYY-MM. */
export function formatMonth(month: string): string {
  const [year, monthNumber] = month.split('-');

  return `${MONTHS[Number(monthNumber) - 1]} ${year}`;
}

export function describePeriodClosed(month: string): string {
  return `Закрыт месяц: ${formatMonth(month)}`;
}

export function describePeriodReopened(month: string): string {
  return `Открыт месяц: ${formatMonth(month)} — его операции снова можно менять`;
}
