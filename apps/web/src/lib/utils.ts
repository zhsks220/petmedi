import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  }
  return phone;
}

export function getSpeciesLabel(species: string): string {
  const labels: Record<string, string> = {
    DOG: '강아지',
    CAT: '고양이',
    BIRD: '조류',
    RABBIT: '토끼',
    HAMSTER: '햄스터',
    REPTILE: '파충류',
    OTHER: '기타',
  };
  return labels[species] || species;
}

export function getGenderLabel(gender: string): string {
  const labels: Record<string, string> = {
    MALE: '수컷',
    FEMALE: '암컷',
    UNKNOWN: '모름',
  };
  return labels[gender] || gender;
}

export function getVisitTypeLabel(visitType: string): string {
  const labels: Record<string, string> = {
    FIRST_VISIT: '초진',
    REVISIT: '재진',
    VACCINATION: '예방접종',
    SURGERY: '수술',
    HEALTH_CHECK: '건강검진',
    EMERGENCY: '응급',
    GROOMING: '미용',
    OTHER: '기타',
  };
  return labels[visitType] || visitType;
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    SUPER_ADMIN: '슈퍼관리자',
    HOSPITAL_ADMIN: '병원관리자',
    VETERINARIAN: '수의사',
    TECHNICIAN: '테크니션',
    RECEPTIONIST: '접수원',
    PET_OWNER: '보호자',
  };
  return labels[role] || role;
}

export function calculateAge(birthDate: string | Date): string {
  const birth = new Date(birthDate);
  const today = new Date();

  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();

  if (months < 0) {
    years--;
    months += 12;
  }

  if (years > 0) {
    return `${years}세 ${months}개월`;
  }
  return `${months}개월`;
}
