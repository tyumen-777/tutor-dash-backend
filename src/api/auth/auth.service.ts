import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';

import { auth } from './auth.js';
import type { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthApiService {
  async login(dto: LoginDto, response: Response) {
    try {
      const signInResponse = await auth.api.signInEmail({
        body: {
          email: dto.email,
          password: dto.password,
        },
        asResponse: true,
      });

      const setCookieHeaders = this.getSetCookieHeaders(signInResponse.headers);
      this.setCookieHeaders(response, setCookieHeaders);

      const session = await auth.api.getSession({
        headers: new Headers({
          cookie: this.toCookieHeader(setCookieHeaders),
        }),
      });

      if (!session) {
        throw new UnauthorizedException('Invalid email or password');
      }

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
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  private getSetCookieHeaders(headers: Headers): string[] {
    const maybeGetSetCookie = headers as Headers & {
      getSetCookie?: () => string[];
    };

    if (maybeGetSetCookie.getSetCookie) {
      return maybeGetSetCookie.getSetCookie();
    }

    const cookie = headers.get('set-cookie');

    return cookie ? [cookie] : [];
  }

  private setCookieHeaders(response: Response, cookies: string[]): void {
    for (const cookie of cookies) {
      response.append('set-cookie', cookie);
    }
  }

  private toCookieHeader(cookies: string[]): string {
    return cookies.map((cookie) => cookie.split(';')[0]).join('; ');
  }

  private toHttpException(error: unknown) {
    if (this.isRecord(error)) {
      const statusCode = Number(error.statusCode ?? error.status);
      const message =
        typeof error.message === 'string'
          ? error.message
          : 'Authentication request failed';

      if (statusCode === 401) {
        return new UnauthorizedException(message);
      }

      if (statusCode === 409 || message.toLowerCase().includes('already')) {
        return new ConflictException(message);
      }

      if (statusCode >= 400 && statusCode < 500) {
        return new BadRequestException(message);
      }
    }

    return new BadRequestException('Authentication request failed');
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
