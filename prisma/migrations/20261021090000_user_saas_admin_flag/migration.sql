-- AlterTable: флаг администратора SaaS вместо списка email в env
ALTER TABLE "user" ADD COLUMN "isSaasAdmin" BOOLEAN NOT NULL DEFAULT false;
