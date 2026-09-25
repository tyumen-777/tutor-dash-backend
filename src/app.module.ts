import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiModule } from './api/api.module.js';
import { validateEnv } from './config/index.js';
import { InfraModule } from './infra/infra.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    InfraModule,
    ApiModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
