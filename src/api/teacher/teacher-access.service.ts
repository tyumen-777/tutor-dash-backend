import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { revokeTeacherAccess, TEACHER_ROLE } from './teacher-access.js';
import type {
  InviteTeacherDto,
  TeacherAccessResponseDto,
} from './dto/teacher-access.dto.js';

type InviterSession = {
  user: { id: string };
  session: { activeOrganizationId?: string | null };
};

const INVITATION_TTL_DAYS = 7;

@Injectable()
export class TeacherAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getAccess(
    session: InviterSession,
    teacherId: string,
  ): Promise<TeacherAccessResponseDto> {
    const organizationId = this.getOrganizationId(session);
    await this.findTeacher(organizationId, teacherId);

    return this.buildAccess(organizationId, teacherId);
  }

  async invite(
    session: InviterSession,
    teacherId: string,
    dto: InviteTeacherDto,
  ): Promise<TeacherAccessResponseDto> {
    const organizationId = this.getOrganizationId(session);
    const teacher = await this.findTeacher(organizationId, teacherId);

    if (!teacher.isActive) {
      throw new ConflictException('Archived teacher cannot be invited');
    }

    if (teacher.memberId) {
      throw new ConflictException('Teacher already has access');
    }

    const email = dto.email ?? teacher.email?.toLowerCase();

    if (!email) {
      throw new BadRequestException(
        'Email is required: the teacher has no email',
      );
    }

    const existingMember = await this.prisma.member.findFirst({
      where: { organizationId, user: { email } },
      select: { id: true, teacherProfile: { select: { id: true } } },
    });

    // Владелец или админ, который сам ведёт занятия: приглашать некого,
    // карточку сразу привязываем к его учётной записи
    if (existingMember) {
      if (existingMember.teacherProfile) {
        throw new ConflictException(
          'This user is already linked to another teacher',
        );
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.invitation.updateMany({
          where: { organizationId, teacherId, status: 'pending' },
          data: { status: 'canceled' },
        });

        const { count } = await tx.teacher.updateMany({
          where: { id: teacherId, organizationId, memberId: null },
          data: { memberId: existingMember.id },
        });

        if (count === 0) {
          throw new ConflictException('Teacher already has access');
        }
      });

      return this.buildAccess(organizationId, teacherId);
    }

    const otherInvitation = await this.prisma.invitation.findFirst({
      where: {
        organizationId,
        email,
        status: 'pending',
        expiresAt: { gt: new Date() },
        NOT: { teacherId },
      },
      select: { id: true },
    });

    if (otherInvitation) {
      throw new ConflictException(
        'Another pending invitation exists for this email',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Повторное приглашение заменяет прежнее: старая ссылка перестаёт работать
      await tx.invitation.updateMany({
        where: { organizationId, teacherId, status: 'pending' },
        data: { status: 'canceled' },
      });

      await tx.invitation.create({
        data: {
          id: randomUUID(),
          organizationId,
          email,
          role: TEACHER_ROLE,
          status: 'pending',
          expiresAt: this.getExpirationDate(),
          inviterId: session.user.id,
          teacherId,
        },
      });
    });

    return this.buildAccess(organizationId, teacherId);
  }

  async revoke(
    session: InviterSession,
    teacherId: string,
  ): Promise<TeacherAccessResponseDto> {
    const organizationId = this.getOrganizationId(session);
    const teacher = await this.findTeacher(organizationId, teacherId);

    await this.prisma.$transaction((tx) =>
      revokeTeacherAccess(tx, organizationId, teacher),
    );

    return this.buildAccess(organizationId, teacherId);
  }

  private async buildAccess(
    organizationId: string,
    teacherId: string,
  ): Promise<TeacherAccessResponseDto> {
    const teacher = await this.prisma.teacher.findFirstOrThrow({
      where: { id: teacherId, organizationId },
      select: {
        member: {
          select: { user: { select: { id: true, name: true, email: true } } },
        },
        invitations: {
          where: { status: 'pending', expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, email: true, expiresAt: true },
        },
      },
    });

    if (teacher.member) {
      return { status: 'active', invitation: null, user: teacher.member.user };
    }

    const [invitation] = teacher.invitations;

    if (invitation) {
      return {
        status: 'invited',
        invitation: {
          id: invitation.id,
          email: invitation.email,
          expiresAt: invitation.expiresAt.toISOString(),
        },
        user: null,
      };
    }

    return { status: 'none', invitation: null, user: null };
  }

  private async findTeacher(organizationId: string, id: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id, organizationId },
      select: { id: true, email: true, isActive: true, memberId: true },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return teacher;
  }

  private getExpirationDate(): Date {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_TTL_DAYS);

    return expiresAt;
  }

  private getOrganizationId(session: InviterSession): string {
    const organizationId = session.session.activeOrganizationId;

    if (!organizationId) {
      throw new BadRequestException('Active organization is required');
    }

    return organizationId;
  }
}
