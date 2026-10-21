import 'dotenv/config';

import { prismaAdapter } from '@better-auth/prisma-adapter';
import { PrismaPg } from '@prisma/adapter-pg';
import { betterAuth } from 'better-auth';
import { organization } from 'better-auth/plugins';

import { PrismaClient } from '../../generated/prisma/client.js';
import {
  accountant,
  admin,
  manager,
  organizationAccessControl,
  owner,
  teacher,
} from './auth.permissions.js';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

export const authPrisma = new PrismaClient({ adapter });

// Организациями и приглашениями управляет наш API (/organization/*,
// /admin/*), а нативные HTTP-эндпоинты плагина обходят его правила:
// создание школ, роли при приглашении, приём приглашения без проверок.
// Серверные вызовы auth.api.* disabledPaths не затрагивает.
const disabledOrganizationPaths = [
  'accept-invitation',
  'add-team-member',
  'cancel-invitation',
  'check-slug',
  'create',
  'create-role',
  'create-team',
  'delete',
  'delete-role',
  'get-active-member',
  'get-active-member-role',
  'get-full-organization',
  'get-invitation',
  'get-organization',
  'get-role',
  'has-permission',
  'invite-member',
  'leave',
  'list',
  'list-invitations',
  'list-members',
  'list-roles',
  'list-team-members',
  'list-teams',
  'list-user-invitations',
  'list-user-teams',
  'reject-invitation',
  'remove-member',
  'remove-team',
  'remove-team-member',
  'set-active',
  'set-active-team',
  'update',
  'update-member-role',
  'update-role',
  'update-team',
].map((path) => `/organization/${path}`);

const trustedProxies = (process.env.TRUSTED_PROXIES ?? '')
  .split(',')
  .map((proxy) => proxy.trim())
  .filter(Boolean);

export const auth = betterAuth({
  basePath: '/api/auth',
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [process.env.FRONTEND_ORIGIN].filter(
    (origin): origin is string => Boolean(origin),
  ),
  disabledPaths: disabledOrganizationPaths,
  advanced: {
    ipAddress: trustedProxies.length > 0 ? { trustedProxies } : undefined,
  },
  database: prismaAdapter(authPrisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: false,
  },
  databaseHooks: {
    session: {
      create: {
        // Единственную организацию выбираем сразу; при нескольких
        // фронт показывает выбор и вызывает POST /auth/active-organization.
        before: async (session) => {
          if (session.activeOrganizationId) {
            return;
          }

          const memberships = await authPrisma.member.findMany({
            where: { userId: session.userId },
            select: { organizationId: true },
            take: 2,
          });

          if (memberships.length !== 1) {
            return;
          }

          return {
            data: {
              ...session,
              activeOrganizationId: memberships[0].organizationId,
            },
          };
        },
      },
    },
  },
  plugins: [
    organization({
      ac: organizationAccessControl,
      roles: {
        owner,
        admin,
        manager,
        teacher,
        accountant,
      },
      creatorRole: 'owner',
      // Школы создаёт только SaaS-админ через POST /admin/organizations
      allowUserToCreateOrganization: false,
      teams: {
        enabled: false,
      },
      dynamicAccessControl: {
        enabled: false,
      },
    }),
  ],
});

export type AppAuth = typeof auth;
