import { z } from 'zod';

// =====================================================
// 열거형
// =====================================================

export const Species = {
  DOG: 'DOG',
  CAT: 'CAT',
  BIRD: 'BIRD',
  RABBIT: 'RABBIT',
  HAMSTER: 'HAMSTER',
  FISH: 'FISH',
  REPTILE: 'REPTILE',
  OTHER: 'OTHER',
} as const;

export type Species = (typeof Species)[keyof typeof Species];

export const SpeciesCode = {
  DOG: 'D',
  CAT: 'C',
  BIRD: 'B',
  RABBIT: 'R',
  HAMSTER: 'H',
  FISH: 'F',
  REPTILE: 'P', // P for 파충류
  OTHER: 'X',
} as const;

export type SpeciesCode = (typeof SpeciesCode)[keyof typeof SpeciesCode];

export const Gender = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  UNKNOWN: 'UNKNOWN',
} as const;

export type Gender = (typeof Gender)[keyof typeof Gender];

// =====================================================
// Zod 스키마
// =====================================================

export const animalCodeSchema = z
  .string()
  .regex(
    /^[DCBRHFPX]-\d{8}-\d{7}$/,
    '동물 코드 형식이 올바르지 않습니다 (예: D-20200315-0000001)'
  );

export const microchipIdSchema = z
  .string()
  .regex(/^\d{15}$/, '마이크로칩 번호는 15자리 숫자여야 합니다')
  .optional()
  .nullable();

export const createAnimalSchema = z.object({
  species: z.nativeEnum(Species as unknown as { [k: string]: string }),
  name: z.string().min(1, '이름을 입력해주세요').max(50),
  breed: z.string().max(100).optional(),
  birthDate: z.coerce.date().optional(),
  birthDateType: z.enum(['EXACT', 'ESTIMATED', 'UNKNOWN']).default('UNKNOWN'),
  gender: z.nativeEnum(Gender as unknown as { [k: string]: string }).default('UNKNOWN'),
  isNeutered: z.boolean().default(false),
  weight: z.number().positive().optional(),
  color: z.string().max(50).optional(),
  microchipId: microchipIdSchema,
  notes: z.string().max(1000).optional(),
});

export const updateAnimalSchema = createAnimalSchema.partial();

export const searchAnimalSchema = z.object({
  code: animalCodeSchema.optional(),
  microchipId: microchipIdSchema,
  name: z.string().optional(),
  species: z.nativeEnum(Species as unknown as { [k: string]: string }).optional(),
});

// =====================================================
// 타입
// =====================================================

export type CreateAnimalInput = z.infer<typeof createAnimalSchema>;
export type UpdateAnimalInput = z.infer<typeof updateAnimalSchema>;
export type SearchAnimalInput = z.infer<typeof searchAnimalSchema>;

export interface Animal {
  id: string;
  code: string;
  microchipId: string | null;
  species: Species;
  name: string;
  breed: string | null;
  birthDate: Date | null;
  birthDateType: string | null;
  gender: Gender;
  isNeutered: boolean;
  weight: number | null;
  color: string | null;
  photoUrl: string | null;
  notes: string | null;
  isDeceased: boolean;
  deceasedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnimalWithGuardians extends Animal {
  guardians: {
    id: string;
    name: string;
    phone: string | null;
    isPrimary: boolean;
    relation: string | null;
  }[];
}

export interface AnimalSummary {
  id: string;
  code: string;
  name: string;
  species: Species;
  breed: string | null;
  photoUrl: string | null;
}
