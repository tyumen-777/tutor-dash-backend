import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';

import { NotificationStatus } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { TelegramApi, TelegramApiError } from './telegram-api.js';

const TICK_MS = 5_000;
const BATCH_SIZE = 25;
// Telegram: не больше ~30 сообщений в секунду на бота
const SEND_INTERVAL_MS = 50;
const MAX_ATTEMPTS = 5;

type PendingNotification = {
  id: string;
  chatId: bigint;
  text: string;
  attempts: number;
};

/**
 * Повтор с растущей паузой: 1, 2, 4, 8 минут.
 */
export function retryDelayMs(attempts: number): number {
  return 60_000 * 2 ** Math.max(0, attempts - 1);
}

/**
 * Фоновая отправка очереди Notification. Несколько инстансов API не
 * отправят одно сообщение дважды: строки забираются FOR UPDATE SKIP LOCKED.
 */
@Injectable()
export class NotificationSender
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(NotificationSender.name);
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramApi,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.telegram.isEnabled) {
      return;
    }

    this.timer = setInterval(() => void this.tick(), TICK_MS);
  }

  onApplicationShutdown(): void {
    clearInterval(this.timer);
  }

  async tick(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;

    try {
      await this.prisma.$transaction(
        async (tx) => {
          const batch = await tx.$queryRaw<PendingNotification[]>`
            SELECT "id", "chatId", "text", "attempts"
            FROM "notifications"
            WHERE "status" = 'PENDING' AND "sendAt" <= now()
            ORDER BY "sendAt"
            LIMIT ${BATCH_SIZE}
            FOR UPDATE SKIP LOCKED`;

          for (const notification of batch) {
            await this.send(tx, notification);
            await new Promise((resolve) =>
              setTimeout(resolve, SEND_INTERVAL_MS),
            );
          }
        },
        { timeout: 60_000 },
      );
    } catch (error) {
      this.logger.error('Failed to send notifications', error);
    } finally {
      this.running = false;
    }
  }

  private async send(
    tx: Pick<PrismaService, 'notification' | 'telegramLink'>,
    notification: PendingNotification,
  ): Promise<void> {
    try {
      await this.telegram.sendMessage(notification.chatId, notification.text);
      await tx.notification.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
          attempts: { increment: 1 },
          lastError: null,
        },
      });
    } catch (error) {
      const attempts = notification.attempts + 1;
      const message = error instanceof Error ? error.message : String(error);

      // Бот заблокирован: отключаем чат, повторять бессмысленно
      if (error instanceof TelegramApiError && error.isChatUnavailable) {
        await tx.telegramLink.deleteMany({
          where: { chatId: notification.chatId },
        });
        await tx.notification.update({
          where: { id: notification.id },
          data: {
            status: NotificationStatus.FAILED,
            attempts,
            lastError: message,
          },
        });
        return;
      }

      // 429 не считается попыткой: ждём, сколько попросил Telegram
      const isRateLimited =
        error instanceof TelegramApiError && error.retryAfter !== undefined;
      const failed = !isRateLimited && attempts >= MAX_ATTEMPTS;
      const delay = isRateLimited
        ? (error as TelegramApiError).retryAfter! * 1000
        : retryDelayMs(attempts);

      this.logger.warn(`Notification ${notification.id}: ${message}`);
      await tx.notification.update({
        where: { id: notification.id },
        data: {
          status: failed
            ? NotificationStatus.FAILED
            : NotificationStatus.PENDING,
          attempts: isRateLimited ? notification.attempts : attempts,
          sendAt: new Date(Date.now() + delay),
          lastError: message,
        },
      });
    }
  }
}
