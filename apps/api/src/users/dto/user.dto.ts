import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsEnum, MinLength } from 'class-validator';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  HOSPITAL_ADMIN = 'HOSPITAL_ADMIN',
  VET = 'VET',
  STAFF = 'STAFF',
  GUARDIAN = 'GUARDIAN',
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: '홍길동', description: '이름' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '010-1234-5678', description: '전화번호' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: '프로필 이미지 URL' })
  @IsOptional()
  @IsString()
  profileImage?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: '현재 비밀번호' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ description: '새 비밀번호 (최소 8자)' })
  @IsString()
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다' })
  newPassword: string;
}

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiPropertyOptional()
  profileImage?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  lastLoginAt?: Date;
}

export class AdminUpdateUserDto extends UpdateUserDto {
  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean;
}
