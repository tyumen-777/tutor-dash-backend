export const LOW_BALANCE_NOTIFY_MAX = 20;

// Метка низкого остатка в сообщениях ученику
export const LOW_BALANCE_MARK = '❗️❗️❗️';

const TOP_UP_HINT =
  'Чтобы занятия продолжались без перерыва, пополните абонемент — напишите своему менеджеру.';

export function pluralizeLessons(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} занятие`;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} занятия`;
  }

  return `${count} занятий`;
}

/**
 * Остаток не выше порога. threshold = null — уведомление выключено.
 */
export function isLowBalance(
  threshold: number | null,
  lessonsLeft: number,
): boolean {
  return threshold !== null && lessonsLeft <= threshold;
}

/**
 * Отдельное уведомление отправляется один раз — в момент, когда остаток
 * опускается до порога: было больше порога, стало не больше.
 */
export function crossedLowBalance(
  threshold: number | null,
  before: number,
  after: number,
): boolean {
  return !isLowBalance(threshold, before) && isLowBalance(threshold, after);
}

function formatBalance(lessonsLeft: number): string {
  return lessonsLeft === 0
    ? 'оплаченные занятия закончились'
    : `осталось ${pluralizeLessons(lessonsLeft)}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Строки о низком остатке: добавляются в сообщение о проведённом занятии.
 */
export function buildLowBalanceLines(lessonsLeft: number): string[] {
  return [
    `${LOW_BALANCE_MARK} ${capitalize(formatBalance(lessonsLeft))}.`,
    TOP_UP_HINT,
  ];
}

export function buildLowBalanceText(params: {
  firstName: string;
  schoolName: string;
  lessonsLeft: number;
}): string {
  const { firstName, schoolName, lessonsLeft } = params;

  return [
    `${LOW_BALANCE_MARK} Заканчиваются оплаченные занятия`,
    '',
    `Здравствуйте, ${firstName}!`,
    `В школе «${schoolName}» у вас ${formatBalance(lessonsLeft)}.`,
    TOP_UP_HINT,
  ].join('\n');
}
