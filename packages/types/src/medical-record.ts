import { z } from 'zod';

// =====================================================
// 열거형
// =====================================================

export const VisitType = {
  INITIAL: 'INITIAL',
  FOLLOW_UP: 'FOLLOW_UP',
  EMERGENCY: 'EMERGENCY',
  VACCINATION: 'VACCINATION',
  SURGERY: 'SURGERY',
  CHECKUP: 'CHECKUP',
  GROOMING: 'GROOMING',
  OTHER: 'OTHER',
} as const;

export type VisitType = (typeof VisitType)[keyof typeof VisitType];

export const VisitTypeLabel: Record<VisitType, string> = {
  INITIAL: '초진',
  FOLLOW_UP: '재진',
  EMERGENCY: '응급',
  VACCINATION: '예방접종',
  SURGERY: '수술',
  CHECKUP: '건강검진',
  GROOMING: '미용',
  OTHER: '기타',
};

export const ConsentType = {
  ALL: 'ALL',
  SELECTIVE: 'SELECTIVE',
} as const;

export type ConsentType = (typeof ConsentType)[keyof typeof ConsentType];

// =====================================================
// Zod 스키마
// =====================================================

export const createMedicalRecordSchema = z.object({
  animalId: z.string().cuid(),
  visitDate: z.coerce.date(),
  visitType: z.nativeEnum(VisitType as unknown as { [k: string]: string }),
  chiefComplaint: z.string().max(500).optional(),
  subjective: z.string().max(5000).optional(),
  objective: z.string().max(5000).optional(),
  assessment: z.string().max(5000).optional(),
  plan: z.string().max(5000).optional(),
  diagnosis: z.string().max(500).optional(),
  weight: z.number().positive().optional(),
  temperature: z.number().min(35).max(45).optional(),
  heartRate: z.number().int().min(20).max(300).optional(),
  respiratoryRate: z.number().int().min(5).max(100).optional(),
});

export const updateMedicalRecordSchema = createMedicalRecordSchema.partial().omit({
  animalId: true,
});

export const createPrescriptionSchema = z.object({
  medicineName: z.string().min(1).max(200),
  dosage: z.string().max(100),
  frequency: z.string().max(100),
  duration: z.string().max(100),
  instructions: z.string().max(500).optional(),
  quantity: z.number().int().positive().optional(),
});

export const createLabResultSchema = z.object({
  testName: z.string().min(1).max(200),
  testType: z.string().max(50).optional(),
  result: z.string().max(500),
  unit: z.string().max(50).optional(),
  referenceRange: z.string().max(100).optional(),
  isAbnormal: z.boolean().default(false),
  notes: z.string().max(500).optional(),
  testedAt: z.coerce.date(),
});

export const createVaccinationSchema = z.object({
  animalId: z.string().cuid(),
  vaccineName: z.string().min(1).max(200),
  vaccineType: z.string().max(100).optional(),
  manufacturer: z.string().max(100).optional(),
  lotNumber: z.string().max(50).optional(),
  administeredAt: z.coerce.date(),
  nextDueDate: z.coerce.date().optional(),
  notes: z.string().max(500).optional(),
});

export const shareConsentSchema = z.object({
  animalId: z.string().cuid(),
  consentType: z.nativeEnum(ConsentType as unknown as { [k: string]: string }),
  expiresAt: z.coerce.date().optional(),
});

// =====================================================
// 타입
// =====================================================

export type CreateMedicalRecordInput = z.infer<typeof createMedicalRecordSchema>;
export type UpdateMedicalRecordInput = z.infer<typeof updateMedicalRecordSchema>;
export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
export type CreateLabResultInput = z.infer<typeof createLabResultSchema>;
export type CreateVaccinationInput = z.infer<typeof createVaccinationSchema>;
export type ShareConsentInput = z.infer<typeof shareConsentSchema>;

export interface MedicalRecord {
  id: string;
  animalId: string;
  hospitalId: string;
  vetId: string;
  visitDate: Date;
  visitType: VisitType;
  chiefComplaint: string | null;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  diagnosis: string | null;
  weight: number | null;
  temperature: number | null;
  heartRate: number | null;
  respiratoryRate: number | null;
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MedicalRecordWithDetails extends MedicalRecord {
  animal: {
    id: string;
    code: string;
    name: string;
    species: string;
  };
  hospital: {
    id: string;
    name: string;
  };
  vet: {
    id: string;
    name: string;
  };
  prescriptions: Prescription[];
  labResults: LabResult[];
  attachments: RecordAttachment[];
}

export interface Prescription {
  id: string;
  medicalRecordId: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string | null;
  quantity: number | null;
  createdAt: Date;
}

export interface LabResult {
  id: string;
  medicalRecordId: string;
  testName: string;
  testType: string | null;
  result: string;
  unit: string | null;
  referenceRange: string | null;
  isAbnormal: boolean;
  notes: string | null;
  testedAt: Date;
  createdAt: Date;
}

export interface RecordAttachment {
  id: string;
  medicalRecordId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  description: string | null;
  createdAt: Date;
}

export interface Vaccination {
  id: string;
  animalId: string;
  vaccineName: string;
  vaccineType: string | null;
  manufacturer: string | null;
  lotNumber: string | null;
  administeredAt: Date;
  nextDueDate: Date | null;
  administeredBy: string | null;
  hospitalName: string | null;
  notes: string | null;
  createdAt: Date;
}

export interface ShareConsent {
  id: string;
  animalId: string;
  guardianId: string;
  consentType: ConsentType;
  isActive: boolean;
  grantedAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
}

// =====================================================
// 진료 기록 타임라인
// =====================================================

export interface MedicalTimeline {
  records: MedicalRecordSummary[];
  vaccinations: VaccinationSummary[];
}

export interface MedicalRecordSummary {
  id: string;
  visitDate: Date;
  visitType: VisitType;
  diagnosis: string | null;
  hospitalName: string;
  vetName: string;
  isShared: boolean;
}

export interface VaccinationSummary {
  id: string;
  vaccineName: string;
  administeredAt: Date;
  nextDueDate: Date | null;
  hospitalName: string | null;
}
