import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Prisma Client connected to database successfully.');
    } catch (error) {
      this.logger.warn('Prisma Client initialized (database connection will complete upon database startup).');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma Client disconnected cleanly.');
  }
}
