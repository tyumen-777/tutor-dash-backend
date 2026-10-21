# syntax=docker/dockerfile:1

FROM node:22.22.1-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run prisma:generate && npm run build

# Stage build содержит prisma CLI и применяет миграции перед деплоем:
#   docker build --target build -t tutor-dash-migrate .
#   docker run --rm -e DATABASE_URL=... tutor-dash-migrate npm run migrate:deploy

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

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${HTTP_PORT:-3000}/health" > /dev/null || exit 1

CMD ["node", "dist/main.js"]
