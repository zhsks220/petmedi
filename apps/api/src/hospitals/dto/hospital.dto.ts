import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateHospitalDto {
  @ApiProperty({ example: '서울동물병원', description: '병원명' })
  @IsString()
  name: string;

  @ApiProperty({ example: '123-45-67890', description: '사업자등록번호' })
  @IsString()
  businessNumber: string;

  @ApiPropertyOptional({ example: '동물병원-2024-001', description: '동물병원 면허번호' })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiProperty({ example: '서울시 강남구 테헤란로 123', description: '주소' })
  @IsString()
  address: string;

  @ApiPropertyOptional({ example: '5층 501호', description: '상세주소' })
  @IsOptional()
  @IsString()
  addressDetail?: string;

  @ApiPropertyOptional({ example: '06234', description: '우편번호' })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiProperty({ example: '02-1234-5678', description: '전화번호' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: 'hospital@example.com', description: '이메일' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'https://hospital.example.com', description: '웹사이트' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ description: '병원 설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '09:00-18:00', description: '운영시간' })
  @IsOptional()
  @IsString()
  operatingHours?: string;

  @ApiPropertyOptional({ example: true, description: '네트워크 가입 여부' })
  @IsOptional()
  @IsBoolean()
  isNetworkMember?: boolean;
}

export class UpdateHospitalDto {
  @ApiPropertyOptional({ example: '서울동물병원', description: '병원명' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '서울시 강남구 테헤란로 123', description: '주소' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '5층 501호', description: '상세주소' })
  @IsOptional()
  @IsString()
  addressDetail?: string;

  @ApiPropertyOptional({ example: '06234', description: '우편번호' })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiPropertyOptional({ example: '02-1234-5678', description: '전화번호' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'hospital@example.com', description: '이메일' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'https://hospital.example.com', description: '웹사이트' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ description: '병원 설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '09:00-18:00', description: '운영시간' })
  @IsOptional()
  @IsString()
  operatingHours?: string;
}

export class AddStaffDto {
  @ApiProperty({ description: '사용자 ID' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ example: 'VET', description: '직위 (OWNER, MANAGER, VET, NURSE, RECEPTIONIST)' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ description: '면허번호 (수의사인 경우)' })
  @IsOptional()
  @IsString()
  licenseNumber?: string;
}

export class UpdateStaffDto {
  @ApiPropertyOptional({ example: 'VET', description: '직위 (OWNER, MANAGER, VET, NURSE, RECEPTIONIST)' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ description: '면허번호' })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiPropertyOptional({ description: '활성 상태' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
