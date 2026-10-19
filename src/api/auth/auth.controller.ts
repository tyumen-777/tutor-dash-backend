import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  AllowAnonymous,
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';
import type { Request, Response } from 'express';
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';

import { AuthApiService } from './auth.service.js';
import {
  type AuthSessionResponseDto,
  authSessionResponseSchema,
  type LoginDto,
  loginSchema,
  type SetActiveOrganizationDto,
  setActiveOrganizationSchema,
} from './dto/index.js';

@Controller('auth')
export class BackendAuthController {
  constructor(private readonly authService: AuthApiService) {}

  @AllowAnonymous()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Вход в систему',
    description:
      'Проверяет учетные данные пользователя и устанавливает cookie сессии.',
  })
  @ApiOkResponse({
    description:
      'Успешный вход. Cookie сессии установлена в заголовке Set-Cookie.',
    standardSchema: authSessionResponseSchema,
  })
  login(
    @Body({ schema: loginSchema }) body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionResponseDto> {
    return this.authService.login(body, response);
  }

  @Get('me')
  @ApiOperation({
    summary: 'Получение текущей сессии',
    description:
      'Возвращает данные авторизованного пользователя, активной сессии и список его организаций.',
  })
  @ApiOkResponse({
    description: 'Данные текущего пользователя и активной сессии.',
    standardSchema: authSessionResponseSchema,
  })
  me(@Session() session: UserSession): Promise<AuthSessionResponseDto> {
    return this.authService.getSessionResponse(session);
  }

  @Post('active-organization')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Выбор активной организации',
    description:
      'Делает указанную организацию активной для текущей сессии. Пользователь должен состоять в этой организации.',
  })
  @ApiOkResponse({
    description: 'Активная организация выбрана.',
    standardSchema: authSessionResponseSchema,
  })
  setActiveOrganization(
    @Session() session: UserSession,
    @Body({ schema: setActiveOrganizationSchema })
    body: SetActiveOrganizationDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionResponseDto> {
    return this.authService.setActiveOrganization(
      session,
      body,
      request,
      response,
    );
  }

  @AllowAnonymous()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Выход из системы',
    description:
      'Завершает текущую сессию и удаляет cookie сессии. Без активной сессии просто очищает cookie.',
  })
  @ApiNoContentResponse({
    description: 'Сессия завершена, cookie сессии удалена.',
  })
  logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    return this.authService.logout(request, response);
  }
}
