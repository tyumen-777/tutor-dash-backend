import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';
import {
  OrgRoles,
  RequireActiveOrg,
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';
import { z } from 'zod';

import {
  studentTelegramInviteResponseSchema,
  type StudentTelegramInviteResponseDto,
  studentTelegramResponseSchema,
  type StudentTelegramResponseDto,
} from './dto/student-telegram.dto.js';
import { StudentTelegramService } from './student-telegram.service.js';

@Controller('students/:id/telegram')
export class StudentTelegramController {
  constructor(private readonly studentTelegram: StudentTelegramService) {}

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin', 'manager'])
  @Get()
  @ApiOperation({
    summary: 'Telegram-уведомления ученика',
    description:
      'Возвращает чаты Telegram, подключённые к уведомлениям ученика, и включён ли бот на сервере.',
  })
  @ApiOkResponse({
    description: 'Подключённые чаты.',
    standardSchema: studentTelegramResponseSchema,
  })
  @ApiNotFoundResponse({ description: 'Ученик не найден.' })
  getLinks(
    @Session() session: UserSession,
    @Param('id', { schema: z.uuid() }) id: string,
  ): Promise<StudentTelegramResponseDto> {
    return this.studentTelegram.getLinks(session, id);
  }

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin', 'manager'])
  @Post('invite')
  @ApiOperation({
    summary: 'Ссылка подключения Telegram',
    description:
      'Создаёт одноразовую ссылку t.me/<бот>?start=<токен> на 7 дней. Ученик или родитель открывает её и нажимает «Старт» — чат подключается к уведомлениям. Предыдущая неиспользованная ссылка перестаёт работать.',
  })
  @ApiCreatedResponse({
    description: 'Ссылка создана.',
    standardSchema: studentTelegramInviteResponseSchema,
  })
  @ApiBadRequestResponse({ description: 'Ученик в архиве.' })
  @ApiNotFoundResponse({ description: 'Ученик не найден.' })
  @ApiServiceUnavailableResponse({ description: 'Бот не настроен на сервере.' })
  createInvite(
    @Session() session: UserSession,
    @Param('id', { schema: z.uuid() }) id: string,
  ): Promise<StudentTelegramInviteResponseDto> {
    return this.studentTelegram.createInvite(session, id);
  }

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin', 'manager'])
  @Delete(':linkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Отключение чата Telegram',
    description: 'Отключает чат от уведомлений ученика.',
  })
  @ApiNoContentResponse({ description: 'Чат отключён.' })
  @ApiNotFoundResponse({ description: 'Чат не найден.' })
  deleteLink(
    @Session() session: UserSession,
    @Param('id', { schema: z.uuid() }) id: string,
    @Param('linkId', { schema: z.uuid() }) linkId: string,
  ): Promise<void> {
    return this.studentTelegram.deleteLink(session, id, linkId);
  }
}
