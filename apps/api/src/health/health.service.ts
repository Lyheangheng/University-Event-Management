import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface HealthCheckResult {
  status: string;
  database: string;
  timestamp: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async checkHealth(): Promise<HealthCheckResult> {
    let dbStatus = 'disconnected';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (error) {
      this.logger.warn('Database health check query ping skipped or failed (PostgreSQL offline/unreachable).');
    }

    return {
      status: 'ok',
      database: dbStatus,
      timestamp: new Date().toISOString(),
    };
  }
}
