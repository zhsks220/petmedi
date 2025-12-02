/**
 * 유효성 검사 유틸리티 함수
 */

/**
 * 이메일 유효성 검사
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 전화번호 유효성 검사 (한국 형식)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/[^0-9]/g, '');
  // 휴대폰: 010, 011, 016, 017, 018, 019로 시작하는 10-11자리
  // 일반전화: 02, 031 등으로 시작하는 9-11자리
  return /^(01[016789]\d{7,8}|0[2-6][1-5]?\d{6,8})$/.test(cleaned);
}

/**
 * 사업자등록번호 유효성 검사
 */
export function isValidBusinessNumber(bn: string): boolean {
  const cleaned = bn.replace(/[^0-9]/g, '');
  if (cleaned.length !== 10) return false;

  // 사업자등록번호 체크섬 검증
  const checkSum = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;

  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]!, 10) * checkSum[i]!;
  }

  sum += Math.floor((parseInt(cleaned[8]!, 10) * 5) / 10);
  const remainder = (10 - (sum % 10)) % 10;

  return remainder === parseInt(cleaned[9]!, 10);
}

/**
 * 비밀번호 강도 검사
 */
export function checkPasswordStrength(password: string): {
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('8자 이상이어야 합니다');
  }

  if (password.length >= 12) {
    score += 1;
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('소문자를 포함해야 합니다');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('대문자를 포함해야 합니다');
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('숫자를 포함해야 합니다');
  }

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1;
  } else {
    feedback.push('특수문자를 포함해야 합니다');
  }

  return { score, feedback };
}

/**
 * 우편번호 유효성 검사 (5자리)
 */
export function isValidZipCode(zipCode: string): boolean {
  return /^\d{5}$/.test(zipCode);
}

/**
 * URL 유효성 검사
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 빈 문자열 또는 null/undefined 체크
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * 한글 이름 유효성 검사
 */
export function isValidKoreanName(name: string): boolean {
  return /^[가-힣]{2,10}$/.test(name);
}

/**
 * 영문 이름 유효성 검사
 */
export function isValidEnglishName(name: string): boolean {
  return /^[a-zA-Z\s]{2,50}$/.test(name);
}
