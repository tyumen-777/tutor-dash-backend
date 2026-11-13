import { ForbiddenException } from '@nestjs/common';

import type { PrismaService } from '../../infra/prisma/prisma.service.js';
import { parseMemberRoles, TEACHER_ROLE } from '../teacher/teacher-access.js';

export type ScopedSession = {
  user: { id: string };
  session: { activeOrganizationId?: string | null };
};

/** Teacher whose data the request is limited to; null — the whole school. */
export type TeacherScope = { teacherId: string } | null;

// Роли, которым видна вся школа; teacher в паре с любой из них не ограничивает
const SCHOOL_WIDE_ROLES = ['owner', 'admin', 'manager', 'accountant'];

/**
 * Определяет, ограничен ли запрос данными одного преподавателя. Участник,
 * у которого из ролей только teacher, видит лишь свою карточку: без
 * привязанной активной карточки ему ничего не доступно.
 */
export async function resolveTeacherScope(
  prisma: PrismaService,
  organizationId: string,
  session: ScopedSession,
): Promise<TeacherScope> {
  const member = await prisma.member.findUnique({
    where: {
      organizationId_userId: { organizationId, userId: session.user.id },
    },
    select: {
      role: true,
      teacherProfile: { select: { id: true, isActive: true } },
    },
  });

  const roles = member ? parseMemberRoles(member.role) : [];

  if (roles.some((role) => SCHOOL_WIDE_ROLES.includes(role))) {
    return null;
  }

  if (!roles.includes(TEACHER_ROLE)) {
    throw new ForbiddenException('Insufficient organization role');
  }

  const profile = member?.teacherProfile;

  if (!profile || !profile.isActive) {
    throw new ForbiddenException('Teacher profile is not linked');
  }

  return { teacherId: profile.id };
}
