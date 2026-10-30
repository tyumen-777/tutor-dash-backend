import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../infra/prisma/prisma.service.js';
import type { OrganizationSettingsResponseDto } from './dto/organization-settings-response.dto.js';
import type { UpdateOrganizationDto } from './dto/update-organization.dto.js';

type OrganizationSession = {
  session: { activeOrganizationId?: string | null };
};

const organizationSettingsSelect = {
  id: true,
  name: true,
  slug: true,
  timezone: true,
  currency: true,
} as const;

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  getOrganization(
    session: OrganizationSession,
  ): Promise<OrganizationSettingsResponseDto> {
    return this.prisma.organization.findUniqueOrThrow({
      where: { id: this.getOrganizationId(session) },
      select: organizationSettingsSelect,
    });
  }

  updateOrganization(
    session: OrganizationSession,
    dto: UpdateOrganizationDto,
  ): Promise<OrganizationSettingsResponseDto> {
    return this.prisma.organization.update({
      where: { id: this.getOrganizationId(session) },
      data: { name: dto.name, timezone: dto.timezone },
      select: organizationSettingsSelect,
    });
  }

  private getOrganizationId(session: OrganizationSession): string {
    const organizationId = session.session.activeOrganizationId;

    if (!organizationId) {
      throw new BadRequestException('Active organization is required');
    }

    return organizationId;
  }
}
