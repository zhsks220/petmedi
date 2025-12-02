/**
 * 날짜 관련 유틸리티 함수
 */

import {
  format,
  formatDistanceToNow,
  differenceInYears,
  differenceInMonths,
  differenceInDays,
  isValid,
  parseISO,
} from 'date-fns';
import { ko } from 'date-fns/locale';

/**
 * 날짜를 한국어 형식으로 포맷
 */
export function formatDate(date: Date | string | null, formatStr = 'yyyy.MM.dd'): string {
  if (!date) return '-';

  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return '-';

  return format(dateObj, formatStr, { locale: ko });
}

/**
 * 날짜/시간을 한국어 형식으로 포맷
 */
export function formatDateTime(date: Date | string | null): string {
  return formatDate(date, 'yyyy.MM.dd HH:mm');
}

/**
 * 상대적 시간 표시 (예: "3일 전", "방금 전")
 */
export function formatRelativeTime(date: Date | string | null): string {
  if (!date) return '-';

  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return '-';

  return formatDistanceToNow(dateObj, { addSuffix: true, locale: ko });
}

/**
 * 나이 계산 (년, 개월 또는 일 단위로 반환)
 */
export function calculateAge(birthDate: Date | string | null): string {
  if (!birthDate) return '알 수 없음';

  const dateObj = typeof birthDate === 'string' ? parseISO(birthDate) : birthDate;
  if (!isValid(dateObj)) return '알 수 없음';

  const now = new Date();
  const years = differenceInYears(now, dateObj);
  const months = differenceInMonths(now, dateObj);
  const days = differenceInDays(now, dateObj);

  if (years >= 1) {
    const remainingMonths = months % 12;
    if (remainingMonths > 0) {
      return `${years}년 ${remainingMonths}개월`;
    }
    return `${years}년`;
  }

  if (months >= 1) {
    return `${months}개월`;
  }

  return `${days}일`;
}

/**
 * 다음 예방접종 D-Day 계산
 */
export function calculateDDay(targetDate: Date | string | null): string {
  if (!targetDate) return '-';

  const dateObj = typeof targetDate === 'string' ? parseISO(targetDate) : targetDate;
  if (!isValid(dateObj)) return '-';

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const target = new Date(dateObj);
  target.setHours(0, 0, 0, 0);

  const diff = differenceInDays(target, now);

  if (diff === 0) return 'D-Day';
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

/**
 * 오늘 날짜를 YYYYMMDD 형식으로 반환
 */
export function getTodayString(): string {
  return format(new Date(), 'yyyyMMdd');
}

/**
 * 생년월일 추정 (나이로부터)
 */
export function estimateBirthDate(ageYears: number, ageMonths = 0): Date {
  const now = new Date();
  return new Date(
    now.getFullYear() - ageYears,
    now.getMonth() - ageMonths,
    1
  );
}
