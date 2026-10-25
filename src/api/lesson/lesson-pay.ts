import { Prisma } from '../../generated/prisma/client.js';

export const LESSON_DURATIONS = [45, 60] as const;

export type LessonDuration = (typeof LESSON_DURATIONS)[number];

// Неполный час считается пропорционально ставке и округляется вверх до 10
const PAY_ROUNDING_STEP = 10;

/**
 * Сумма, начисляемая преподавателю за занятие по его ставке за час.
 */
export function calculateTeacherPay(
  hourlyRate: Prisma.Decimal,
  durationMin: LessonDuration,
): Prisma.Decimal {
  if (durationMin === 60) {
    return hourlyRate;
  }

  return hourlyRate
    .mul(durationMin)
    .div(60)
    .div(PAY_ROUNDING_STEP)
    .ceil()
    .mul(PAY_ROUNDING_STEP);
}
