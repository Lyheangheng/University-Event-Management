import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { LineService } from './line.service';
import { LineMessagingService } from './line-messaging.service';
import { LineController } from './line.controller';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwtSecret'),
        signOptions: {
          expiresIn: configService.get<string>('jwtExpiresIn') || '1d',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [LineService, LineMessagingService],
  controllers: [LineController],
  exports: [LineService, LineMessagingService],
})
export class LineModule {}
