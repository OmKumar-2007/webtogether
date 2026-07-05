import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

/**
 * Application bootstrap.
 *
 * Wires up:
 *  - Helmet for hardened HTTP headers
 *  - Global validation pipe (DTOs validated automatically)
 *  - Global exception filter (consistent error envelope)
 *  - CORS (configurable via CORS_ORIGIN)
 *  - Swagger UI at /api/docs
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  app.useLogger(['log', 'error', 'warn', 'debug', 'verbose']);
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN', '*'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Swagger docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('WebTogether API')
    .setDescription('REST + WebSocket API for the WebTogether social chat extension.')
    .setVersion('0.1.0')
    .addTag('rooms')
    .addTag('messages')
    .addTag('auth')
    .addTag('users')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  Logger.log(`🚀 WebTogether backend listening on http://localhost:${port}`, 'Bootstrap');
  Logger.log(`📚 Swagger UI at http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal error during bootstrap', err);
  process.exit(1);
});
