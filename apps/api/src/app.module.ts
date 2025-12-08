import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// Common
import { CommonModule } from './common/common.module';
import { LoggerModule } from './common/logger/logger.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

// Feature Modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HospitalsModule } from './hospitals/hospitals.module';
import { AnimalsModule } from './animals/animals.module';
import { MedicalRecordsModule } from './medical-records/medical-records.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { InvoicesModule } from './invoices/invoices.module';
import { InventoryModule } from './inventory/inventory.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';

// Guards
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env', '../../.env'],
    }),
    // Rate Limiting - 분당 100회 요청 제한 (일반), 분당 10회 (인증)
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1초
        limit: 3, // 초당 3회 제한
      },
      {
        name: 'medium',
        ttl: 10000, // 10초
        limit: 20, // 10초당 20회 제한
      },
      {
        name: 'long',
        ttl: 60000, // 1분
        limit: 100, // 분당 100회 제한
      },
    ]),
    CommonModule,
    LoggerModule,
    HealthModule,
    AuthModule,
    UsersModule,
    HospitalsModule,
    AnimalsModule,
    MedicalRecordsModule,
    AppointmentsModule,
    InvoicesModule,
    InventoryModule,
    NotificationsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global Logging Interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // Global Rate Limiting Guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global JWT Guard
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
