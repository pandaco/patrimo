import { Type, plainToInstance } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength, validateSync } from 'class-validator';

enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvVars {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3333;

  @IsString()
  FRONTEND_URL = 'http://localhost:4200';

  @IsOptional()
  @IsString()
  DATABASE_URL?: string;

  @IsOptional()
  @IsString()
  REDIS_URL?: string;

  @IsString()
  @MinLength(32, { message: 'JWT_SECRET must be at least 32 characters' })
  JWT_SECRET!: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN = '7d';

  @IsString()
  @MinLength(32, { message: 'SESSION_SECRET must be at least 32 characters' })
  SESSION_SECRET!: string;

  @IsString()
  GOOGLE_CLIENT_ID = 'configure-me';

  @IsString()
  GOOGLE_CLIENT_SECRET = 'configure-me';

  @IsString()
  GOOGLE_CALLBACK_URL = 'http://localhost:3333/api/auth/google/callback';

  @IsOptional()
  @IsString()
  GOOGLE_ALLOWED_EMAILS?: string;
}

export function validateEnv(raw: Record<string, unknown>): EnvVars {
  const parsed = plainToInstance(EnvVars, raw, { enableImplicitConversion: true });
  const errors = validateSync(parsed, { skipMissingProperties: false });
  if (errors.length) {
    throw new Error(
      'Invalid environment configuration:\n' +
        errors.map(e => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`).join('\n'),
    );
  }
  return parsed;
}
