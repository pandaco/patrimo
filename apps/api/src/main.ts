import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app/app.module';

const GLOBAL_PREFIX = 'api';

function parseOrigins(raw: string | undefined, isProd: boolean): string[] {
  if (!raw) {
    if (isProd) {
      throw new Error('FRONTEND_URL must be set in production — refusing to fall back to localhost.');
    }
    return ['http://localhost:4200'];
  }
  const out: string[] = [];
  for (const fragment of raw.split(',')) {
    const trimmed = fragment.trim();
    if (!trimmed) continue;
    try {
      // Throws if not a valid absolute URL. We keep the original string in the
      // whitelist because that is what `cors()` compares against — but we
      // refuse to silently include typo'd values like 'http//foo.com'.
      new URL(trimmed);
      out.push(trimmed);
    } catch {
      Logger.warn(`Ignoring malformed FRONTEND_URL origin: "${trimmed}"`, 'Bootstrap');
    }
  }
  if (out.length === 0) {
    if (isProd) {
      throw new Error(`FRONTEND_URL contained no valid origin (got: "${raw}") — refusing to fall back to localhost.`);
    }
    return ['http://localhost:4200'];
  }
  return out;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  app.setGlobalPrefix(GLOBAL_PREFIX);
  app.use(cookieParser(config.getOrThrow<string>('SESSION_SECRET')));

  // Security headers — disable the bundled CSP because we have no inline
  // assets to whitelist yet and an unscoped CSP would silently break the
  // Yahoo Finance price fetches. Everything else (X-Frame-Options, HSTS,
  // X-Content-Type-Options, Referrer-Policy, etc.) ships with defaults.
  app.use(helmet({ contentSecurityPolicy: false }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const isProd  = config.get<string>('NODE_ENV') === 'production';
  const origins = parseOrigins(config.get<string>('FRONTEND_URL'), isProd);
  app.enableCors({ origin: origins, credentials: true });
  app.set('frontend-url', origins[0]);
  app.set('trust proxy', 1);

  app.enableShutdownHooks();

  const port = config.get<number>('PORT', 3333);
  await app.listen(port);

  Logger.log(`API ready on http://localhost:${port}/${GLOBAL_PREFIX}`, 'Bootstrap');
}

bootstrap().catch(err => {
  Logger.error(err, 'Bootstrap');
  process.exit(1);
});
