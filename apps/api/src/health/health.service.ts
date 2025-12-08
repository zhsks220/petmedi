import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

export interface ServiceHealth {
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  error?: string;
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  services: {
    database: ServiceHealth;
    memory: ServiceHealth;
  };
  version: string;
  environment: string;
}

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  constructor(private prisma: PrismaService) {}

  async checkHealth(): Promise<HealthCheckResult> {
    const [database, memory] = await Promise.all([
      this.checkDatabase(),
      this.checkMemory(),
    ]);

    // 전체 상태 결정
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    if (database.status === 'unhealthy') {
      overallStatus = 'unhealthy';
    } else if (memory.status === 'unhealthy') {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      services: {
        database,
        memory,
      },
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  private async checkDatabase(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      // 간단한 쿼리로 DB 연결 확인
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }

  private checkMemory(): ServiceHealth {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
    const usagePercent = (heapUsedMB / heapTotalMB) * 100;

    // 메모리 사용량이 90% 이상이면 비정상
    if (usagePercent > 90) {
      return {
        status: 'unhealthy',
        error: `High memory usage: ${usagePercent.toFixed(1)}%`,
      };
    }

    return {
      status: 'healthy',
    };
  }
}
