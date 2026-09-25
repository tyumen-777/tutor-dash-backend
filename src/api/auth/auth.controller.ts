import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import {
  AllowAnonymous,
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';
import type { Response } from 'express';

import { AuthApiService } from './auth.service.js';
import { type LoginDto, loginSchema } from './dto/index.js';

@Controller('auth')
export class BackendAuthController {
  constructor(private readonly authService: AuthApiService) {}

  @AllowAnonymous()
  @Post('login')
  login(
    @Body({ schema: loginSchema }) body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.login(body, response);
  }

  @Get('me')
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
