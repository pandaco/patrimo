import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app/app.module';

const GLOBAL_PREFIX = 'api';

function parseOrigins(raw: string | undefined): string[] {
  if (!raw) return ['http://localhost:4200'];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  app.setGlobalPrefix(GLOBAL_PREFIX);
  app.use(cookieParser(config.getOrThrow<string>('SESSION_SECRET')));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const origins = parseOrigins(config.get<string>('FRONTEND_URL'));
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
