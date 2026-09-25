import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hashPassword } from 'better-auth/crypto';
import { randomUUID } from 'node:crypto';

import type { Env } from '../../config/index.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { SlugService } from '../auth/slug.js';
import type { CreateOrganizationOwnerDto } from './dto/create-organization-owner.dto.js';

type AdminSessionUser = {
  email: string;
};

@Injectable()
export class AdminService {
  constructor(
    private readonly configService: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
    private readonly slugService: SlugService,
  ) {}

  async createOrganizationOwner(
    currentUser: AdminSessionUser,
    dto: CreateOrganizationOwnerDto,
  ) {
    this.assertSaasAdmin(currentUser);

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.ownerEmail },
    });

    if (existingUser) {
      throw new ConflictException('Owner email is already registered');
    }

    const slug = await this.slugService.createAvailableOrganizationSlug(
      dto.organizationName,
      dto.organizationSlug,
    );
    const now = new Date();
    const userId = randomUUID();
    const organizationId = randomUUID();
    const passwordHash = await hashPassword(dto.ownerPassword);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          id: userId,
          email: dto.ownerEmail,
          name: dto.ownerName,
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

      const organization = await tx.organization.create({
        data: {
          id: organizationId,
          name: dto.organizationName,
          slug,
          createdAt: now,
          updatedAt: now,
          members: {
            create: {
              id: randomUUID(),
              userId: user.id,
              role: 'owner',
              createdAt: now,
            },
          },
        },
      });

      return { user, organization };
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
      },
    };
  }

  private assertSaasAdmin(user: AdminSessionUser): void {
    const adminEmails = this.configService.get('SAAS_ADMIN_EMAILS', {
      infer: true,
    });

    if (!adminEmails.includes(user.email.toLowerCase())) {
      throw new ForbiddenException('SaaS admin access required');
    }
  }
}
