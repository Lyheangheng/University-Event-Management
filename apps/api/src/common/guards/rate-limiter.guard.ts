import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private readonly logger = new Logger(RateLimiterGuard.name);
  private readonly storage = new Map<string, RateLimitRecord>();
  private readonly limit = 30; // Max 30 requests per minute per IP
  private readonly ttlMs = 60 * 1000; // 1 minute window

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip =
      request.headers['x-forwarded-for'] ||
      request.ip ||
      request.connection?.remoteAddress ||
      '127.0.0.1';

    const route = request.route?.path || request.url || '';
    const key = `${ip}:${route}`;
    const now = Date.now();

    const record = this.storage.get(key);

    if (!record || now > record.resetTime) {
      this.storage.set(key, {
        count: 1,
        resetTime: now + this.ttlMs,
      });
      return true;
    }

    if (record.count >= this.limit) {
      this.logger.warn(`Rate limit exceeded for IP '${ip}' on route '${route}'.`);
      throw new HttpException(
        'Too many requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.count++;
    return true;
  }
}
