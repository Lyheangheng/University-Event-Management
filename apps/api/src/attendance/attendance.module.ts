import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { StorageModule } from '../storage/storage.module';
import { AuthModule } from '../auth/auth.module';
import { getRequiredJwtSecret } from '../config/jwt-secret.helper';

@Module({
  imports: [
    StorageModule,
    AuthModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: getRequiredJwtSecret(configService),
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

