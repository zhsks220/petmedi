import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind CSS 클래스 병합 유틸리티
 * clsx와 tailwind-merge를 결합하여 조건부 클래스와 중복 제거를 처리
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
