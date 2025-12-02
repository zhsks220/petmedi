import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { HospitalsService } from './hospitals.service';
import { CreateHospitalDto, UpdateHospitalDto, AddStaffDto, UpdateStaffDto } from './dto/hospital.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('병원')
@Controller('hospitals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class HospitalsController {
  constructor(private readonly hospitalsService: HospitalsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('VET', 'ADMIN')
  @ApiOperation({ summary: '병원 등록', description: '새로운 병원을 등록합니다 (수의사/관리자만)' })
  @ApiResponse({ status: 201, description: '병원 등록 성공' })
  @ApiResponse({ status: 409, description: '중복된 사업자등록번호' })
  async create(@Body() dto: CreateHospitalDto, @CurrentUser('id') userId: string) {
    return this.hospitalsService.create(dto, userId);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: '병원 목록', description: '병원 목록을 조회합니다' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'networkOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: '병원 목록 조회 성공' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('networkOnly') networkOnly?: boolean,
  ) {
    return this.hospitalsService.findAll(page || 1, limit || 20, networkOnly);
  }

  @Get('my')
  @ApiOperation({ summary: '내 병원 목록', description: '내가 소속된 병원 목록을 조회합니다' })
  @ApiResponse({ status: 200, description: '내 병원 목록 조회 성공' })
  async getMyHospitals(@CurrentUser('id') userId: string) {
    return this.hospitalsService.getMyHospitals(userId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: '병원 상세', description: '병원 상세 정보를 조회합니다' })
  @ApiResponse({ status: 200, description: '병원 조회 성공' })
  @ApiResponse({ status: 404, description: '병원 없음' })
  async findById(@Param('id') id: string) {
    return this.hospitalsService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '병원 수정', description: '병원 정보를 수정합니다 (소유자/관리자만)' })
  @ApiResponse({ status: 200, description: '병원 수정 성공' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '병원 없음' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateHospitalDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.hospitalsService.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '병원 삭제', description: '병원을 비활성화합니다 (소유자만)' })
  @ApiResponse({ status: 200, description: '병원 삭제 성공' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '병원 없음' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.hospitalsService.delete(id, userId);
  }

  // Staff management
  @Post(':id/staff')
  @ApiOperation({ summary: '직원 추가', description: '병원에 직원을 추가합니다' })
  @ApiResponse({ status: 201, description: '직원 추가 성공' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 409, description: '이미 등록된 직원' })
  async addStaff(
    @Param('id') hospitalId: string,
    @Body() dto: AddStaffDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.hospitalsService.addStaff(hospitalId, dto, userId);
  }

  @Put(':id/staff/:staffId')
  @ApiOperation({ summary: '직원 수정', description: '직원 정보를 수정합니다' })
  @ApiResponse({ status: 200, description: '직원 수정 성공' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '직원 없음' })
  async updateStaff(
    @Param('id') hospitalId: string,
    @Param('staffId') staffId: string,
    @Body() dto: UpdateStaffDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.hospitalsService.updateStaff(hospitalId, staffId, dto, userId);
  }

  @Delete(':id/staff/:staffId')
  @ApiOperation({ summary: '직원 삭제', description: '직원을 비활성화합니다' })
  @ApiResponse({ status: 200, description: '직원 삭제 성공' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '직원 없음' })
  async removeStaff(
    @Param('id') hospitalId: string,
    @Param('staffId') staffId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.hospitalsService.removeStaff(hospitalId, staffId, userId);
  }
}
