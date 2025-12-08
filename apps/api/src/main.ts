import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Enhanced CORS for mobile app integration
  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim());

  // Production Vercel domains - always allowed
  const productionDomains = [
    'https://petmedi.vercel.app',
    'https://www.petmedi.vercel.app',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes('*') ||
        productionDomains.includes(origin) ||
        // Allow localhost for development
        origin.match(/^https?:\/\/localhost(:\d+)?$/) ||
        // Allow all Vercel deployments (preview and production)
        origin.match(/^https:\/\/.*\.vercel\.app$/) ||
        origin.match(/^https:\/\/petmedi.*\.vercel\.app$/) ||
        // Allow Expo development
        origin.match(/^exp:\/\//) ||
        // Allow React Native debugger
        origin.match(/^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/)
      ) {
        return callback(null, true);
      }

      console.log(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-Device-Id',
      'X-Platform',
      'X-App-Version',
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
    maxAge: 86400, // 24 hours
  });

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('PetMedi API')
    .setDescription('동물병원 통합 의료 플랫폼 API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', '인증')
    .addTag('hospitals', '병원 관리')
    .addTag('animals', '동물 관리')
    .addTag('medical-records', '진료기록')
    .addTag('guardians', '보호자 관리')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || process.env.API_PORT || 4000;
  await app.listen(port);

  console.log(`🚀 PetMedi API is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
