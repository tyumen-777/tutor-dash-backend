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

  async onApplicationBootstrap(): Promise<void> {
    if (!this.telegram.isEnabled) {
      this.logger.log('TELEGRAM_BOT_TOKEN is not set, Telegram bot is off');
      return;
    }

    const webhookUrl = this.config.get('TELEGRAM_WEBHOOK_URL', {
      infer: true,
    });
    const secret = this.config.get('TELEGRAM_WEBHOOK_SECRET', { infer: true });

    // Ошибка Telegram не должна мешать запуску API
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
    } catch (error) {
      this.logger.error('Failed to start Telegram bot', error);
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
        await new Promise((resolve) =>
          setTimeout(resolve, POLL_ERROR_DELAY_MS),
        );
      }
    }
  }
}
