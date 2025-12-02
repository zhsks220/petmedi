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
import { MedicalRecordsService } from './medical-records.service';
import { CreateMedicalRecordDto, UpdateMedicalRecordDto } from './dto/medical-record.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('진료 기록')
@Controller('medical-records')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('VET', 'ADMIN')
  @ApiOperation({ summary: '진료 기록 작성', description: '새로운 진료 기록을 작성합니다 (수의사만)' })
  @ApiResponse({ status: 201, description: '진료 기록 작성 성공' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async create(@Body() dto: CreateMedicalRecordDto, @CurrentUser('id') vetId: string) {
    return this.medicalRecordsService.create(dto, vetId);
  }

  @Get('animal/:animalId')
  @ApiOperation({ summary: '동물별 진료 기록', description: '특정 동물의 진료 기록을 조회합니다' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: '진료 기록 조회 성공' })
  async findByAnimal(
    @Param('animalId') animalId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.medicalRecordsService.findByAnimal(animalId, page || 1, limit || 20);
  }

  @Get('hospital/:hospitalId')
  @UseGuards(RolesGuard)
  @Roles('VET', 'STAFF', 'ADMIN')
  @ApiOperation({ summary: '병원별 진료 기록', description: '특정 병원의 진료 기록을 조회합니다' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'date', required: false, type: String, description: '날짜 필터 (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: '진료 기록 조회 성공' })
  async findByHospital(
    @Param('hospitalId') hospitalId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('date') date?: string,
  ) {
    return this.medicalRecordsService.findByHospital(hospitalId, page || 1, limit || 20, date);
  }

  @Get('shared')
  @ApiOperation({ summary: '공유/전체 진료 기록', description: 'SUPER_ADMIN은 전체, 그 외는 코드로 조회' })
  @ApiQuery({ name: 'code', required: false, description: '동물 고유코드' })
  @ApiQuery({ name: 'hospitalId', required: false, description: '조회하는 병원 ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: '진료 기록 조회 성공' })
  async findSharedRecords(
    @CurrentUser() user: { id: string; role: string },
    @Query('code') code?: string,
    @Query('hospitalId') hospitalId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.medicalRecordsService.findSharedOrAll(user, code, hospitalId, page || 1, limit || 20);
  }

  @Get(':id')
  @ApiOperation({ summary: '진료 기록 상세', description: '진료 기록 상세 정보를 조회합니다' })
  @ApiResponse({ status: 200, description: '진료 기록 조회 성공' })
  @ApiResponse({ status: 404, description: '진료 기록 없음' })
  async findById(@Param('id') id: string) {
    return this.medicalRecordsService.findById(id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('VET', 'ADMIN')
  @ApiOperation({ summary: '진료 기록 수정', description: '진료 기록을 수정합니다' })
  @ApiResponse({ status: 200, description: '진료 기록 수정 성공' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '진료 기록 없음' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMedicalRecordDto,
    @CurrentUser('id') vetId: string,
  ) {
    return this.medicalRecordsService.update(id, dto, vetId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('VET', 'ADMIN')
  @ApiOperation({ summary: '진료 기록 삭제', description: '진료 기록을 삭제합니다 (작성자만)' })
  @ApiResponse({ status: 200, description: '진료 기록 삭제 성공' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '진료 기록 없음' })
  async delete(@Param('id') id: string, @CurrentUser('id') vetId: string) {
    return this.medicalRecordsService.delete(id, vetId);
  }
}
