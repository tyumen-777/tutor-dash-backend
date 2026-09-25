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

export const auth = betterAuth({
  basePath: '/api/auth',
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [process.env.FRONTEND_ORIGIN].filter(
    (origin): origin is string => Boolean(origin),
  ),
  database: prismaAdapter(authPrisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: false,
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
