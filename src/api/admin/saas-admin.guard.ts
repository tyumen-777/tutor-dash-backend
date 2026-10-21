import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../../infra/prisma/prisma.service.js';

// Флаг читается из БД на каждый запрос: снятие прав действует сразу,
// без перевыпуска сессии. Сессию кладёт глобальный AuthGuard better-auth.
@Injectable()
export class SaasAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { id: string } | null }>();
    const userId = request.user?.id;

    const user = userId
      ? await this.prisma.user.findUnique({
          where: { id: userId },
          select: { isSaasAdmin: true },
        })
      : null;

    if (!user?.isSaasAdmin) {
      throw new ForbiddenException('SaaS admin access required');
    }

    return true;
  }
}
