import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

import { PrismaService } from '../../infra/prisma/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @AllowAnonymous()
  @SkipThrottle()
  @Get()
  @ApiOperation({
    summary: 'Проверка работоспособности',
    description:
      'Отвечает 200, если приложение запущено и база данных доступна.',
  })
  @ApiOkResponse({ description: 'Сервис работает.' })
  async check(): Promise<{ status: 'ok' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }

    return { status: 'ok' };
  }
}
