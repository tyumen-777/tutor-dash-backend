import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import {
  AllowAnonymous,
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';
import type { Response } from 'express';
import { ApiOperation } from '@nestjs/swagger';

import { AuthApiService } from './auth.service.js';
import { type LoginDto, loginSchema } from './dto/index.js';

@Controller('auth')
export class BackendAuthController {
  constructor(private readonly authService: AuthApiService) {}

  @AllowAnonymous()
  @Post('login')
  @ApiOperation({
    summary: 'Вход в систему',
    description:
      'Проверяет учетные данные пользователя и устанавливает cookie сессии.',
  })
  login(
    @Body({ schema: loginSchema }) body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.login(body, response);
  }

  @Get('me')
  @ApiOperation({
    summary: 'Получение текущей сессии',
    description:
      'Возвращает данные авторизованного пользователя и активной сессии.',
  })
  me(@Session() session: UserSession) {
    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
      session: {
        id: session.session.id,
        activeOrganizationId: session.session.activeOrganizationId ?? null,
      },
    };
  }
}
