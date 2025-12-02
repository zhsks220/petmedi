import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, IsDateString, IsBoolean, IsArray } from 'class-validator';

export enum Species {
  DOG = 'DOG',
  CAT = 'CAT',
  BIRD = 'BIRD',
  RABBIT = 'RABBIT',
  HAMSTER = 'HAMSTER',
  FISH = 'FISH',
  REPTILE = 'REPTILE',
  OTHER = 'OTHER',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  UNKNOWN = 'UNKNOWN',
}

export class CreateAnimalDto {
  @ApiProperty({ example: '멍멍이', description: '동물 이름' })
  @IsString()
  name: string;

  @ApiProperty({ enum: Species, description: '종류' })
  @IsEnum(Species)
  species: Species;

  @ApiPropertyOptional({ example: '골든 리트리버', description: '품종' })
  @IsOptional()
  @IsString()
  breed?: string;

  @ApiPropertyOptional({ example: '2020-03-15', description: '생년월일' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ enum: Gender, description: '성별' })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: 25.5, description: '체중 (kg)' })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ example: 'GOLD', description: '모색' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: '900123456789012', description: '마이크로칩 번호' })
  @IsOptional()
  @IsString()
  microchipId?: string;

  @ApiPropertyOptional({ example: true, description: '중성화 여부' })
  @IsOptional()
  @IsBoolean()
  isNeutered?: boolean;

  @ApiPropertyOptional({ example: ['심장 질환', '알러지'], description: '알러지/특이사항' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @ApiPropertyOptional({ description: '프로필 이미지 URL' })
  @IsOptional()
  @IsString()
  profileImage?: string;

  @ApiPropertyOptional({ description: '메모' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: '아빠', description: '보호자와의 관계' })
  @IsOptional()
  @IsString()
  relationship?: string;
}

export class UpdateAnimalDto {
  @ApiPropertyOptional({ example: '멍멍이', description: '동물 이름' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '골든 리트리버', description: '품종' })
  @IsOptional()
  @IsString()
  breed?: string;

  @ApiPropertyOptional({ example: '2020-03-15', description: '생년월일' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ enum: Gender, description: '성별' })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: 25.5, description: '체중 (kg)' })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ example: 'GOLD', description: '모색' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: '900123456789012', description: '마이크로칩 번호' })
  @IsOptional()
  @IsString()
  microchipId?: string;

  @ApiPropertyOptional({ example: true, description: '중성화 여부' })
  @IsOptional()
  @IsBoolean()
  isNeutered?: boolean;

  @ApiPropertyOptional({ example: ['심장 질환', '알러지'], description: '알러지/특이사항' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @ApiPropertyOptional({ description: '프로필 이미지 URL' })
  @IsOptional()
  @IsString()
  profileImage?: string;

  @ApiPropertyOptional({ description: '메모' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SearchAnimalDto {
  @ApiProperty({ example: 'D-20200315-0000001', description: '동물 고유코드' })
  @IsString()
  code: string;
}

export class AddGuardianDto {
  @ApiProperty({ description: '보호자 사용자 ID' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ example: '엄마', description: '관계' })
  @IsOptional()
  @IsString()
  relationship?: string;

  @ApiPropertyOptional({ example: false, description: '소유자 여부' })
  @IsOptional()
  @IsBoolean()
  isOwner?: boolean;
}

export class AnimalResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'D-20200315-0000001', description: '고유코드' })
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: Species })
  species: Species;

  @ApiPropertyOptional()
  breed?: string;

  @ApiPropertyOptional()
  birthDate?: Date;

  @ApiPropertyOptional({ enum: Gender })
  gender?: Gender;

  @ApiPropertyOptional()
  weight?: number;

  @ApiPropertyOptional()
  color?: string;

  @ApiPropertyOptional()
  microchipId?: string;

  @ApiPropertyOptional()
  isNeutered?: boolean;

  @ApiPropertyOptional()
  allergies?: string[];

  @ApiPropertyOptional()
  profileImage?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;
}
