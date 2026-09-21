import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger(AppModule.name);

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
