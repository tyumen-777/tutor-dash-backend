import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ApiModule } from './api/api.module.js';
import { DEFAULT_THROTTLE, validateEnv } from './config/index.js';
import { InfraModule } from './infra/infra.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    // Счётчики в памяти процесса: при нескольких инстансах нужен Redis storage
    ThrottlerModule.forRoot([DEFAULT_THROTTLE]),
    InfraModule,
    ApiModule,
  ],
  controllers: [],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
