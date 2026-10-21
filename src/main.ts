import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { Logger, StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
import type { Env } from './config/index.js';
import {
  getSwaggerConfig,
  getSwaggerDocumentOptions,
} from './config/swagger.config.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  const configService = app.get<ConfigService<Env, true>>(ConfigService);
  const logger = new Logger(AppModule.name);

  // req.ip для rate limit: X-Forwarded-For учитываем только от своих proxy
  const trustedProxies = configService.get('TRUSTED_PROXIES', { infer: true });
  app.set('trust proxy', trustedProxies.length > 0 ? trustedProxies : false);

  app.use(helmet());

  app.enableCors({
    origin: configService.getOrThrow<string>('FRONTEND_ORIGIN'),
    credentials: true,
  });

  app.useGlobalPipes(new StandardSchemaValidationPipe());

  // SIGTERM закрывает соединения с БД через onModuleDestroy
  app.enableShutdownHooks();

  const isProduction =
    configService.get('NODE_ENV', { infer: true }) === 'production';
  const swaggerEnabled =
    configService.get('SWAGGER_ENABLED', { infer: true }) ?? !isProduction;

  if (swaggerEnabled) {
    const swaggerConfig = getSwaggerConfig();
    const swaggerDocumentOptions = getSwaggerDocumentOptions();
    const documentFactory = () =>
      SwaggerModule.createDocument(app, swaggerConfig, swaggerDocumentOptions);
    SwaggerModule.setup('api', app, documentFactory, {
      jsonDocumentUrl: 'openapi.json',
    });
  }

  const port = configService.getOrThrow<number>('HTTP_PORT');
  const host = configService.getOrThrow<string>('HTTP_HOST');

  try {
    await app.listen(port);

    logger.log(`Server is running at: ${host}`);
  } catch (error) {
    logger.error(`Failed to start server :`, error);
    process.exit(1);
  }
}
void bootstrap();
