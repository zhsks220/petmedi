import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Enums
export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum InvoiceItemType {
  CONSULTATION = 'CONSULTATION',
  SURGERY = 'SURGERY',
  MEDICATION = 'MEDICATION',
  INJECTION = 'INJECTION',
  LAB_TEST = 'LAB_TEST',
  IMAGING = 'IMAGING',
  HOSPITALIZATION = 'HOSPITALIZATION',
  GROOMING = 'GROOMING',
  VACCINATION = 'VACCINATION',
  SUPPLIES = 'SUPPLIES',
  DISCOUNT = 'DISCOUNT',
  OTHER = 'OTHER',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
  MOBILE = 'MOBILE',
  INSURANCE = 'INSURANCE',
  POINT = 'POINT',
  OTHER = 'OTHER',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

// DTO for Invoice Items
export class CreateInvoiceItemDto {
  @ApiProperty({ enum: InvoiceItemType, description: '항목 유형' })
  @IsEnum(InvoiceItemType)
  type: InvoiceItemType;

  @ApiProperty({ description: '항목명' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '상세 설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '수량', minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: '단가', minimum: 0 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ description: '할인율 (%)', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountRate?: number;

  @ApiPropertyOptional({ description: '할인 금액', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class UpdateInvoiceItemDto {
  @ApiPropertyOptional({ enum: InvoiceItemType })
  @IsOptional()
  @IsEnum(InvoiceItemType)
  type?: InvoiceItemType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

// DTO for Invoice
export class CreateInvoiceDto {
  @ApiProperty({ description: '병원 ID' })
  @IsString()
  hospitalId: string;

  @ApiProperty({ description: '동물 ID' })
  @IsString()
  animalId: string;

  @ApiProperty({ description: '보호자 ID' })
  @IsString()
  guardianId: string;

  @ApiPropertyOptional({ description: '연결된 진료 기록 ID' })
  @IsOptional()
  @IsString()
  medicalRecordId?: string;

  @ApiPropertyOptional({ description: '연결된 예약 ID' })
  @IsOptional()
  @IsString()
  appointmentId?: string;

  @ApiPropertyOptional({ description: '결제 기한' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: '메모' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: '내부 메모' })
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @ApiProperty({ type: [CreateInvoiceItemDto], description: '청구 항목 목록' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];
}

export class UpdateInvoiceDto {
  @ApiPropertyOptional({ description: '결제 기한' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ enum: InvoiceStatus, description: '상태' })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional({ description: '메모' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: '내부 메모' })
  @IsOptional()
  @IsString()
  internalNotes?: string;
}

export class InvoiceQueryDto {
  @ApiPropertyOptional({ description: '병원 ID' })
  @IsOptional()
  @IsString()
  hospitalId?: string;

  @ApiPropertyOptional({ description: '보호자 ID' })
  @IsOptional()
  @IsString()
  guardianId?: string;

  @ApiPropertyOptional({ description: '동물 ID' })
  @IsOptional()
  @IsString()
  animalId?: string;

  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional({ description: '시작일 (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료일 (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '페이지 번호', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '페이지당 항목 수', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

// DTO for Payment
export class CreatePaymentDto {
  @ApiProperty({ description: '청구서 ID' })
  @IsString()
  invoiceId: string;

  @ApiProperty({ description: '결제 금액', minimum: 0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ enum: PaymentMethod, description: '결제 방법' })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiPropertyOptional({ description: '마스킹된 카드번호' })
  @IsOptional()
  @IsString()
  cardNumber?: string;

  @ApiPropertyOptional({ description: '카드사' })
  @IsOptional()
  @IsString()
  cardCompany?: string;

  @ApiPropertyOptional({ description: '승인번호' })
  @IsOptional()
  @IsString()
  cardApprovalNo?: string;

  @ApiPropertyOptional({ description: '할부 개월 (0=일시불)' })
  @IsOptional()
  @IsNumber()
  cardInstallment?: number;

  @ApiPropertyOptional({ description: '메모' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RefundPaymentDto {
  @ApiProperty({ description: '환불 금액', minimum: 0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: '환불 사유' })
  @IsString()
  reason: string;
}

export class PaymentQueryDto {
  @ApiPropertyOptional({ description: '병원 ID' })
  @IsOptional()
  @IsString()
  hospitalId?: string;

  @ApiPropertyOptional({ description: '청구서 ID' })
  @IsOptional()
  @IsString()
  invoiceId?: string;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @ApiPropertyOptional({ description: '시작일 (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료일 (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class InvoiceStatsQueryDto {
  @ApiProperty({ description: '병원 ID' })
  @IsString()
  hospitalId: string;

  @ApiPropertyOptional({ description: '시작일 (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료일 (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
