import type { Prisma } from '../../generated/prisma/client.js';
import {
  NotificationType,
  StudentStatus,
  SubscriptionStatus,
} from '../../generated/prisma/enums.js';
import { buildLessonCompletedText } from './lesson-completed.js';
import {
  buildLowBalanceText,
  crossedLowBalance,
  isLowBalance,
} from './low-balance.js';

type HeldLesson = {
  startsAt: Date;
  teacher: { fullName: string };
};

/**
 * Ставит в очередь уведомления ученику после проведённого занятия, которое
 * списало одно занятие с абонемента. Вызывается в той же транзакции.
 *
 * - Включено «о проведённом занятии» — одно сообщение с остатком; при
 *   остатке не выше порога в нём же предупреждение с ❗️.
 * - Выключено — отдельное предупреждение, только когда остаток опустился
 *   до порога.
 */
export async function enqueueLessonHeldNotifications(
  tx: Prisma.TransactionClient,
  organizationId: string,
  studentId: string,
  lesson: HeldLesson,
): Promise<void> {
  const [organization, student, balance] = await Promise.all([
    tx.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: {
        name: true,
        timezone: true,
        lowBalanceNotifyAt: true,
        notifyLessonCompleted: true,
      },
    }),
    tx.student.findUniqueOrThrow({
      where: { id: studentId },
      select: {
        firstName: true,
        status: true,
        timezone: true,
        telegramLinks: { select: { chatId: true } },
      },
    }),
    // Остаток — как в GET /students/:id/balance: сумма по неотменённым пакетам
    tx.studentSubscription.aggregate({
      where: { studentId, status: { not: SubscriptionStatus.CANCELED } },
      _sum: { lessonsLeft: true },
    }),
  ]);

  if (
    student.status !== StudentStatus.ACTIVE ||
    student.telegramLinks.length === 0
  ) {
    return;
  }

  const lessonsLeft = balance._sum.lessonsLeft ?? 0;
  const threshold = organization.lowBalanceNotifyAt;
  let type: NotificationType;
  let text: string;

  if (organization.notifyLessonCompleted) {
    type = NotificationType.LESSON_COMPLETED;
    text = buildLessonCompletedText({
      schoolName: organization.name,
      firstName: student.firstName,
      startsAt: lesson.startsAt,
      timezone: student.timezone ?? organization.timezone,
      teacherName: lesson.teacher.fullName,
      lessonsLeft,
      lowBalance: isLowBalance(threshold, lessonsLeft),
    });
  } else if (crossedLowBalance(threshold, lessonsLeft + 1, lessonsLeft)) {
    type = NotificationType.LOW_BALANCE;
    text = buildLowBalanceText({
      firstName: student.firstName,
      schoolName: organization.name,
      lessonsLeft,
    });
  } else {
    return;
  }

  await tx.notification.createMany({
    data: student.telegramLinks.map((link) => ({
      organizationId,
      studentId,
      chatId: link.chatId,
      type,
      text,
    })),
  });
}
