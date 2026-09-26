import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { hashPassword } from 'better-auth/crypto';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { auth } from '../auth/auth.js';
import type { AcceptInvitationDto } from './dto/accept-invitation.dto.js';
import type { CreateInvitationDto } from './dto/create-invitation.dto.js';

type SessionUser = {
  id: string;
  email: string;
};

@Injectable()
export class OrganizationInvitationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createInvitation(
    session: {
      user: SessionUser;
      session: { activeOrganizationId?: string | null };
    },
    dto: CreateInvitationDto,
  ) {
    const organizationId = session.session.activeOrganizationId;

    if (!organizationId) {
      throw new BadRequestException('Active organization is required');
    }

    const existingMember = await this.prisma.member.findFirst({
      where: {
        organizationId,
        user: {
          email: dto.email,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException(
        'User is already a member of this organization',
      );
    }

    const existingInvitation = await this.prisma.invitation.findFirst({
      where: {
        organizationId,
        email: dto.email,
        status: 'pending',
      },
    });

    if (existingInvitation) {
      throw new ConflictException('Pending invitation already exists');
    }

    const invitation = await this.prisma.invitation.create({
      data: {
        id: randomUUID(),
        organizationId,
        email: dto.email,
        role: dto.role,
        status: 'pending',
        expiresAt: this.getDefaultExpirationDate(),
        inviterId: session.user.id,
      },
      include: {
        organization: true,
      },
    });

    return this.toInvitationResponse(invitation);
  }

  async getInvitation(id: string) {
    const invitation = await this.findInvitation(id);

    return this.toInvitationResponse(invitation);
  }

  async acceptInvitation(
    id: string,
    dto: AcceptInvitationDto,
    request: Request,
    response: Response,
  ) {
    const invitation = await this.findInvitation(id);
    this.assertInvitationCanBeAccepted(invitation);

    const existingUser = await this.prisma.user.findUnique({
      where: { email: invitation.email },
    });
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (existingUser) {
      if (!session) {
        throw new UnauthorizedException(
          'Sign in with the invited email to accept this invitation',
        );
      }

      if (session.user.email.toLowerCase() !== invitation.email) {
        throw new ForbiddenException(
          'Current session email does not match invitation email',
        );
      }

      await this.addMemberAndAcceptInvitation(existingUser.id, invitation);
      await this.setActiveOrganizationFromRequest(
        request,
        response,
        invitation.organizationId,
      );

      return {
        user: {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
        },
        organization: {
          id: invitation.organization.id,
          name: invitation.organization.name,
          slug: invitation.organization.slug,
        },
      };
    }

    if (!dto.name || !dto.password) {
      throw new BadRequestException('Name and password are required');
    }

    const userId = randomUUID();
    const now = new Date();
    const passwordHash = await hashPassword(dto.password);

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          id: userId,
          email: invitation.email,
          name: dto.name!,
          emailVerified: false,
          createdAt: now,
          updatedAt: now,
          accounts: {
            create: {
              id: randomUUID(),
              accountId: userId,
              providerId: 'credential',
              password: passwordHash,
              createdAt: now,
              updatedAt: now,
            },
          },
        },
      });

      await tx.member.create({
        data: {
          id: randomUUID(),
          organizationId: invitation.organizationId,
          userId: createdUser.id,
          role: invitation.role,
          createdAt: now,
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'accepted',
        },
      });

      return createdUser;
    });

    const signInResponse = await auth.api.signInEmail({
      body: {
        email: invitation.email,
        password: dto.password,
      },
      asResponse: true,
    });
    const setCookieHeaders = this.getSetCookieHeaders(signInResponse.headers);
    this.setCookieHeaders(response, setCookieHeaders);

    await this.setActiveOrganizationFromCookieHeaders(
      setCookieHeaders,
      response,
      invitation.organizationId,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      organization: {
        id: invitation.organization.id,
        name: invitation.organization.name,
        slug: invitation.organization.slug,
      },
    };
  }

  private async addMemberAndAcceptInvitation(
    userId: string,
    invitation: Awaited<ReturnType<typeof this.findInvitation>>,
  ) {
    const existingMember = await this.prisma.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException(
        'User is already a member of this organization',
      );
    }

    await this.prisma.$transaction([
      this.prisma.member.create({
        data: {
          id: randomUUID(),
          organizationId: invitation.organizationId,
          userId,
          role: invitation.role,
        },
      }),
      this.prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'accepted',
        },
      }),
    ]);
  }

  private async findInvitation(id: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id },
      include: {
        organization: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    return invitation;
  }

  private assertInvitationCanBeAccepted(
    invitation: Awaited<ReturnType<typeof this.findInvitation>>,
  ): void {
    if (invitation.status !== 'pending') {
      throw new ConflictException('Invitation is not pending');
    }

    if (invitation.expiresAt <= new Date()) {
      throw new GoneException('Invitation has expired');
    }
  }

  private toInvitationResponse(
    invitation: Awaited<ReturnType<typeof this.findInvitation>>,
  ) {
    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      organization: {
        id: invitation.organization.id,
        name: invitation.organization.name,
        slug: invitation.organization.slug,
      },
    };
  }

  private getDefaultExpirationDate(): Date {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return expiresAt;
  }

  private async setActiveOrganizationFromRequest(
    request: Request,
    response: Response,
    organizationId: string,
  ): Promise<void> {
    const setActiveResponse = await auth.api.setActiveOrganization({
      body: { organizationId },
      headers: fromNodeHeaders(request.headers),
      asResponse: true,
    });

    this.setCookieHeaders(
      response,
      this.getSetCookieHeaders(setActiveResponse.headers),
    );
  }

  private async setActiveOrganizationFromCookieHeaders(
    cookies: string[],
    response: Response,
    organizationId: string,
  ): Promise<void> {
    const setActiveResponse = await auth.api.setActiveOrganization({
      body: { organizationId },
      headers: new Headers({
        cookie: this.toCookieHeader(cookies),
      }),
      asResponse: true,
    });

    this.setCookieHeaders(
      response,
      this.getSetCookieHeaders(setActiveResponse.headers),
    );
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
}
