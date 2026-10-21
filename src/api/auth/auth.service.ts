import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request, Response } from 'express';

import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { auth } from './auth.js';
import { toAuthHeaders } from './auth-headers.js';
import type {
  AuthSessionResponseDto,
  UserOrganizationDto,
} from './dto/auth-session-response.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { SetActiveOrganizationDto } from './dto/set-active-organization.dto.js';

type SessionState = {
  user: { id: string; email: string; name: string };
  session: { id: string; activeOrganizationId?: string | null };
};

@Injectable()
export class AuthApiService {
  constructor(private readonly prisma: PrismaService) {}

  async login(
    dto: LoginDto,
    request: Request,
    response: Response,
  ): Promise<AuthSessionResponseDto> {
    try {
      const signInResponse = await auth.api.signInEmail({
        body: {
          email: dto.email,
          password: dto.password,
        },
        // IP и User-Agent попадают в сессию
        headers: toAuthHeaders(request),
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

      return await this.getSessionResponse(session);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  async getSessionResponse(
    session: SessionState,
  ): Promise<AuthSessionResponseDto> {
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
      organizations: await this.getUserOrganizations(session.user.id),
    };
  }

  async setActiveOrganization(
    session: SessionState,
    dto: SetActiveOrganizationDto,
    request: Request,
    response: Response,
  ): Promise<AuthSessionResponseDto> {
    const membership = await this.prisma.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: dto.organizationId,
          userId: session.user.id,
        },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('User is not a member of this organization');
    }

    try {
      const setActiveResponse = await auth.api.setActiveOrganization({
        body: { organizationId: dto.organizationId },
        headers: fromNodeHeaders(request.headers),
        asResponse: true,
      });

      this.setCookieHeaders(
        response,
        this.getSetCookieHeaders(setActiveResponse.headers),
      );
    } catch (error) {
      throw this.toHttpException(error);
    }

    return this.getSessionResponse({
      ...session,
      session: {
        ...session.session,
        activeOrganizationId: dto.organizationId,
      },
    });
  }

  async logout(request: Request, response: Response): Promise<void> {
    const signOutResponse = await auth.api.signOut({
      headers: fromNodeHeaders(request.headers),
      asResponse: true,
    });

    this.setCookieHeaders(
      response,
      this.getSetCookieHeaders(signOutResponse.headers),
    );
  }

  private async getUserOrganizations(
    userId: string,
  ): Promise<UserOrganizationDto[]> {
    const memberships = await this.prisma.member.findMany({
      where: { userId },
      orderBy: { organization: { name: 'asc' } },
      select: {
        role: true,
        organization: { select: { id: true, name: true, slug: true } },
      },
    });

    return memberships.map(({ role, organization }) => ({
      ...organization,
      role,
    }));
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
