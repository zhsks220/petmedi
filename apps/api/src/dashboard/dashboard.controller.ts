import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('대시보드')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'VET', 'STAFF')
  @ApiOperation({ summary: '대시보드 통합 통계', description: '대시보드에 표시되는 모든 통계를 조회합니다' })
  @ApiQuery({ name: 'hospitalId', required: true, description: '병원 ID' })
  @ApiResponse({ status: 200, description: '통계 조회 성공' })
  async getDashboardStats(@Query('hospitalId') hospitalId: string) {
    return this.dashboardService.getDashboardStats(hospitalId);
  }

  @Get('appointments/trend')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'VET', 'STAFF')
  @ApiOperation({ summary: '주간 예약 트렌드', description: '최근 7일간의 예약 추이를 조회합니다' })
  @ApiQuery({ name: 'hospitalId', required: true, description: '병원 ID' })
  @ApiResponse({ status: 200, description: '트렌드 조회 성공' })
  async getWeeklyAppointmentTrend(@Query('hospitalId') hospitalId: string) {
    return this.dashboardService.getWeeklyAppointmentTrend(hospitalId);
  }

  @Get('revenue/trend')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN')
  @ApiOperation({ summary: '월간 매출 트렌드', description: '최근 6개월간의 매출 추이를 조회합니다' })
  @ApiQuery({ name: 'hospitalId', required: true, description: '병원 ID' })
  @ApiQuery({ name: 'months', required: false, description: '조회 개월 수 (기본: 6)' })
  @ApiResponse({ status: 200, description: '트렌드 조회 성공' })
  async getMonthlyRevenueTrend(
    @Query('hospitalId') hospitalId: string,
    @Query('months') months?: number,
  ) {
    return this.dashboardService.getMonthlyRevenueTrend(hospitalId, months || 6);
  }

  @Get('species/distribution')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'VET', 'STAFF')
  @ApiOperation({ summary: '종별 환자 분포', description: '환자 동물의 종별 분포를 조회합니다' })
  @ApiQuery({ name: 'hospitalId', required: true, description: '병원 ID' })
  @ApiResponse({ status: 200, description: '분포 조회 성공' })
  async getSpeciesDistribution(@Query('hospitalId') hospitalId: string) {
    return this.dashboardService.getSpeciesDistribution(hospitalId);
  }
}
