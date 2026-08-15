import { Type, plainToInstance } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, IsString, IsUrl, validateSync } from "class-validator";

export enum Environment {
  Development = "development",
  Production = "production",
  Test = "test",
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  PORT = 3000;

  @IsUrl({ require_tld: false })
  @IsOptional()
  FRONTEND_URL?: string;

  @IsString()
  @IsOptional()
  TMDB_API_KEY?: string;

  @IsString()
  @IsOptional()
  TMDB_ACCESS_TOKEN?: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  TMDB_BASE_URL = "https://api.themoviedb.org/3";

  @IsUrl({ require_tld: false })
  @IsOptional()
  TORRENTIO_BASE_URL = "https://torrentio.strem.fun";

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  CACHE_TTL = 3600;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  THROTTLE_TTL = 60000;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  THROTTLE_LIMIT = 100;
}

export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Environment validation error: ${errors.toString()}`);
  }
  if (!validatedConfig.TMDB_API_KEY && !validatedConfig.TMDB_ACCESS_TOKEN) {
    throw new Error("Environment validation error: TMDB_API_KEY or TMDB_ACCESS_TOKEN is required");
  }
  return validatedConfig;
}
