import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from 'better-auth/crypto';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { PrismaClient } from '../generated/prisma/client.js';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SAAS_ADMIN_BOOTSTRAP_EMAIL: z.string().trim().toLowerCase().pipe(z.email()),
  SAAS_ADMIN_BOOTSTRAP_NAME: z.string().trim().min(1),
  SAAS_ADMIN_BOOTSTRAP_PASSWORD: z.string().min(8).max(128),
});

const env = envSchema.parse(process.env);
const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  // Недоступная база должна давать ошибку, а не бесконечное ожидание
  connectionTimeoutMillis: 10_000,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const now = new Date();
  const email = env.SAAS_ADMIN_BOOTSTRAP_EMAIL;
  const passwordHash = await hashPassword(env.SAAS_ADMIN_BOOTSTRAP_PASSWORD);

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  const user =
    existingUser ??
    (await prisma.user.create({
      data: {
        id: randomUUID(),
        email,
        name: env.SAAS_ADMIN_BOOTSTRAP_NAME,
        emailVerified: true,
        isSaasAdmin: true,
        createdAt: now,
        updatedAt: now,
      },
    }));

  if (existingUser) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: env.SAAS_ADMIN_BOOTSTRAP_NAME,
        emailVerified: true,
        isSaasAdmin: true,
        updatedAt: now,
      },
    });
  }

  const credentialAccount = await prisma.account.findFirst({
    where: {
      userId: user.id,
      providerId: 'credential',
      accountId: user.id,
    },
  });

  if (credentialAccount) {
    await prisma.account.update({
      where: { id: credentialAccount.id },
      data: {
        password: passwordHash,
        updatedAt: now,
      },
    });
  } else {
    await prisma.account.create({
      data: {
        id: randomUUID(),
        accountId: user.id,
        providerId: 'credential',
        userId: user.id,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  console.log(`SaaS admin user is ready: ${email}`);
}

try {
  await main();
} catch (error) {
  if (isPrismaConnectionError(error)) {
    console.error(
      'Could not connect to the database. Start Postgres and apply migrations before running this seed.',
    );
    process.exitCode = 1;
  } else {
    throw error;
  }
} finally {
  await prisma.$disconnect();
}

function isPrismaConnectionError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ECONNREFUSED'
  );
}
