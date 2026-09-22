import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 3001);
  const frontendUrl = configService.get<string>('frontendUrl', 'http://localhost:3000');

  // Set global API prefix (/api)
  app.setGlobalPrefix('api');

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global Response Transform Interceptor & Exception Filter
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS Configuration
  const nodeEnv = (configService.get<string>('nodeEnv') || process.env.NODE_ENV || 'development').toLowerCase();
  const allowedOrigins =
    nodeEnv === 'production'
      ? [frontendUrl]
      : [frontendUrl, 'http://localhost:3000', 'http://127.0.0.1:3000'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  await app.listen(port);
  logger.log(`Backend API server running on port ${port} with prefix /api`);
}
bootstrap();
