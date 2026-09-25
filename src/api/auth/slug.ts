import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../infra/prisma/prisma.service.js';

@Injectable()
export class SlugService {
  constructor(private readonly prisma: PrismaService) {}

  async createAvailableOrganizationSlug(
    organizationName: string,
    requestedSlug?: string,
  ): Promise<string> {
    const baseSlug = this.normalizeSlug(requestedSlug ?? organizationName);
    let slug = baseSlug;
    let suffix = 2;

    while (await this.prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return slug;
  }

  normalizeSlug(value: string): string {
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/['"]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');

    return normalized || 'organization';
  }
}
