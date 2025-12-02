import { z } from 'zod';

// =====================================================
// 열거형
// =====================================================

export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  HOSPITAL_ADMIN: 'HOSPITAL_ADMIN',
  VET: 'VET',
  STAFF: 'STAFF',
  GUARDIAN: 'GUARDIAN',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// =====================================================
// Zod 스키마
// =====================================================

export const loginSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
});

export const registerSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다'),
  password: z
    .string()
    .min(8, '비밀번호는 8자 이상이어야 합니다')
    .regex(
      /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      '비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다'
    ),
  confirmPassword: z.string(),
  name: z.string().min(2, '이름은 2자 이상이어야 합니다').max(50),
  phone: z
    .string()
    .regex(/^01[0-9]-?\d{3,4}-?\d{4}$/, '올바른 전화번호 형식이 아닙니다')
    .optional(),
  role: z.nativeEnum(UserRole as unknown as { [k: string]: string }).default('GUARDIAN'),
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  phone: z
    .string()
    .regex(/^01[0-9]-?\d{3,4}-?\d{4}$/)
    .optional()
    .nullable(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z
    .string()
    .min(8)
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: '새 비밀번호가 일치하지 않습니다',
  path: ['confirmNewPassword'],
});

// =====================================================
// 타입
// =====================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  emailVerified: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  hospitalId?: string;
  hospitalName?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: UserSession;
  tokens: AuthTokens;
}
