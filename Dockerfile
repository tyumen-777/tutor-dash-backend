# syntax=docker/dockerfile:1

FROM node:22.22.1-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run prisma:generate && npm run build

# Миграции применяются при старте контейнера (prisma migrate deploy),
# поэтому prisma должен быть в dependencies, а не в devDependencies.

FROM node:22.22.1-alpine AS prod-deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22.22.1-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --chown=node:node package.json ./
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node prisma7.config.ts ./

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${HTTP_PORT:-3000}/health" > /dev/null || exit 1

CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy --config prisma7.config.ts && exec node dist/main.js"]
