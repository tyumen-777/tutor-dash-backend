import { Module } from '@nestjs/common';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';

import { InfraModule } from '../../infra/infra.module.js';
import { auth } from './auth.js';
import { BackendAuthController } from './auth.controller.js';
import { AuthApiService } from './auth.service.js';
import { SlugService } from './slug.js';

@Module({
  imports: [
    InfraModule,
    BetterAuthModule.forRoot({
      auth,
      bodyParser: {
        json: { limit: '2mb' },
        urlencoded: { extended: true, limit: '2mb' },
      },
    }),
  ],
  controllers: [BackendAuthController],
  providers: [AuthApiService, SlugService],
})
export class BackendAuthModule {}
