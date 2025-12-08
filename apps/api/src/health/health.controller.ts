import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { HealthService, HealthCheckResult } from './health.service';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('헬스체크')
@Controller('health')
@SkipThrottle() // 헬스체크는 Rate Limiting에서 제외
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '기본 헬스체크', description: '서버 상태를 확인합니다' })
  @ApiResponse({ status: 200, description: '서버 정상' })
  @ApiResponse({ status: 503, description: '서버 이상' })
  check(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('detailed')
  @ApiOperation({ summary: '상세 헬스체크', description: '모든 서비스 상태를 확인합니다' })
  @ApiResponse({ status: 200, description: '전체 서비스 정상' })
  @ApiResponse({ status: 503, description: '일부 서비스 이상' })
  async detailedCheck(): Promise<HealthCheckResult> {
    return this.healthService.checkHealth();
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: '준비 상태 체크', description: '서버가 요청을 처리할 준비가 되었는지 확인합니다' })
  @ApiResponse({ status: 200, description: '서버 준비 완료' })
  @ApiResponse({ status: 503, description: '서버 준비 중' })
  async readinessCheck(): Promise<{ status: string; ready: boolean }> {
    const health = await this.healthService.checkHealth();
    return {
      status: health.status,
      ready: health.status === 'healthy',
    };
  }

  @Public()
  @Get('live')
  @ApiOperation({ summary: '활성 상태 체크', description: '서버가 살아있는지 확인합니다' })
  @ApiResponse({ status: 200, description: '서버 활성' })
  liveCheck(): { status: string; alive: boolean } {
    return {
      status: 'ok',
      alive: true,
    };
  }
}
