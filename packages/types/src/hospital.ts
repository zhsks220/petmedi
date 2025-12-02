import { z } from 'zod';

// =====================================================
// 열거형
// =====================================================

export const HospitalStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  INACTIVE: 'INACTIVE',
} as const;

export type HospitalStatus = (typeof HospitalStatus)[keyof typeof HospitalStatus];

// =====================================================
// Zod 스키마
// =====================================================

export const createHospitalSchema = z.object({
  name: z.string().min(2, '병원명은 2자 이상이어야 합니다').max(100),
  businessNumber: z
    .string()
    .regex(/^\d{3}-\d{2}-\d{5}$/, '사업자등록번호 형식이 올바르지 않습니다 (000-00-00000)'),
  licenseNumber: z.string().optional(),
  address: z.string().min(5, '주소를 입력해주세요'),
  addressDetail: z.string().optional(),
  zipCode: z.string().regex(/^\d{5}$/, '우편번호는 5자리 숫자입니다').optional(),
  phone: z
    .string()
    .regex(/^0\d{1,2}-?\d{3,4}-?\d{4}$/, '올바른 전화번호 형식이 아닙니다'),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  description: z.string().max(1000).optional(),
});

export const updateHospitalSchema = createHospitalSchema.partial();

export const operatingHoursSchema = z.object({
  monday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
  tuesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
  wednesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
  thursday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
  friday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
  saturday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
  sunday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
  lunchBreak: z.object({ start: z.string(), end: z.string() }).optional(),
});

// =====================================================
// 타입
// =====================================================

export type CreateHospitalInput = z.infer<typeof createHospitalSchema>;
export type UpdateHospitalInput = z.infer<typeof updateHospitalSchema>;
export type OperatingHours = z.infer<typeof operatingHoursSchema>;

export interface Hospital {
  id: string;
  name: string;
  businessNumber: string;
  licenseNumber: string | null;
  address: string;
  addressDetail: string | null;
  zipCode: string | null;
  phone: string;
  email: string | null;
  website: string | null;
  description: string | null;
  logoUrl: string | null;
  status: HospitalStatus;
  operatingHours: OperatingHours | null;
  holidayInfo: string | null;
  latitude: number | null;
  longitude: number | null;
  isNetworkMember: boolean;
  networkJoinedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface HospitalSummary {
  id: string;
  name: string;
  address: string;
  phone: string;
  logoUrl: string | null;
  isNetworkMember: boolean;
}

export interface HospitalStaff {
  id: string;
  userId: string;
  hospitalId: string;
  position: string | null;
  licenseNo: string | null;
  isActive: boolean;
  joinedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface Department {
  id: string;
  hospitalId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
}
