import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
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
import { AppointmentsService } from './appointments.service';
import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
  UpdateStatusDto,
  AppointmentQueryDto,
  AvailableSlotsQueryDto,
  CreateTimeSlotDto,
  UpdateTimeSlotDto,
  CreateHolidayDto,
  AppointmentResponseDto,
} from './dto/appointment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('예약')
@Controller('appointments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  // ===========================
  // 예약 관리
  // ===========================

  @Post()
  @ApiOperation({ summary: '예약 생성', description: '새로운 예약을 생성합니다' })
  @ApiResponse({ status: 201, description: '예약 생성 성공', type: AppointmentResponseDto })
  @ApiResponse({ status: 400, description: '유효하지 않은 요청' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async create(
    @Body() dto: CreateAppointmentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.appointmentsService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: '예약 목록', description: '예약 목록을 조회합니다' })
  @ApiResponse({ status: 200, description: '예약 목록 조회 성공' })
  async findAll(
    @Query() query: AppointmentQueryDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.appointmentsService.findAll(query, user.id, user.role);
  }

  @Get('available-slots')
  @ApiOperation({ summary: '예약 가능 시간', description: '특정 날짜의 예약 가능 시간을 조회합니다' })
  @ApiResponse({ status: 200, description: '예약 가능 시간 조회 성공' })
  async getAvailableSlots(@Query() query: AvailableSlotsQueryDto) {
    return this.appointmentsService.getAvailableSlots(query);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'VET')
  @ApiOperation({ summary: '예약 통계', description: '예약 통계를 조회합니다' })
  @ApiQuery({ name: 'hospitalId', required: true })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: '예약 통계 조회 성공' })
  async getStats(
    @Query('hospitalId') hospitalId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.appointmentsService.getStats(hospitalId, startDate, endDate);
  }

  @Get(':id')
  @ApiOperation({ summary: '예약 상세', description: '예약 상세 정보를 조회합니다' })
  @ApiResponse({ status: 200, description: '예약 조회 성공', type: AppointmentResponseDto })
  @ApiResponse({ status: 404, description: '예약 없음' })
  async findById(@Param('id') id: string) {
    return this.appointmentsService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '예약 수정', description: '예약 정보를 수정합니다' })
  @ApiResponse({ status: 200, description: '예약 수정 성공', type: AppointmentResponseDto })
  @ApiResponse({ status: 400, description: '유효하지 않은 요청' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '예약 없음' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.appointmentsService.update(id, dto, user.id, user.role);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '예약 상태 변경', description: '예약 상태를 변경합니다' })
  @ApiResponse({ status: 200, description: '상태 변경 성공', type: AppointmentResponseDto })
  @ApiResponse({ status: 400, description: '유효하지 않은 요청' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.appointmentsService.updateStatus(id, dto, user.id, user.role);
  }

  @Delete(':id')
  @ApiOperation({ summary: '예약 삭제', description: '예약을 삭제합니다' })
  @ApiResponse({ status: 200, description: '예약 삭제 성공' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '예약 없음' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.appointmentsService.delete(id, user.id, user.role);
  }

  // ===========================
  // 타임슬롯 관리 (병원 관리자용)
  // ===========================

  @Post('time-slots')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN')
  @ApiOperation({ summary: '타임슬롯 생성', description: '예약 가능 시간대를 생성합니다' })
  @ApiResponse({ status: 201, description: '타임슬롯 생성 성공' })
  async createTimeSlot(@Body() dto: CreateTimeSlotDto) {
    return this.appointmentsService.createTimeSlot(dto);
  }

  @Get('time-slots/:hospitalId')
  @ApiOperation({ summary: '타임슬롯 목록', description: '병원의 타임슬롯 목록을 조회합니다' })
  @ApiResponse({ status: 200, description: '타임슬롯 목록 조회 성공' })
  async getTimeSlots(@Param('hospitalId') hospitalId: string) {
    return this.appointmentsService.getTimeSlots(hospitalId);
  }

  @Put('time-slots/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN')
  @ApiOperation({ summary: '타임슬롯 수정', description: '타임슬롯을 수정합니다' })
  @ApiResponse({ status: 200, description: '타임슬롯 수정 성공' })
  async updateTimeSlot(
    @Param('id') id: string,
    @Body() dto: UpdateTimeSlotDto,
  ) {
    return this.appointmentsService.updateTimeSlot(id, dto);
  }

  @Delete('time-slots/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN')
  @ApiOperation({ summary: '타임슬롯 삭제', description: '타임슬롯을 삭제합니다' })
  @ApiResponse({ status: 200, description: '타임슬롯 삭제 성공' })
  async deleteTimeSlot(@Param('id') id: string) {
    return this.appointmentsService.deleteTimeSlot(id);
  }

  // ===========================
  // 휴무일 관리 (병원 관리자용)
  // ===========================

  @Post('holidays')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN')
  @ApiOperation({ summary: '휴무일 등록', description: '병원 휴무일을 등록합니다' })
  @ApiResponse({ status: 201, description: '휴무일 등록 성공' })
  async createHoliday(@Body() dto: CreateHolidayDto) {
    return this.appointmentsService.createHoliday(dto);
  }

  @Get('holidays/:hospitalId')
  @ApiOperation({ summary: '휴무일 목록', description: '병원의 휴무일 목록을 조회합니다' })
  @ApiQuery({ name: 'year', required: false, description: '조회 연도' })
  @ApiResponse({ status: 200, description: '휴무일 목록 조회 성공' })
  async getHolidays(
    @Param('hospitalId') hospitalId: string,
    @Query('year') year?: number,
  ) {
    return this.appointmentsService.getHolidays(hospitalId, year);
  }

  @Delete('holidays/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN')
  @ApiOperation({ summary: '휴무일 삭제', description: '휴무일을 삭제합니다' })
  @ApiResponse({ status: 200, description: '휴무일 삭제 성공' })
  async deleteHoliday(@Param('id') id: string) {
    return this.appointmentsService.deleteHoliday(id);
  }
}
