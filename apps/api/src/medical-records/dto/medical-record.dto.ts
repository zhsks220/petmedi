import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsDateString, IsArray, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class VitalSignsDto {
  @ApiPropertyOptional({ example: 38.5, description: '체온 (°C)' })
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @ApiPropertyOptional({ example: 120, description: '심박수 (bpm)' })
  @IsOptional()
  @IsNumber()
  heartRate?: number;

  @ApiPropertyOptional({ example: 24, description: '호흡수 (breaths/min)' })
  @IsOptional()
  @IsNumber()
  respiratoryRate?: number;

  @ApiPropertyOptional({ example: 25.5, description: '체중 (kg)' })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ example: 3, description: 'BCS (1-9)' })
  @IsOptional()
  @IsNumber()
  bodyConditionScore?: number;
}

export class PrescriptionDto {
  @ApiProperty({ example: '아목시실린', description: '약품명' })
  @IsString()
  medicationName: string;

  @ApiProperty({ example: '250mg', description: '용량' })
  @IsString()
  dosage: string;

  @ApiProperty({ example: '1일 2회', description: '투약 빈도' })
  @IsString()
  frequency: string;

  @ApiProperty({ example: 7, description: '투약 기간 (일)' })
  @IsNumber()
  duration: number;

  @ApiPropertyOptional({ description: '복약 지침' })
  @IsOptional()
  @IsString()
  instructions?: string;
}

export class LabResultDto {
  @ApiProperty({ example: '혈액검사', description: '검사명' })
  @IsString()
  testName: string;

  @ApiProperty({ example: 'WBC', description: '검사 항목' })
  @IsString()
  testItem: string;

  @ApiProperty({ example: '12.5', description: '결과값' })
  @IsString()
  resultValue: string;

  @ApiPropertyOptional({ example: '5.5-16.9', description: '정상 범위' })
  @IsOptional()
  @IsString()
  referenceRange?: string;

  @ApiPropertyOptional({ example: '10^3/uL', description: '단위' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ example: false, description: '이상 여부' })
  @IsOptional()
  @IsBoolean()
  isAbnormal?: boolean;
}

export class CreateMedicalRecordDto {
  @ApiProperty({ description: '동물 ID' })
  @IsString()
  animalId: string;

  @ApiProperty({ description: '병원 ID' })
  @IsString()
  hospitalId: string;

  @ApiPropertyOptional({ example: '2024-01-15', description: '내원일' })
  @IsOptional()
  @IsDateString()
  visitDate?: string;

  @ApiProperty({ example: '식욕부진, 구토', description: '주요 증상 (Chief Complaint)' })
  @IsString()
  chiefComplaint: string;

  @ApiPropertyOptional({ description: '주관적 소견 (Subjective)' })
  @IsOptional()
  @IsString()
  subjective?: string;

  @ApiPropertyOptional({ type: VitalSignsDto, description: '객관적 검사 결과 (Objective)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => VitalSignsDto)
  vitalSigns?: VitalSignsDto;

  @ApiPropertyOptional({ description: '신체검사 소견' })
  @IsOptional()
  @IsString()
  physicalExamination?: string;

  @ApiPropertyOptional({ example: '급성 위장염', description: '진단명 (Assessment)' })
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiPropertyOptional({ example: ['K29.1', 'R11'], description: '진단 코드' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  diagnosisCodes?: string[];

  @ApiPropertyOptional({ description: '치료 계획 (Plan)' })
  @IsOptional()
  @IsString()
  treatmentPlan?: string;

  @ApiPropertyOptional({ description: '시행한 처치' })
  @IsOptional()
  @IsString()
  proceduresPerformed?: string;

  @ApiPropertyOptional({ type: [PrescriptionDto], description: '처방전' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionDto)
  prescriptions?: PrescriptionDto[];

  @ApiPropertyOptional({ type: [LabResultDto], description: '검사 결과' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => LabResultDto)
  labResults?: LabResultDto[];

  @ApiPropertyOptional({ description: '다음 예약일' })
  @IsOptional()
  @IsDateString()
  followUpDate?: string;

  @ApiPropertyOptional({ description: '내부 메모' })
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @ApiPropertyOptional({ example: ['image1.jpg'], description: '첨부 이미지' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}

export class UpdateMedicalRecordDto {
  @ApiPropertyOptional({ description: '주관적 소견 (Subjective)' })
  @IsOptional()
  @IsString()
  subjective?: string;

  @ApiPropertyOptional({ type: VitalSignsDto, description: '객관적 검사 결과' })
  @IsOptional()
  @ValidateNested()
  @Type(() => VitalSignsDto)
  vitalSigns?: VitalSignsDto;

  @ApiPropertyOptional({ description: '신체검사 소견' })
  @IsOptional()
  @IsString()
  physicalExamination?: string;

  @ApiPropertyOptional({ example: '급성 위장염', description: '진단명' })
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiPropertyOptional({ example: ['K29.1'], description: '진단 코드' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  diagnosisCodes?: string[];

  @ApiPropertyOptional({ description: '치료 계획' })
  @IsOptional()
  @IsString()
  treatmentPlan?: string;

  @ApiPropertyOptional({ description: '시행한 처치' })
  @IsOptional()
  @IsString()
  proceduresPerformed?: string;

  @ApiPropertyOptional({ description: '다음 예약일' })
  @IsOptional()
  @IsDateString()
  followUpDate?: string;

  @ApiPropertyOptional({ description: '내부 메모' })
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @ApiPropertyOptional({ example: ['image1.jpg'], description: '첨부 이미지' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}
