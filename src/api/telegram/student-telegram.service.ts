import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';

import { Prisma } from '../../generated/prisma/client.js';
import {
  NotificationType,
  StudentStatus,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import type {
  StudentTelegramInviteResponseDto,
  StudentTelegramResponseDto,
} from './dto/student-telegram.dto.js';
import { TelegramApi } from './telegram-api.js';

type OrganizationSession = {
  user: { id: string };
  session: { activeOrganizationId?: string | null };
};

// Ссылку отправляют ученику в мессенджере, он может открыть её не сразу
const LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function buildChatUnlinkedText(
  firstName: string,
  schoolName: string,
): string {
  return `Уведомления по ученику ${firstName} отключены школой «${schoolName}».`;
}

@Injectable()
export class StudentTelegramService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramApi,
  ) {}

  async getLinks(
    session: OrganizationSession,
    studentId: string,
  ): Promise<StudentTelegramResponseDto> {
    const organizationId = this.getOrganizationId(session);

    await this.findStudent(organizationId, studentId);

    const links = await this.prisma.telegramLink.findMany({
      where: { organizationId, studentId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, username: true, displayName: true, createdAt: true },
    });

    return {
      botEnabled: this.telegram.isEnabled,
      links: links.map((link) => ({
        id: link.id,
        username: link.username,
        displayName: link.displayName,
        connectedAt: link.createdAt.toISOString(),
      })),
    };
  }

  async createInvite(
    session: OrganizationSession,
    studentId: string,
  ): Promise<StudentTelegramInviteResponseDto> {
    const organizationId = this.getOrganizationId(session);
    const student = await this.findStudent(organizationId, studentId);

    if (student.status === StudentStatus.ARCHIVED) {
      throw new BadRequestException('Student is archived');
    }

    if (!this.telegram.isEnabled) {
      throw new ServiceUnavailableException('Telegram bot is not configured');
    }

    const username = await this.telegram.getUsername();
    // 18 байт → 24 символа base64url: допустимый payload для /start (до 64)
    const token = randomBytes(18).toString('base64url');
    const expiresAt = new Date(Date.now() + LINK_TTL_MS);

    await this.prisma.$transaction([
      // Действует только последняя ссылка; заодно чистим просроченные
      this.prisma.telegramLinkToken.deleteMany({
        where: {
          OR: [{ studentId }, { expiresAt: { lt: new Date() } }],
        },
      }),
      this.prisma.telegramLinkToken.create({
        data: {
          token,
          organizationId,
          studentId,
          createdByUserId: session.user.id,
          expiresAt,
        },
      }),
    ]);

    return {
      url: `https://t.me/${username}?start=${token}`,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async deleteLink(
    session: OrganizationSession,
    studentId: string,
    linkId: string,
  ): Promise<void> {
    const organizationId = this.getOrganizationId(session);

    await this.prisma.$transaction(async (tx) => {
      // RETURNING через delete: параллельное отключение увидит 404,
      // и сообщение уйдёт один раз
      const link = await tx.telegramLink
        .delete({
          where: { id: linkId, organizationId, studentId },
          select: {
            chatId: true,
            student: { select: { firstName: true } },
            organization: { select: { name: true } },
          },
        })
        .catch((error: unknown) => {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2025'
          ) {
            throw new NotFoundException('Telegram link not found');
          }

          throw error;
        });

      // Сообщаем человеку, почему уведомления перестанут приходить
      await tx.notification.create({
        data: {
          organizationId,
          studentId,
          chatId: link.chatId,
          type: NotificationType.CHAT_UNLINKED,
          text: buildChatUnlinkedText(
            link.student.firstName,
            link.organization.name,
          ),
        },
      });
    });
  }

  private async findStudent(organizationId: string, studentId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, organizationId },
      select: { id: true, status: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  private getOrganizationId(session: OrganizationSession): string {
    const organizationId = session.session.activeOrganizationId;

    if (!organizationId) {
      throw new BadRequestException('Active organization is required');
    }

    return organizationId;
  }
}
