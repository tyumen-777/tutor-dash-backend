import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../../config/index.js';
import { TelegramApi } from './telegram-api.js';
import { TelegramUpdatesService } from './telegram-updates.service.js';

const POLL_TIMEOUT_SEC = 25;
const POLL_ERROR_DELAY_MS = 5_000;
const START_RETRY_MAX_MS = 5 * 60_000;

/**
 * Пауза перед повторным запуском бота: 5, 10, 20 … секунд, не больше 5 минут.
 */
export function startRetryDelayMs(attempt: number): number {
  return Math.min(5_000 * 2 ** (attempt - 1), START_RETRY_MAX_MS);
}

/**
 * Подключает бота к Telegram при старте приложения: в production — webhook
 * (TELEGRAM_WEBHOOK_URL), локально — long polling.
 */
@Injectable()
export class TelegramBotRunner
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(TelegramBotRunner.name);
  private readonly abort = new AbortController();

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly telegram: TelegramApi,
    private readonly updates: TelegramUpdatesService,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.telegram.isEnabled) {
      this.logger.log('TELEGRAM_BOT_TOKEN is not set, Telegram bot is off');
      return;
    }

    // Не ждём Telegram: API должно запуститься, даже если он недоступен
    void this.start();
  }

  /**
   * Регистрирует webhook или запускает polling. При ошибке сети повторяет
   * с растущей паузой, пока не получится или приложение не остановится.
   */
  private async start(): Promise<void> {
    const webhookUrl = this.config.get('TELEGRAM_WEBHOOK_URL', {
      infer: true,
    });
    const secret = this.config.get('TELEGRAM_WEBHOOK_SECRET', { infer: true });

    for (let attempt = 1; !this.abort.signal.aborted; attempt += 1) {
      try {
        const username = await this.telegram.getUsername();

        if (webhookUrl && secret) {
          await this.telegram.setWebhook(webhookUrl, secret);
          this.logger.log(`Telegram bot @${username}: webhook ${webhookUrl}`);
          return;
        }

        await this.telegram.deleteWebhook();
        this.logger.log(`Telegram bot @${username}: long polling`);
        void this.poll();
        return;
      } catch (error) {
        const delay = startRetryDelayMs(attempt);

        this.logger.error(
          `Failed to start Telegram bot (attempt ${attempt}), retrying in ${delay / 1000}s`,
          error,
        );
        await this.sleep(delay);
      }
    }
  }

  onApplicationShutdown(): void {
    this.abort.abort();
  }

  private async poll(): Promise<void> {
    let offset = 0;

    while (!this.abort.signal.aborted) {
      try {
        const updates = await this.telegram.getUpdates(
          offset,
          POLL_TIMEOUT_SEC,
          AbortSignal.any([
            this.abort.signal,
            AbortSignal.timeout((POLL_TIMEOUT_SEC + 10) * 1000),
          ]),
        );

        for (const update of updates) {
          offset = update.update_id + 1;
          await this.updates.handleUpdate(update);
        }
      } catch (error) {
        if (this.abort.signal.aborted) {
          return;
        }

        this.logger.warn(`Telegram polling failed: ${String(error)}`);
        await this.sleep(POLL_ERROR_DELAY_MS);
      }
    }
  }

  // Пауза, которую прерывает остановка приложения
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, ms);

      this.abort.signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
    });
  }
}
