import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { timingSafeEqual } from 'node:crypto';

import type { Env } from '../../config/index.js';
import type { TelegramUpdate } from './telegram-api.js';
import { TelegramUpdatesService } from './telegram-updates.service.js';

/**
 * Принимает обновления от Telegram. Подлинность проверяется секретом,
 * который передан Telegram в setWebhook.
 */
@ApiExcludeController()
@Controller('telegram')
export class TelegramWebhookController {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly updates: TelegramUpdatesService,
  ) {}

  @AllowAnonymous()
  @SkipThrottle()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handle(
    @Headers('x-telegram-bot-api-secret-token') secret: string | undefined,
    @Body() update: TelegramUpdate,
  ): Promise<void> {
    if (!this.isValidSecret(secret)) {
      throw new ForbiddenException();
    }

    await this.updates.handleUpdate(update);
  }

  private isValidSecret(secret: string | undefined): boolean {
    const expected = this.config.get('TELEGRAM_WEBHOOK_SECRET', {
      infer: true,
    });

    if (!expected || !secret) {
      return false;
    }

    const a = Buffer.from(secret);
    const b = Buffer.from(expected);

    return a.length === b.length && timingSafeEqual(a, b);
  }
}
