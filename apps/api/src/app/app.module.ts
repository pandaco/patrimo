import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PersistenceModule } from '@patrimo/infrastructure';
import { ApplicationModule, CsrfMiddleware } from '@patrimo/application';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(),
    // Global rate limit — 100 requests / 60s per IP. Adequate baseline for a
    // single-user MVP; tighter buckets can be layered with `@Throttle()` on
    // sensitive routes (e.g. auth callbacks, CSV import).
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    PersistenceModule,
    ApplicationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // CSRF double-submit-cookie applies to every route. The middleware itself
    // shortcuts on safe methods (GET/HEAD/OPTIONS) and on the OAuth callback
    // paths, so its cost on read traffic is one cookie check.
    // '{*path}' is the path-to-regexp v8 (Nest 11) spelling of the old '*'
    // catch-all — same coverage, without the LegacyRouteConverter warning.
    consumer.apply(CsrfMiddleware).forRoutes('{*path}');
  }
}
