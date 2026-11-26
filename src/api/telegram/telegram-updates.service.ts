import { Injectable, Logger } from '@nestjs/common';

import { StudentStatus } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import {
  TelegramApi,
  type TelegramMessage,
  type TelegramUpdate,
} from './telegram-api.js';

const GREETING = [
  'Vj
].join('\n');

const LINK_INVALID =
  'Ссылка подключения устарела или уже использована. Попросите в школе новую.';

const STOPPED =
  'Уведомления отключены. Чтобы подключить их снова, попросите в школе новую ссылку.';

const NOT_LINKED = 'Уведомления в этом чате не подключены.';

/**
 * Обрабатывает входящие обновления бота: /start <token>, /stop,
 * блокировку бота пользователем.
 */
@Injectable()
export class TelegramUpdatesService {
  private readonly logger = new Logger(TelegramUpdatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramApi,
  ) {}

  async handleUpdate(update: TelegramUpdate): Promise<void> {
    try {
      if (update.message) {
        await this.handleMessage(update.message);
      } else if (update.my_chat_member) {
        const { chat, new_chat_member } = update.my_chat_member;

        // Пользователь заблокировал бота: больше не пишем в этот чат
        if (new_chat_member.status === 'kicked') {
          await this.unlinkChat(chat.id);
        }
      }
    } catch (error) {
      // Ошибку не пробрасываем: иначе Telegram будет повторять обновление
      this.logger.error(`Failed to handle update ${update.update_id}`, error);
    }
  }

  private async handleMessage(message: TelegramMessage): Promise<void> {
    // Подключаем только личные чаты
    if (message.chat.type !== 'private' || !message.text) {
      return;
    }

    const [command, payload] = message.text.trim().split(/\s+/, 2);

    if (command === '/start') {
      const reply = payload ? await this.linkChat(message, payload) : GREETING;

      await this.telegram.sendMessage(message.chat.id, reply);
      return;
    }

    if (command === '/stop') {
      const count = await this.unlinkChat(message.chat.id);

      await this.telegram.sendMessage(
        message.chat.id,
        count > 0 ? STOPPED : NOT_LINKED,
      );
      return;
    }

    await this.telegram.sendMessage(message.chat.id, GREETING);
  }

  private async linkChat(
    message: TelegramMessage,
    token: string,
  ): Promise<string> {
    const chatId = BigInt(message.chat.id);
    const from = message.from;
    const displayName =
      [from?.first_name, from?.last_name].filter(Boolean).join(' ') || null;

    return this.prisma.$transaction(async (tx) => {
      // Токен одноразовый: удаление вернёт строку только одному запросу
      const [linkToken] = await tx.telegramLinkToken.findMany({
        where: { token },
        include: {
          student: { select: { firstName: true, status: true } },
          organization: { select: { name: true } },
        },
        take: 1,
      });

      if (!linkToken) {
        return LINK_INVALID;
      }

      const { count } = await tx.telegramLinkToken.deleteMany({
        where: { token, expiresAt: { gt: new Date() } },
      });

      if (count === 0 || linkToken.student.status === StudentStatus.ARCHIVED) {
        return LINK_INVALID;
      }

      await tx.telegramLink.upsert({
        where: {
          studentId_chatId: { studentId: linkToken.studentId, chatId },
        },
        create: {
          organizationId: linkToken.organizationId,
          studentId: linkToken.studentId,
          chatId,
          username: from?.username ?? null,
          displayName,
        },
        update: { username: from?.username ?? null, displayName },
      });

      return [
        `Готово ✅ Уведомления школы «${linkToken.organization.name}» для ученика ${linkToken.student.firstName} подключены.`,
        '',
        'Я буду сообщать о проведённых занятиях и остатке в абонементе.',
        'Отключить уведомления: /stop',
      ].join('\n');
    });
  }

  private async unlinkChat(chatId: number | bigint): Promise<number> {
    const { count } = await this.prisma.telegramLink.deleteMany({
      where: { chatId: BigInt(chatId) },
    });

    return count;
  }
}
