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
import { AnimalsService } from './animals.service';
import {
  CreateAnimalDto,
  UpdateAnimalDto,
  SearchAnimalDto,
  AddGuardianDto,
  AnimalResponseDto,
} from './dto/animal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('동물')
@Controller('animals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnimalsController {
  constructor(private readonly animalsService: AnimalsService) {}

  @Post()
  @ApiOperation({ summary: '동물 등록', description: '새로운 동물을 등록하고 고유코드를 발급합니다' })
  @ApiResponse({ status: 201, description: '동물 등록 성공', type: AnimalResponseDto })
  async create(@Body() dto: CreateAnimalDto, @CurrentUser('id') userId: string) {
    return this.animalsService.create(dto, userId);
  }

  @Get('my')
  @ApiOperation({ summary: '내 동물 목록', description: '내가 보호자인 동물 목록을 조회합니다' })
  @ApiResponse({ status: 200, description: '동물 목록 조회 성공' })
  async findMyAnimals(@CurrentUser('id') userId: string) {
    return this.animalsService.findMyAnimals(userId);
  }

  @Get('search')
  @ApiOperation({ summary: '동물 코드 검색', description: '동물 고유코드로 검색합니다 (네트워크 병원용)' })
  @ApiQuery({ name: 'code', description: '동물 고유코드 (예: D-20200315-0000001)' })
  @ApiQuery({ name: 'hospitalId', description: '검색하는 병원 ID' })
  @ApiResponse({ status: 200, description: '동물 검색 성공' })
  @ApiResponse({ status: 404, description: '동물 없음' })
  async searchByCode(
    @Query('code') code: string,
    @Query('hospitalId') hospitalId: string,
  ) {
    return this.animalsService.searchByCode(code, hospitalId);
  }

  @Get('code/:code')
  @ApiOperation({ summary: '동물 코드 조회', description: '동물 고유코드로 상세 정보를 조회합니다' })
  @ApiResponse({ status: 200, description: '동물 조회 성공', type: AnimalResponseDto })
  @ApiResponse({ status: 404, description: '동물 없음' })
  async findByCode(@Param('code') code: string) {
    return this.animalsService.findByCode(code);
  }

  @Get(':id')
  @ApiOperation({ summary: '동물 상세', description: '동물 상세 정보를 조회합니다' })
  @ApiResponse({ status: 200, description: '동물 조회 성공', type: AnimalResponseDto })
  @ApiResponse({ status: 404, description: '동물 없음' })
  async findById(@Param('id') id: string) {
    return this.animalsService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '동물 수정', description: '동물 정보를 수정합니다 (보호자만)' })
  @ApiResponse({ status: 200, description: '동물 수정 성공', type: AnimalResponseDto })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '동물 없음' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAnimalDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.animalsService.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '동물 삭제', description: '동물을 비활성화합니다 (소유자만)' })
  @ApiResponse({ status: 200, description: '동물 삭제 성공' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '동물 없음' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.animalsService.delete(id, userId);
  }

  // 보호자 관리
  @Post(':id/guardians')
  @ApiOperation({ summary: '보호자 추가', description: '동물에 보호자를 추가합니다' })
  @ApiResponse({ status: 201, description: '보호자 추가 성공' })
  @ApiResponse({ status: 400, description: '이미 등록된 보호자' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async addGuardian(
    @Param('id') animalId: string,
    @Body() dto: AddGuardianDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.animalsService.addGuardian(animalId, dto, userId);
  }

  @Delete(':id/guardians/:guardianId')
  @ApiOperation({ summary: '보호자 삭제', description: '동물의 보호자를 삭제합니다 (소유자만)' })
  @ApiResponse({ status: 200, description: '보호자 삭제 성공' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '보호자 없음' })
  async removeGuardian(
    @Param('id') animalId: string,
    @Param('guardianId') guardianId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.animalsService.removeGuardian(animalId, guardianId, userId);
  }
}
