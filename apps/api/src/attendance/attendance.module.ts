import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    StorageModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwtSecret', 'dev-secret-key-university-event-system'),
        signOptions: {
          expiresIn: configService.get<string>('jwtExpiresIn') || '1d',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
