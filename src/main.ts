import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { Logger, StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
import {
  getSwaggerConfig,
  getSwaggerDocumentOptions,
} from './config/swagger.config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });
  const configService = app.get(ConfigService);
  const logger = new Logger(AppModule.name);

  app.useGlobalPipes(new StandardSchemaValidationPipe());

  //Setup Swagger
  const swaggerConfig = getSwaggerConfig();
  const swaggerDocumentOptions = getSwaggerDocumentOptions();
  const documentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig, swaggerDocumentOptions);
  SwaggerModule.setup('api', app, documentFactory);

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
