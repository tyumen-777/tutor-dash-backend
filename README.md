# Tutor Dash — backend

API для CRM школ иностранных языков. Отдаёт фронтенду данные об учениках,
преподавателях, занятиях, оплатах, расходах, выплатах и сводке дашборда.
Каждая школа — отдельная организация; данные изолированы по организации, а
доступ ограничен ролью участника.

## Стек

- [NestJS](https://nestjs.com/) 12 (Express), TypeScript, ESM
- [PostgreSQL](https://www.postgresql.org/) 17 + [Prisma](https://www.prisma.io/) 7 (адаптер `@prisma/adapter-pg`)
- [Better Auth](https://www.better-auth.com/) — сессии в cookie, плагин организаций и ролей
- [Zod](https://zod.dev/) — валидация DTO и переменных окружения, OpenAPI через `zod-openapi`
- Swagger UI (`@nestjs/swagger`), `helmet`, `@nestjs/throttler` (rate limit)
- [Vitest](https://vitest.dev/) + Supertest для тестов, [oxlint](https://oxc.rs/) для линта

## Быстрый старт

Нужен Node.js **22.22.1+** (версия зафиксирована в `.nvmrc`, `start:dev`
проверяет её перед запуском) и Docker для локального Postgres.

```bash
nvm use
npm install
```

1. Создайте `.env` в корне `backend/` (см. [переменные окружения](#переменные-окружения)).
2. Поднимите базу:

   ```bash
   docker compose up -d postgres
   ```

3. Сгенерируйте Prisma Client и примените миграции:

   ```bash
   npm run prisma:generate
   npm run migrate:deploy
   ```

4. Создайте SaaS-администратора (пользователь, который может заводить школы):

   ```bash
   npm run seed:saas-admin
   ```

5. Запустите сервер в watch-режиме:

   ```bash
   npm run start:dev
   ```

Фронтенд ожидает API на `http://localhost:4000`, поэтому локально задайте
`HTTP_PORT=4000`. Swagger UI откроется на `http://localhost:4000/api`, JSON-схема —
на `http://localhost:4000/openapi.json` (её использует Orval на фронте).

## Переменные окружения

Проверяются при старте схемой в `src/config/env.validation.ts` — при ошибке
сервер не запустится и выведет список невалидных переменных.

| Переменная | Обязательна | Описание |
|---|---|---|
| `DATABASE_URL` | да | Строка подключения к Postgres |
| `BETTER_AUTH_SECRET` | да | Секрет для подписи сессий, минимум 32 символа |
| `BETTER_AUTH_URL` | да | Публичный URL API (например, `http://localhost:4000`) |
| `FRONTEND_ORIGIN` | да | URL фронтенда — разрешён в CORS с credentials |
| `HTTP_PORT` | нет | Порт сервера, по умолчанию `3000` (локально — `4000`) |
| `HTTP_HOST` | нет | Хост, по умолчанию `0.0.0.0` |
| `NODE_ENV` | нет | `development` / `test` / `production` |
| `COOKIE_DOMAIN` | нет | Общий домен для cookie сессии (например, `edudash.org`), чтобы её видели и API, и фронт на разных поддоменах |
| `TRUSTED_PROXIES` | нет | IP/CIDR reverse proxy через запятую; только от них учитывается `X-Forwarded-For` |
| `SWAGGER_ENABLED` | нет | `true`/`false`; по умолчанию Swagger выключен в production |

Для `docker-compose.yml`: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`.

Для `seed:saas-admin`: `SAAS_ADMIN_BOOTSTRAP_EMAIL`, `SAAS_ADMIN_BOOTSTRAP_NAME`,
`SAAS_ADMIN_BOOTSTRAP_PASSWORD` (8–128 символов). Скрипт идемпотентный: если
пользователь уже есть, он обновляется.

## Скрипты

| Команда | Что делает |
|---|---|
| `npm run start:dev` | Запуск с перезагрузкой при изменениях |
| `npm run start:debug` | То же с инспектором Node |
| `npm run build` / `npm run start:prod` | Сборка в `dist/` и запуск собранной версии |
| `npm run prisma:generate` | Генерация Prisma Client в `src/generated/prisma` |
| `npm run migrate:deploy` | Применение миграций из `prisma/migrations` |
| `npm run seed:saas-admin` | Создание/обновление SaaS-администратора |
| `npm run lint` | oxlint по `src/` и `test/` |
| `npm run format` | Prettier |
| `npm test` | Unit-тесты (`*.spec.ts`) |
| `npm run test:e2e` | E2E-тесты (`test/*.e2e-spec.ts`), нужна живая БД |
| `npm run test:cov` | Покрытие |

Новая миграция после изменения `prisma/schema.prisma`:

```bash
npx prisma migrate dev --config prisma7.config.ts --name <имя_миграции>
```

## Структура

```
src/
  main.ts              точка входа: helmet, CORS, валидация, Swagger
  app.module.ts
  config/              env-схема, Swagger, rate limit
  infra/prisma/        PrismaService
  generated/prisma/    сгенерированный Prisma Client (не редактировать)
  scripts/             seed-saas-admin
  api/
    auth/              Better Auth (/api/auth/*), /auth/me, роли и права
    organization/      настройки школы, участники, приглашения
    admin/             управление школами для SaaS-администратора
    student/           ученики, баланс занятий
    teacher/           преподаватели, архив, доступ в кабинет
    lesson/            занятия, списание с баланса, оплата урока
    payment/           поступления
    expense/           расходы
    payout/            выплаты преподавателям
    study-level/       уровни обучения школы
    dashboard/         сводка для главной страницы
    me/                кабинет преподавателя (/me/teacher, /me/earnings)
    shared/            ограничение данных для роли teacher, часовые пояса
    health/            /health для healthcheck
prisma/
  schema.prisma        схема БД
  migrations/          миграции
docs/                  проектные заметки (схема БД, контракты для фронта)
```

Каждый модуль устроен одинаково: `*.controller.ts` (маршруты), `*.service.ts`
(логика и запросы к БД), `dto/` (Zod-схемы запросов и ответов, из них же
строится OpenAPI). Чистая логика вынесена в отдельные файлы с тестами рядом
(`lesson-pay.ts`, `payout-report.ts`, `teacher-scope.ts`, `school-date.ts`).

## Авторизация и роли

Эндпоинты Better Auth доступны по `/api/auth/*`, сессия хранится в cookie.
Пользователь состоит в одной или нескольких организациях; активная организация
берётся из сессии.

Роли участника организации (`src/api/auth/auth.permissions.ts`):

| Роль | Ученики | Занятия | Финансы | Отчёты | Настройки |
|---|---|---|---|---|---|
| `owner`, `admin` | полный доступ | полный доступ | полный доступ | чтение | чтение и изменение |
| `manager` | без удаления | без удаления | чтение | чтение | чтение |
| `accountant` | чтение | чтение | полный доступ | чтение | — |
| `teacher` | чтение | чтение и изменение | — | — | — |

Участник только с ролью `teacher` дополнительно ограничен своими данными
(`src/api/shared/teacher-scope.ts`): видит только своих учеников и занятия,
в занятиях может менять лишь тему и домашнее задание. Чужие записи отдают
`404`. Преподаватель получает доступ по приглашению, которое выдаётся из
карточки преподавателя (`/teachers/:id/access`).

Флаг `isSaasAdmin` у пользователя открывает `/admin/organizations` —
управление школами на уровне всей платформы.

## Данные

Основные сущности (`prisma/schema.prisma`): `Student`, `Teacher`, `Lesson` и
`LessonParticipant`, `Payment`, `Expense`, `StudyLevel`, абонементы
(`SubscriptionPlan`, `StudentSubscription`, `SubscriptionUsage`), опекуны
(`Guardian`), расписание (`ScheduleRule`), плюс таблицы Better Auth (`user`,
`session`, `organization`, `member`, `invitation`).

Деньги хранятся в минимальных единицах (целые числа). Бизнес-записи по
возможности не удаляются физически, а архивируются. Подробнее — в
[docs/database-schema.md](docs/database-schema.md).

## Деплой

При пуше в `main` GitHub Actions (`.github/workflows/deploy.yml`) собирает
Docker-образ, публикует его в GHCR (`ghcr.io/<owner>/tutor-backend`) и
запускает деплой в Dokploy. Нужные секреты репозитория: `DOKPLOY_URL`,
`DOKPLOY_API_KEY`, `DOKPLOY_BACKEND_APP_ID`.

Контейнер при старте сам применяет миграции (`prisma migrate deploy`), затем
запускает `node dist/main.js`. Healthcheck обращается к `/health`.
