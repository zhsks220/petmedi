// =====================================================
// API 응답 타입
// =====================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: Pagination;
  };
}

export interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// =====================================================
// 에러 코드
// =====================================================

export const ErrorCode = {
  // Auth errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Business logic errors
  ANIMAL_NOT_FOUND: 'ANIMAL_NOT_FOUND',
  HOSPITAL_NOT_FOUND: 'HOSPITAL_NOT_FOUND',
  RECORD_NOT_FOUND: 'RECORD_NOT_FOUND',
  CONSENT_NOT_GRANTED: 'CONSENT_NOT_GRANTED',
  CONSENT_EXPIRED: 'CONSENT_EXPIRED',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// =====================================================
// Query 타입
// =====================================================

export interface SearchQuery extends PaginationParams {
  q?: string;
  filters?: Record<string, unknown>;
}

export interface DateRangeQuery {
  startDate?: Date | string;
  endDate?: Date | string;
}

// =====================================================
// API Endpoints 타입
// =====================================================

export interface AnimalSearchParams extends SearchQuery {
  code?: string;
  microchipId?: string;
  species?: string;
  name?: string;
}

export interface MedicalRecordSearchParams extends SearchQuery, DateRangeQuery {
  animalId?: string;
  hospitalId?: string;
  visitType?: string;
}

export interface HospitalSearchParams extends SearchQuery {
  name?: string;
  address?: string;
  isNetworkMember?: boolean;
}
