import type { Prisma } from '../../generated/prisma/client.js';

export const TEACHER_ROLE = 'teacher';

// better-auth хранит несколько ролей участника строкой через запятую
export function parseMemberRoles(role: string): string[] {
  return role
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Закрывает преподавателю личный кабинет: отменяет ожидающие приглашения и
 * отвязывает учётную запись. Участника, у которого кроме роли teacher ничего
 * нет, удаляем из школы; владелец или админ, который сам ведёт занятия,
 * остаётся в школе со своими правами.
 */
export async function revokeTeacherAccess(
  tx: Prisma.TransactionClient,
  organizationId: string,
  teacher: { id: string; memberId: string | null },
): Promise<void> {
  await tx.invitation.updateMany({
    where: { organizationId, teacherId: teacher.id, status: 'pending' },
    data: { status: 'canceled' },
  });

  if (!teacher.memberId) {
    return;
  }

  const member = await tx.member.findUnique({
    where: { id: teacher.memberId },
    select: { id: true, userId: true, role: true },
  });

  if (!member) {
    return;
  }

  const roles = parseMemberRoles(member.role);

  if (roles.length > 0 && roles.every((role) => role === TEACHER_ROLE)) {
    // Teacher.memberId обнулится по onDelete: SetNull
    await tx.member.delete({ where: { id: member.id } });
    // Без этого открытые сессии продолжат указывать на школу
    await tx.session.updateMany({
      where: { userId: member.userId, activeOrganizationId: organizationId },
      data: { activeOrganizationId: null },
    });
    return;
  }

  await tx.teacher.update({
    where: { id: teacher.id },
    data: { memberId: null },
  });
}
