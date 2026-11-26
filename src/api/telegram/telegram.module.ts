import { Module } from '@nestjs/common';

import { InfraModule } from '../../infra/infra.module.js';
import { NotificationSender } from './notification-sender.js';
import { StudentTelegramController } from './student-telegram.controller.js';
import { StudentTelegramService } from './student-telegram.service.js';
import { TelegramApi } from './telegram-api.js';
import { TelegramBotRunner } from './telegram-bot.runner.js';
import { TelegramUpdatesService } from './telegram-updates.service.js';
import { TelegramWebhookController } from './telegram-webhook.controller.js';

@Module({
  imports: [InfraModule],
  controllers: [StudentTelegramController, TelegramWebhookController],
  providers: [
    TelegramApi,
    TelegramUpdatesService,
    TelegramBotRunner,
    NotificationSender,
    StudentTelegramService,
  ],
})
export class TelegramModule {}
