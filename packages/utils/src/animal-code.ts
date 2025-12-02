/**
 * PetMedi 동물 고유코드 생성 및 파싱 유틸리티
 *
 * 코드 형식: A-YYYYMMDD-NNNNNNN
 * - A: 종 구분 코드 (D=Dog, C=Cat, B=Bird, R=Rabbit, H=Hamster, F=Fish, P=Reptile, X=Other)
 * - YYYYMMDD: 생년월일 (알 수 없는 경우 00000000 또는 추정일 사용)
 * - NNNNNNN: 일일 고유번호 (7자리, 최대 1천만 마리/일)
 */

import { format } from 'date-fns';

// 종별 코드 매핑
export const SPECIES_CODES: Record<string, string> = {
  DOG: 'D',
  CAT: 'C',
  BIRD: 'B',
  RABBIT: 'R',
  HAMSTER: 'H',
  FISH: 'F',
  REPTILE: 'P',
  OTHER: 'X',
} as const;

export const CODE_TO_SPECIES: Record<string, string> = {
  D: 'DOG',
  C: 'CAT',
  B: 'BIRD',
  R: 'RABBIT',
  H: 'HAMSTER',
  F: 'FISH',
  P: 'REPTILE',
  X: 'OTHER',
} as const;

export interface AnimalCodeParts {
  speciesCode: string;
  species: string;
  birthDate: string;
  sequence: number;
}

/**
 * 동물 고유코드 생성
 */
export function generateAnimalCode(
  species: string,
  birthDate: Date | null,
  sequence: number
): string {
  const speciesCode = SPECIES_CODES[species] ?? 'X';
  const dateStr = birthDate ? format(birthDate, 'yyyyMMdd') : '00000000';
  const sequenceStr = sequence.toString().padStart(7, '0');

  return `${speciesCode}-${dateStr}-${sequenceStr}`;
}

/**
 * 동물 고유코드 파싱
 */
export function parseAnimalCode(code: string): AnimalCodeParts | null {
  const regex = /^([DCBRHFPX])-(\d{8})-(\d{7})$/;
  const match = code.match(regex);

  if (!match) {
    return null;
  }

  const [, speciesCode, birthDate, sequenceStr] = match;

  return {
    speciesCode: speciesCode!,
    species: CODE_TO_SPECIES[speciesCode!] ?? 'OTHER',
    birthDate: birthDate!,
    sequence: parseInt(sequenceStr!, 10),
  };
}

/**
 * 동물 코드 유효성 검사
 */
export function isValidAnimalCode(code: string): boolean {
  const regex = /^[DCBRHFPX]-\d{8}-\d{7}$/;
  return regex.test(code);
}

/**
 * 생년월일 문자열에서 Date 객체 생성
 * 00000000인 경우 null 반환
 */
export function parseBirthDateFromCode(dateStr: string): Date | null {
  if (dateStr === '00000000') {
    return null;
  }

  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(4, 6), 10) - 1; // 0-indexed
  const day = parseInt(dateStr.substring(6, 8), 10);

  // 유효하지 않은 날짜 처리
  if (month < 0 || month > 11 || day < 1 || day > 31) {
    return null;
  }

  return new Date(year, month, day);
}

/**
 * 마이크로칩 번호 유효성 검사 (15자리 숫자)
 */
export function isValidMicrochipId(microchipId: string): boolean {
  return /^\d{15}$/.test(microchipId);
}

/**
 * 마이크로칩 번호 포맷팅 (3-4-4-4 형식)
 */
export function formatMicrochipId(microchipId: string): string {
  if (!isValidMicrochipId(microchipId)) {
    return microchipId;
  }

  return `${microchipId.slice(0, 3)}-${microchipId.slice(3, 7)}-${microchipId.slice(7, 11)}-${microchipId.slice(11, 15)}`;
}

/**
 * 동물 코드에서 종 이름(한글) 반환
 */
export function getSpeciesName(species: string): string {
  const speciesNames: Record<string, string> = {
    DOG: '개',
    CAT: '고양이',
    BIRD: '조류',
    RABBIT: '토끼',
    HAMSTER: '햄스터',
    FISH: '어류',
    REPTILE: '파충류',
    OTHER: '기타',
  };

  return speciesNames[species] ?? '기타';
}
