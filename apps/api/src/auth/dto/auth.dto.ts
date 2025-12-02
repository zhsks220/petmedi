import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';

export enum UserRole {
  GUARDIAN = 'GUARDIAN',
  VET = 'VET',
  STAFF = 'STAFF',
  ADMIN = 'ADMIN',
}

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: '이메일 주소' })
  @IsEmail({}, { message: '유효한 이메일 주소를 입력하세요' })
  email: string;

  @ApiProperty({ example: 'password123', description: '비밀번호 (최소 8자)' })
  @IsString()
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다' })
  password: string;

  @ApiProperty({ example: '홍길동', description: '이름' })
  @IsString()
  name: string;

  @ApiProperty({ example: '010-1234-5678', description: '전화번호', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: UserRole, default: UserRole.GUARDIAN, description: '사용자 역할' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com', description: '이메일 주소' })
  @IsEmail({}, { message: '유효한 이메일 주소를 입력하세요' })
  email: string;

  @ApiProperty({ example: 'password123', description: '비밀번호' })
  @IsString()
  password: string;
}

export class TokenResponseDto {
  @ApiProperty({ description: 'JWT 액세스 토큰' })
  accessToken: string;

  @ApiProperty({ description: 'JWT 리프레시 토큰' })
  refreshToken: string;

  @ApiProperty({ description: '사용자 정보' })
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export class RefreshTokenDto {
  @ApiProperty({ description: '리프레시 토큰' })
  @IsString()
  refreshToken: string;
}
