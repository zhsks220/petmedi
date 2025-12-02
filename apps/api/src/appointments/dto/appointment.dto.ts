import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsInt,
  Min,
  Max,
  Matches,
} from 'class-validator';

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum AppointmentType {
  CONSULTATION = 'CONSULTATION',
  VACCINATION = 'VACCINATION',
  SURGERY = 'SURGERY',
  CHECKUP = 'CHECKUP',
  GROOMING = 'GROOMING',
  FOLLOW_UP = 'FOLLOW_UP',
  EMERGENCY = 'EMERGENCY',
  OTHER = 'OTHER',
}

export class CreateAppointmentDto {
  @ApiProperty({ description: '병원 ID' })
  @IsString()
  hospitalId: string;

  @ApiProperty({ description: '동물 ID' })
  @IsString()
  animalId: string;

  @ApiPropertyOptional({ description: '담당 수의사 ID' })
  @IsString()
  @IsOptional()
  vetId?: string;

  @ApiProperty({ description: '예약 날짜', example: '2024-01-15' })
  @IsDateString()
  appointmentDate: string;

  @ApiProperty({ description: '시작 시간 (HH:mm)', example: '14:00' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: '시간 형식은 HH:mm이어야 합니다',
  })
  startTime: string;

  @ApiPropertyOptional({ description: '종료 시간 (HH:mm)', example: '14:30' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: '시간 형식은 HH:mm이어야 합니다',
  })
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({ description: '예상 소요시간 (분)', default: 30 })
  @IsInt()
  @Min(10)
  @Max(240)
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({ enum: AppointmentType, default: 'CONSULTATION' })
  @IsEnum(AppointmentType)
  @IsOptional()
  type?: AppointmentType;

  @ApiPropertyOptional({ description: '방문 사유' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: '증상 설명' })
  @IsString()
  @IsOptional()
  symptoms?: string;

  @ApiPropertyOptional({ description: '메모' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateAppointmentDto extends PartialType(CreateAppointmentDto) {
  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsEnum(AppointmentStatus)
  @IsOptional()
  status?: AppointmentStatus;

  @ApiPropertyOptional({ description: '취소 사유' })
  @IsString()
  @IsOptional()
  cancelReason?: string;
}

export class UpdateStatusDto {
  @ApiProperty({ enum: AppointmentStatus })
  @IsEnum(AppointmentStatus)
  status: AppointmentStatus;

  @ApiPropertyOptional({ description: '취소 사유 (취소 시 필수)' })
  @IsString()
  @IsOptional()
  cancelReason?: string;
}

export class AppointmentQueryDto {
  @ApiPropertyOptional({ description: '병원 ID' })
  @IsString()
  @IsOptional()
  hospitalId?: string;

  @ApiPropertyOptional({ description: '동물 ID' })
  @IsString()
  @IsOptional()
  animalId?: string;

  @ApiPropertyOptional({ description: '보호자 ID' })
  @IsString()
  @IsOptional()
  guardianId?: string;

  @ApiPropertyOptional({ description: '수의사 ID' })
  @IsString()
  @IsOptional()
  vetId?: string;

  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsEnum(AppointmentStatus)
  @IsOptional()
  status?: AppointmentStatus;

  @ApiPropertyOptional({ description: '조회 시작 날짜', example: '2024-01-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: '조회 종료 날짜', example: '2024-01-31' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: '페이지', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: '페이지당 개수', default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}

export class AvailableSlotsQueryDto {
  @ApiProperty({ description: '병원 ID' })
  @IsString()
  hospitalId: string;

  @ApiProperty({ description: '조회 날짜', example: '2024-01-15' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ enum: AppointmentType })
  @IsEnum(AppointmentType)
  @IsOptional()
  type?: AppointmentType;
}

// Time Slot DTOs
export class CreateTimeSlotDto {
  @ApiProperty({ description: '병원 ID' })
  @IsString()
  hospitalId: string;

  @ApiProperty({ description: '요일 (0=일요일, 6=토요일)', minimum: 0, maximum: 6 })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ description: '시작 시간 (HH:mm)', example: '09:00' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  startTime: string;

  @ApiProperty({ description: '종료 시간 (HH:mm)', example: '18:00' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  endTime: string;

  @ApiPropertyOptional({ description: '슬롯 단위 (분)', default: 30 })
  @IsInt()
  @Min(10)
  @Max(120)
  @IsOptional()
  slotDuration?: number;

  @ApiPropertyOptional({ description: '동시 예약 가능 수', default: 1 })
  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  maxAppointments?: number;
}

export class UpdateTimeSlotDto extends PartialType(CreateTimeSlotDto) {}

// Hospital Holiday DTOs
export class CreateHolidayDto {
  @ApiProperty({ description: '병원 ID' })
  @IsString()
  hospitalId: string;

  @ApiProperty({ description: '휴무일', example: '2024-01-01' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ description: '휴무 사유' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: '매년 반복 여부', default: false })
  @IsOptional()
  isRecurring?: boolean;
}

// Response DTOs
export class AppointmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  hospitalId: string;

  @ApiProperty()
  animalId: string;

  @ApiProperty()
  guardianId: string;

  @ApiPropertyOptional()
  vetId?: string;

  @ApiProperty()
  appointmentDate: Date;

  @ApiProperty()
  startTime: string;

  @ApiPropertyOptional()
  endTime?: string;

  @ApiProperty()
  duration: number;

  @ApiProperty({ enum: AppointmentType })
  type: AppointmentType;

  @ApiProperty({ enum: AppointmentStatus })
  status: AppointmentStatus;

  @ApiPropertyOptional()
  reason?: string;

  @ApiPropertyOptional()
  symptoms?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class AvailableSlotDto {
  @ApiProperty({ description: '시작 시간', example: '09:00' })
  startTime: string;

  @ApiProperty({ description: '종료 시간', example: '09:30' })
  endTime: string;

  @ApiProperty({ description: '예약 가능 여부' })
  available: boolean;

  @ApiProperty({ description: '남은 예약 가능 수' })
  remainingSlots: number;
}
