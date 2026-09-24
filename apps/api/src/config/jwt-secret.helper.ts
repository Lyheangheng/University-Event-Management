import { ConfigService } from '@nestjs/config';

export const DEV_DEFAULT_JWT_SECRET = 'dev-secret-key-university-event-system';

/**
 * Resolves the JWT Secret for NestJS modules and strategies.
 * In production mode (NODE_ENV === 'production'), requires JWT_SECRET to be explicitly configured.
 * Throws a fatal configuration error if JWT_SECRET is missing or set to the development fallback in production.
 */
export function getRequiredJwtSecret(configService: ConfigService): string {
  const nodeEnv = (
    configService.get<string>('nodeEnv') ||
    configService.get<string>('NODE_ENV') ||
    process.env.NODE_ENV ||
    'development'
  ).toLowerCase();

  const isProduction = nodeEnv === 'production';

  const secret =
    configService.get<string>('jwtSecret') ||
    configService.get<string>('JWT_SECRET') ||
    process.env.JWT_SECRET;

  const trimmedSecret = secret ? secret.trim() : '';

  if (isProduction) {
    if (!trimmedSecret || trimmedSecret === DEV_DEFAULT_JWT_SECRET) {
      throw new Error(
        'CRITICAL PRODUCTION SECURITY ERROR: JWT_SECRET environment variable must be explicitly configured in production environment. Development fallback secret is strictly forbidden.',
      );
    }
    return trimmedSecret;
  }

  return trimmedSecret || DEV_DEFAULT_JWT_SECRET;
}
