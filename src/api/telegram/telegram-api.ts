import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../../config/index.js';

const API_URL = 'https://api.telegram.org';

// Только поля, которые использует бот
export type TelegramUser = {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
};

export type TelegramChat = {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
};

export type TelegramMessage = {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  my_chat_member?: {
    chat: TelegramChat;
    new_chat_member: { status: string };
  };
};

export class TelegramApiError extends Error {
  constructor(
    readonly method: string,
    readonly code: number,
    description: string,
    // Для 429: через сколько секунд можно повторить
    readonly retryAfter?: number,
  ) {
    super(`Telegram ${method} failed: ${code} ${description}`);
  }

  // Пользователь заблокировал бота или удалил аккаунт: писать в чат больше нельзя
  get isChatUnavailable(): boolean {
    return this.code === 403;
  }
}

type ApiResponse<T> =
  | { ok: true; result: T }
  | {
      ok: false;
      error_code: number;
      description: string;
      parameters?: { retry_after?: number };
    };

/**
 * Тонкий клиент Telegram Bot API. Без токена бот выключен:
 * isEnabled = false, вызовы бросают ошибку.
 */
@Injectable()
export class TelegramApi {
  private readonly logger = new Logger(TelegramApi.name);
  private readonly token: string | undefined;
  private username: string | undefined;

  constructor(config: ConfigService<Env, true>) {
    this.token = config.get('TELEGRAM_BOT_TOKEN', { infer: true });
  }

  get isEnabled(): boolean {
    return Boolean(this.token);
  }

  /**
   * Username бота для ссылок t.me/<username>; запрашивается один раз.
   */
  async getUsername(): Promise<string> {
    if (!this.username) {
      const me = await this.call<TelegramUser>('getMe', {});

      if (!me.username) {
        throw new Error('Telegram bot has no username');
      }

      this.username = me.username;
    }

    return this.username;
  }

  async sendMessage(chatId: bigint | number, text: string): Promise<void> {
    await this.call('sendMessage', {
      chat_id: chatId.toString(),
      text,
      link_preview_options: { is_disabled: true },
    });
  }

  async setWebhook(url: string, secretToken: string): Promise<void> {
    await this.call('setWebhook', {
      url,
      secret_token: secretToken,
      allowed_updates: ['message', 'my_chat_member'],
    });
  }

  async deleteWebhook(): Promise<void> {
    await this.call('deleteWebhook', {});
  }

  getUpdates(
    offset: number,
    timeoutSec: number,
    signal: AbortSignal,
  ): Promise<TelegramUpdate[]> {
    return this.call<TelegramUpdate[]>(
      'getUpdates',
      {
        offset,
        timeout: timeoutSec,
        allowed_updates: ['message', 'my_chat_member'],
      },
      signal,
    );
  }

  private async call<T = unknown>(
    method: string,
    body: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<T> {
    if (!this.token) {
      throw new Error('TELEGRAM_BOT_TOKEN is not set');
    }

    const response = await fetch(`${API_URL}/bot${this.token}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: signal ?? AbortSignal.timeout(15_000),
    });
    const data = (await response.json()) as ApiResponse<T>;

    if (!data.ok) {
      const error = new TelegramApiError(
        method,
        data.error_code,
        data.description,
        data.parameters?.retry_after,
      );

      this.logger.debug(error.message);
      throw error;
    }

    return data.result;
  }
}
